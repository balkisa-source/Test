import { Platform } from 'react-native';
import { addDays, dayKey, startOfDay } from './dates';

// HealthKit is a native module: it exists in a development or App Store build,
// not in Expo Go, so load it defensively.
let HK = null;
if (Platform.OS === 'ios') {
  try {
    HK = require('@kingstinct/react-native-healthkit');
  } catch (e) {
    HK = null;
  }
}

const STEPS = 'HKQuantityTypeIdentifierStepCount';
const WEIGHT = 'HKQuantityTypeIdentifierBodyMass';
const SLEEP = 'HKCategoryTypeIdentifierSleepAnalysis';
const NUTRIENTS = {
  kcal: ['HKQuantityTypeIdentifierDietaryEnergyConsumed', 'kcal'],
  p: ['HKQuantityTypeIdentifierDietaryProtein', 'g'],
  c: ['HKQuantityTypeIdentifierDietaryCarbohydrates', 'g'],
  f: ['HKQuantityTypeIdentifierDietaryFatTotal', 'g'],
};
// asleepUnspecified, asleepCore, asleepDeep, asleepREM
const ASLEEP = new Set([1, 3, 4, 5]);

export function healthSupported() {
  try {
    return !!HK && HK.isHealthDataAvailable();
  } catch (e) {
    return false;
  }
}

export async function connectHealth() {
  return HK.requestAuthorization({
    toRead: [STEPS, WEIGHT, SLEEP, ...Object.values(NUTRIENTS).map(([id]) => id)],
  });
}

async function dailySums(id, unit, from, to) {
  const rows = await HK.queryStatisticsCollectionForQuantity(id, ['cumulativeSum'], from, { day: 1 }, {
    unit,
    filter: { date: { startDate: from, endDate: to } },
  });
  const out = {};
  rows.forEach((r) => {
    if (r.startDate && r.sumQuantity) out[dayKey(new Date(r.startDate))] = r.sumQuantity.quantity;
  });
  return out;
}

async function dailyWeights(from, to) {
  const samples = await HK.queryQuantitySamples(WEIGHT, {
    unit: 'kg',
    limit: 0,
    ascending: true,
    filter: { date: { startDate: from, endDate: to } },
  });
  const out = {};
  samples.forEach((s) => (out[dayKey(new Date(s.startDate))] = Math.round(s.quantity * 10) / 10));
  return out;
}

// Hours asleep for the night ending on each day. Watch and phone both record
// sleep, so overlapping intervals are merged before summing.
async function nightlySleep(from, to) {
  const samples = await HK.queryCategorySamples(SLEEP, {
    limit: 0,
    ascending: true,
    filter: { date: { startDate: addDays(from, -1), endDate: to } },
  });
  const byDay = {};
  samples
    .filter((s) => ASLEEP.has(s.value))
    .forEach((s) => {
      const end = new Date(s.endDate);
      // A nap that ends in the evening counts toward that day; the night counts toward the morning you wake.
      const k = dayKey(end);
      (byDay[k] = byDay[k] || []).push([+new Date(s.startDate), +end]);
    });
  const out = {};
  Object.entries(byDay).forEach(([k, spans]) => {
    spans.sort((a, b) => a[0] - b[0]);
    let total = 0;
    let [cs, ce] = spans[0];
    spans.slice(1).forEach(([s, e]) => {
      if (s <= ce) ce = Math.max(ce, e);
      else {
        total += ce - cs;
        [cs, ce] = [s, e];
      }
    });
    total += ce - cs;
    out[k] = Math.round((total / 3600000) * 10) / 10;
  });
  return out;
}

// Reads the last `days` days from Apple Health and returns the War Map day
// documents that changed. Steps always follow Health. Weight, sleep and
// nutrition only fill days you haven't entered by hand (or that Health filled before).
export async function syncHealth(getDoc, days = 7) {
  const to = new Date();
  const from = startOfDay(addDays(to, -(days - 1)));
  const [steps, weights, sleep, ...nut] = await Promise.all([
    dailySums(STEPS, 'count', from, to),
    dailyWeights(from, to),
    nightlySleep(from, to),
    ...Object.values(NUTRIENTS).map(([id, unit]) => dailySums(id, unit, from, to)),
  ]);
  const nutBy = Object.fromEntries(Object.keys(NUTRIENTS).map((k, i) => [k, nut[i]]));

  const changed = {};
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const k = dayKey(d);
    const path = 'days/' + k;
    const cur = getDoc(path) || { date: k, month: k.slice(0, 7), log: {} };
    const next = { ...cur, date: k, month: k.slice(0, 7) };

    if (steps[k] != null) next.steps = Math.round(steps[k]);

    if (weights[k] != null && (!cur.weight || cur.weightSrc === 'health')) {
      next.weight = weights[k];
      next.weightSrc = 'health';
    }

    const feel = cur.feel || {};
    if (sleep[k] != null && (feel.sleep == null || feel.sleep === '' || feel.sleepSrc === 'health')) {
      next.feel = { ...feel, sleep: sleep[k], sleepSrc: 'health' };
    }

    const kcal = nutBy.kcal[k];
    if (kcal > 0 && (!cur.nutrition || cur.nutrition.src === 'health')) {
      const g = (x) => (x == null ? null : Math.round(x));
      next.nutrition = { kcal: Math.round(kcal), p: g(nutBy.p[k]), c: g(nutBy.c[k]), f: g(nutBy.f[k]), src: 'health' };
    }

    if (JSON.stringify(next) !== JSON.stringify(cur)) changed[path] = next;
  }
  return changed;
}
