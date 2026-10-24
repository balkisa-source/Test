import * as AuthSession from 'expo-auth-session';
import { discovery } from 'expo-auth-session/providers/google';
import * as SecureStore from 'expo-secure-store';
import { addDays, startOfDay } from './dates';

export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
export const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/calendar.events'];
const API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const KEY = 'gcal.tokens';

let tokens = null;

export async function loadTokens() {
  const raw = await SecureStore.getItemAsync(KEY);
  tokens = raw ? JSON.parse(raw) : null;
  return !!tokens;
}

export async function saveTokens(auth) {
  tokens = {
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken || tokens?.refreshToken,
    expiresAt: Date.now() + (auth.expiresIn || 3600) * 1000,
  };
  await SecureStore.setItemAsync(KEY, JSON.stringify(tokens));
}

export async function disconnect() {
  tokens = null;
  await SecureStore.deleteItemAsync(KEY);
}

async function accessToken() {
  if (!tokens) throw new Error('Google Calendar is not connected');
  if (Date.now() < tokens.expiresAt - 60000) return tokens.accessToken;
  if (!tokens.refreshToken) throw new Error('Please reconnect Google Calendar');
  const r = await AuthSession.refreshAsync({ clientId: GOOGLE_IOS_CLIENT_ID, refreshToken: tokens.refreshToken }, discovery);
  await saveTokens(r);
  return tokens.accessToken;
}

async function api(path, init = {}) {
  const res = await fetch(API + path, {
    ...init,
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json', ...init.headers },
  });
  if (res.status === 401) {
    tokens.expiresAt = 0;
    throw new Error('Google sign-in expired. Tap Refresh to try again.');
  }
  if (!res.ok) throw new Error(`Google Calendar error ${res.status}`);
  return res.status === 204 ? null : res.json();
}

export async function eventsForDay(date) {
  const from = startOfDay(date);
  const q = new URLSearchParams({
    timeMin: from.toISOString(),
    timeMax: addDays(from, 1).toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  });
  const { items = [] } = await api('?' + q);
  return items
    .filter((e) => e.status !== 'cancelled')
    .map((e) => ({
      id: e.id,
      title: e.summary || '(No title)',
      allDay: !e.start?.dateTime,
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      transparent: e.transparency === 'transparent',
      wm: e.extendedProperties?.private?.wmDay || null,
    }));
}

const DAY_START_H = 8;
const DAY_END_H = 21;

// Puts each unfinished priority on the calendar in the first free gap today,
// in priority order. Priorities already on the calendar keep their slot (so
// you can move them in Google Calendar), and blocks for priorities you've
// removed are deleted.
export async function blockPriorities(dayK, plan) {
  const date = new Date(dayK + 'T00:00:00');
  const events = await eventsForDay(date);
  const mine = events.filter((e) => e.wm === dayK);
  const wanted = plan.filter((p) => p && p.t && !p.done);
  const titleOf = (p) => `🎯 ${p.t}`;

  for (const e of mine) {
    if (!plan.some((p) => p && titleOf(p) === e.title)) await api('/' + e.id, { method: 'DELETE' });
  }

  const busy = events
    .filter((e) => !e.allDay && !e.transparent && (e.wm !== dayK || plan.some((p) => p && titleOf(p) === e.title)))
    .map((e) => [+new Date(e.start), +new Date(e.end)])
    .sort((a, b) => a[0] - b[0]);

  const now = new Date();
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), DAY_START_H);
  const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), DAY_END_H);
  // Start from the next quarter hour if the day has already begun.
  const q = 15 * 60000;
  let cursor = Math.max(+dayStart, Math.ceil(+now / q) * q);

  const placed = [];
  const skipped = [];
  for (const p of wanted) {
    if (mine.some((e) => e.title === titleOf(p))) continue;
    const len = (+p.mins || 60) * 60000;
    let start = cursor;
    for (const [bs, be] of busy) {
      if (be <= start) continue;
      if (bs >= start + len) break;
      start = Math.max(start, be);
    }
    if (start + len > +dayEnd) {
      skipped.push(p.t);
      continue;
    }
    await api('', {
      method: 'POST',
      body: JSON.stringify({
        summary: titleOf(p),
        description: 'Deep-work block from your 2027 War Map.',
        start: { dateTime: new Date(start).toISOString() },
        end: { dateTime: new Date(start + len).toISOString() },
        colorId: '2',
        extendedProperties: { private: { wmDay: dayK } },
      }),
    });
    busy.push([start, start + len]);
    busy.sort((a, b) => a[0] - b[0]);
    placed.push(p.t);
    cursor = start + len;
  }
  return { placed, skipped, already: wanted.length - placed.length - skipped.length };
}
