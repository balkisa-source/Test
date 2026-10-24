import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import * as Google from 'expo-auth-session/providers/google';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';

import WAR_MAP_HTML from './src/warMapHtml';
import { buildBridge } from './src/bridge';
import { aiAvailable, aiJson, aiText } from './src/claude';
import { todayKey } from './src/dates';
import * as G from './src/googleCalendar';
import { connectHealth, healthSupported, syncHealth } from './src/health';
import * as Store from './src/store';

WebBrowser.maybeCompleteAuthSession();

const NATIVE_DOC = 'app/native';

export default function App() {
  const web = useRef(null);
  const [ready, setReady] = useState(false);
  const [reloads, setReloads] = useState(0);
  const [health, setHealth] = useState({ supported: healthSupported(), connected: false, lastSync: null });
  const [gcal, setGcal] = useState({ configured: !!G.GOOGLE_IOS_CLIENT_ID, connected: false, events: [] });

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: G.GOOGLE_IOS_CLIENT_ID || 'unset',
    scopes: G.GOOGLE_SCOPES,
    extraParams: { access_type: 'offline', prompt: 'consent' },
  });

  const js = useCallback((code) => web.current?.injectJavaScript(code + ';true;'), []);
  const applyDoc = useCallback(
    (path, data) => {
      Store.setDoc(path, data);
      js(`window.__wmApply&&window.__wmApply(${JSON.stringify(path)},${JSON.stringify(data ?? null)})`);
    },
    [js],
  );

  // ---- boot ----
  useEffect(() => {
    (async () => {
      await Store.loadStore();
      await Store.writePage(WAR_MAP_HTML);
      const n = Store.getDoc(NATIVE_DOC) || {};
      setHealth((h) => ({ ...h, connected: !!n.healthConnected && h.supported, lastSync: n.healthLastSync || null }));
      if (await G.loadTokens()) setGcal((g) => ({ ...g, connected: true }));
      setReady(true);
    })();
  }, []);

  // ---- Apple Health ----
  const runHealthSync = useCallback(
    async (days = 7) => {
      setHealth((h) => ({ ...h, syncing: true, error: null }));
      try {
        const changed = await syncHealth(Store.getDoc, days);
        Object.entries(changed).forEach(([p, d]) => applyDoc(p, d));
        const lastSync = Date.now();
        Store.setDoc(NATIVE_DOC, { ...(Store.getDoc(NATIVE_DOC) || {}), healthConnected: true, healthLastSync: lastSync });
        setHealth((h) => ({ ...h, connected: true, syncing: false, lastSync }));
      } catch (e) {
        setHealth((h) => ({ ...h, syncing: false, error: 'Couldn’t read Apple Health: ' + e.message }));
      }
    },
    [applyDoc],
  );

  // ---- Google Calendar ----
  const refreshEvents = useCallback(async () => {
    try {
      const events = await G.eventsForDay(new Date());
      setGcal((g) => ({ ...g, connected: true, events, error: null }));
    } catch (e) {
      setGcal((g) => ({ ...g, error: e.message }));
    }
  }, []);

  useEffect(() => {
    if (response?.type === 'success' && response.authentication) {
      G.saveTokens(response.authentication).then(refreshEvents);
    } else if (response?.type === 'error') {
      setGcal((g) => ({ ...g, error: 'Google sign-in didn’t finish. Try again.' }));
    }
  }, [response, refreshEvents]);

  const blockPriorities = useCallback(async () => {
    const k = todayKey();
    const plan = (Store.getDoc('days/' + k)?.plan || []).slice(0, 3);
    if (!plan.length) return setGcal((g) => ({ ...g, note: 'Pick today’s priorities first, then block time for them.' }));
    setGcal((g) => ({ ...g, busy: true, error: null, note: null }));
    try {
      const r = await G.blockPriorities(k, plan);
      const bits = [];
      if (r.placed.length) bits.push(`Blocked ${r.placed.length} priorit${r.placed.length === 1 ? 'y' : 'ies'}`);
      if (r.already) bits.push(`${r.already} already on your calendar`);
      if (r.skipped.length) bits.push(`no room before 9pm for: ${r.skipped.join(', ')}`);
      const events = await G.eventsForDay(new Date());
      setGcal((g) => ({ ...g, busy: false, events, note: bits.join(' · ') || 'Nothing left to block.' }));
    } catch (e) {
      setGcal((g) => ({ ...g, busy: false, error: e.message }));
    }
  }, []);

  // Sync when the app opens and each time you come back to it.
  useEffect(() => {
    if (!ready) return;
    const tick = () => {
      if (health.connected) runHealthSync();
      if (gcal.connected) refreshEvents();
    };
    tick();
    const sub = AppState.addEventListener('change', (s) => (s === 'active' ? tick() : Store.flush()));
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, health.connected, gcal.connected]);

  // Keep the page's Connections / calendar cards up to date.
  const nativeState = useMemo(() => ({ ai: aiAvailable, health, gcal }), [health, gcal]);
  useEffect(() => {
    js(`window.__wmSetNative&&window.__wmSetNative(${JSON.stringify(nativeState)})`);
  }, [nativeState, js]);

  // ---- messages from the page ----
  const reply = (id, ok, val) => js(`window.__wmReply(${id},${ok},${JSON.stringify(val ?? null)})`);
  const onMessage = async (e) => {
    let m;
    try {
      m = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    try {
      switch (m.type) {
        case 'db.set':
          return Store.setDoc(m.path, m.data);
        case 'db.delete':
          return Store.setDoc(m.path, null);
        case 'asset.upload':
          return reply(m.id, true, { id: await Store.saveBlob(m.b64, m.mime) });
        case 'download': {
          const uri = await Store.writeExport(m.filename, m);
          await Sharing.shareAsync(uri);
          return reply(m.id, true, null);
        }
        case 'ai.text':
          return reply(m.id, true, await aiText(m.prompt));
        case 'ai.json':
          return reply(m.id, true, await aiJson(m.prompt, m.images));
        case 'ui':
          return onUi(m.action);
      }
    } catch (err) {
      if (m.id) reply(m.id, false, { message: err.message, code: err.status === 429 ? 'rate_limited' : undefined });
    }
  };

  const onUi = async (action) => {
    if (action === 'health-connect') {
      try {
        await connectHealth();
        await runHealthSync(30);
      } catch (e) {
        setHealth((h) => ({ ...h, error: e.message }));
      }
    } else if (action === 'health-sync') runHealthSync(14);
    else if (action === 'gcal-connect') request && promptAsync();
    else if (action === 'gcal-disconnect') {
      await G.disconnect();
      setGcal((g) => ({ ...g, connected: false, events: [], note: null, error: null }));
    } else if (action === 'gcal-refresh') refreshEvents();
    else if (action === 'gcal-push') blockPriorities();
  };

  // The bridge carries a snapshot of saved data; rebuild it if the page reloads.
  const injected = useMemo(
    () =>
      ready
        ? buildBridge({ docs: Store.allDocs(), blobBase: Store.BLOB_DIR, ai: aiAvailable, native: nativeState })
        : '',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, reloads],
  );

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <WebView
        key={reloads}
        ref={web}
        source={{ uri: Store.PAGE }}
        originWhitelist={['*']}
        allowFileAccess
        allowingReadAccessToURL={FileSystem.documentDirectory}
        injectedJavaScriptBeforeContentLoaded={injected}
        onMessage={onMessage}
        onLoadEnd={() => js(`window.__wmSetNative&&window.__wmSetNative(${JSON.stringify(nativeState)})`)}
        onContentProcessDidTerminate={() => {
          Store.flush();
          setReloads((n) => n + 1);
        }}
        onShouldStartLoadWithRequest={(r) => {
          if (r.url.startsWith('file:') || r.url.startsWith('about:')) return true;
          Linking.openURL(r.url);
          return false;
        }}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        bounces={false}
        allowsBackForwardNavigationGestures={false}
        keyboardDisplayRequiresUserAction={false}
        webviewDebuggingEnabled={__DEV__}
        style={styles.root}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F6' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2F2F6' },
});
