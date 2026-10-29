import {
  clock as hhmm,
  dayLong,
  emit,
  getLocale,
  LOCALE_NAMES,
  LOCALES,
  RESTAURANT,
  setSoldOut,
  sunsetMinute,
  tr,
  type Locale,
  type Order,
  type Stage,
} from '@grill/shared';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useKitchenClock } from './clock';
import { Board } from './components/Board';
import { Cameras } from './components/Cameras';
import { Floor } from './components/Floor';
import { Couriers, Feed, Kpis, Line, MenuManager, Numbers, Prep, Social, Tables } from './components/Panels';
import { eventsOn, eventText, floorView, openCalls, useBridge, useTonight } from './data';
import { chooseLocale } from './i18n/install';
import { useTheme } from './theme';

/** Where the guest app lives on the demo site, next to this panel. */
const APP_URL = '../app/';

const TABS = [
  { id: 'live', label: 'Live' },
  { id: 'bestellingen', label: 'Bestellingen' },
  { id: 'tafels', label: 'Tafels' },
  { id: 'bezorging', label: 'Bezorging' },
  { id: 'menu', label: 'Menu' },
  { id: 'cijfers', label: 'Cijfers & prep' },
  { id: 'social', label: 'Social' },
  { id: 'cameras', label: "Camera's" },
] as const;
type TabId = (typeof TABS)[number]['id'];

const fromHash = (): TabId => (TABS.find((t) => `#${t.id}` === window.location.hash)?.id ?? 'live') as TabId;

type ViewMode = '3d' | '2d';
const VIEW_KEY = 'grill-admin-view';
const storedMode = (): ViewMode => {
  try {
    return localStorage.getItem(VIEW_KEY) === '2d' ? '2d' : '3d';
  } catch {
    return '3d';
  }
};

/** When an event was written, from its id ("call-1793300000000-3"). */
const writtenAt = (id: string) => Number(/-(\d{12,})-\d+$/.exec(id)?.[1] ?? 0);

function Flame() {
  return (
    <svg viewBox="0 0 64 64" className="flame" aria-hidden>
      <path d="M32 4c3 9 14 15 14 29a14 14 0 0 1-28 0c0-8 4-12 7-17 1 5 3 7 6 8-2-8 0-15 1-20z" fill="var(--gp-flame)" />
      <path d="M32 22c2 6 9 10 9 19a9 9 0 0 1-18 0c0-5 3-8 4-11 1 3 2 5 4 5-1-5 0-9 1-13z" fill="var(--gp-ember)" />
      <path d="M32 36c1 4 5 6 5 10a5 5 0 0 1-10 0c0-3 1-4 2-6 1 2 1 2 2 3 0-3 0-5 1-7z" fill="var(--gp-gold)" />
    </svg>
  );
}

export function App() {
  const clock = useKitchenClock();
  const now = clock.now;
  const t = now.getTime();
  const theme = useTheme(now);
  const { state: bridge, refresh } = useBridge();
  const orders = useTonight(now, bridge);
  const events = useMemo(() => eventsOn(bridge, now), [bridge, now.toDateString()]);
  const [tab, setTab] = useState<TabId>(fromHash);
  const [mode, setMode] = useState<ViewMode>(storedMode);
  const [answered, setAnswered] = useState<Set<string>>(() => new Set());
  const [toast, setToast] = useState<{ title: string; text?: string; app?: boolean } | null>(null);
  const [focusTable, setFocusTable] = useState<number | null>(null);

  useEffect(() => {
    const onHash = () => setTab(fromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const go = (id: TabId) => {
    setTab(id);
    history.replaceState(null, '', `#${id}`);
  };
  const chooseMode = (next: ViewMode) => {
    setMode(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // The choice lasts for this page.
    }
  };

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3800);
    return () => window.clearTimeout(id);
  }, [toast]);

  // Something fresh from the app: say so, so the link between the two is seen.
  const last = bridge.events[bridge.events.length - 1];
  const seen = useRef<string | null>(last?.id ?? null);
  useEffect(() => {
    if (!last || last.id === seen.current) return;
    seen.current = last.id;
    // Answers and moved orders are the panel's own doing; only what comes from the app gets a toast.
    if (last.kind === 'answer' || last.kind === 'stage' || Date.now() - writtenAt(last.id) > 6000) return;
    const text = eventText(last);
    if (text) setToast({ title: text.title, text: text.text, app: true });
  }, [last?.id]);

  const calls = useMemo(() => openCalls(orders, events, t, answered), [orders, events, Math.floor(t / 5000), answered]);
  const view = useMemo(() => floorView(orders, events, t, calls), [orders, events, Math.floor(t / 1000), calls]);

  const answer = (callId: string) => {
    const call = calls.find((c) => c.id === callId);
    setAnswered((s) => new Set(s).add(callId));
    if (!call) return;
    const by = call.kind === 'chef' ? 'kerem' : 'sevda';
    if (call.app) {
      emit({ kind: 'answer', call: callId, by, minutes: call.kind === 'chef' ? 2 : 1, at: t });
      refresh();
    }
    setToast({ title: `${by === 'kerem' ? 'Kerem' : 'Sevda'} komt naar tafel ${call.table}`, text: call.app ? 'De gast ziet het meteen in de app' : undefined });
  };
  const moveOrder = (o: Order, stage: Stage) => {
    emit({ kind: 'stage', order: o.id, stage, at: t });
    refresh();
    setToast({ title: stage === 'vuur' ? `${o.number} ligt op het vuur` : `${o.number} is klaar`, text: 'De gast volgt het live in de app' });
  };
  const toggleSoldOut = (id: string, out: boolean) => {
    setSoldOut(id, out);
    refresh();
    setToast({ title: out ? 'Uitverkocht gezet' : 'Weer leverbaar', text: 'De app past het menu meteen aan' });
  };
  const pickTable = (n: number) => {
    setFocusTable(n);
    go('tafels');
  };

  const demoLabel = clock.playing ? 'avond afspelen' : clock.reason === 'closed' ? 'demotijd: de keuken is nu dicht' : clock.reason === 'set' ? 'ingestelde tijd' : null;
  const sunset = sunsetMinute(now);
  const appOrderCount = orders.filter((o) => o.mine).length;

  return (
    <div className="page">
      <div className="embers" aria-hidden />
      <header className="top">
        <div className="brand">
          <Flame />
          <div>
            <span className="name">GRILL-POINT</span>
            <span className="sub">
              Het Vuur · <em>Valkenswaard</em>
            </span>
          </div>
        </div>
        <div className="clock">
          <span className="time">{hhmm(now)}</span>
          <span className="day">
            <span>{dayLong(now)}</span>
            <span className={`status ${clock.demo ? 'demo' : 'live'}`}>
              <i /> {clock.playing ? 'Avond afspelen' : clock.reason === 'closed' ? 'Demotijd' : clock.reason === 'set' ? 'Ingestelde tijd' : 'Live'}
            </span>
          </span>
          {clock.playing ? (
            <span className="progress">
              <i style={{ width: `${clock.progress * 100}%` }} />
            </span>
          ) : null}
        </div>
        <div className="controls">
          <button className={`play${clock.playing ? ' on' : ''}`} onClick={clock.playing ? clock.stop : clock.play}>
            {clock.playing ? 'Terug naar nu' : 'Speel de avond af'}
          </button>
          <div className="seg" role="group" aria-label="Thema">
            {(['auto', 'day', 'night'] as const).map((c) => (
              <button key={c} className={theme.choice === c ? 'on' : ''} onClick={() => theme.choose(c)} title={c === 'auto' ? `${tr('Zonsondergang')} ${String(Math.floor(sunset / 60)).padStart(2, '0')}:${String(Math.round(sunset % 60)).padStart(2, '0')}` : undefined}>
                {c === 'auto' ? 'Auto' : c === 'day' ? 'Dag' : 'Nacht'}
              </button>
            ))}
          </div>
          <select className="lang" value={getLocale()} onChange={(e) => chooseLocale(e.target.value as Locale)} aria-label="Taal" translate="no">
            {LOCALES.map((l) => (
              <option key={l} value={l}>
                {LOCALE_NAMES[l]}
              </option>
            ))}
          </select>
          <a className="open-app" href={APP_URL} target="_blank" rel="noreferrer">
            Open de app
          </a>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((x) => (
          <button key={x.id} className={tab === x.id ? 'on' : ''} onClick={() => go(x.id)}>
            {x.label}
            {x.id === 'tafels' && calls.length ? <span className="badge">{calls.length}</span> : null}
            {x.id === 'bestellingen' && appOrderCount ? <span className="badge app">{appOrderCount}</span> : null}
          </button>
        ))}
        <div className="spacer" />
        {tab === 'live' ? (
          <div className="view-switch" data-mode={mode} role="group" aria-label="Weergave">
            <i className="knob" />
            <button className={mode === '3d' ? 'on' : ''} aria-pressed={mode === '3d'} onClick={() => chooseMode('3d')}>
              3D
            </button>
            <button className={mode === '2d' ? 'on' : ''} aria-pressed={mode === '2d'} onClick={() => chooseMode('2d')}>
              2D
            </button>
          </div>
        ) : null}
      </nav>

      <main>
        {tab === 'live' ? (
          <>
            <Kpis orders={orders} t={t} now={now} load={view.load} tables={view.tables} couriers={view.couriers} />
            <div className="live-grid">
              {mode === '3d' ? <Floor view={view} theme={theme.mode} demoLabel={demoLabel} onAnswer={answer} onTable={pickTable} /> : <Line stations={view.stations} />}
              <Feed now={now} events={events} />
            </div>
            {mode === '3d' ? <Line stations={view.stations} /> : <Tables tables={view.tables} events={events} t={t} onAnswer={answer} focus={null} />}
            <Board orders={orders} t={t} onStage={moveOrder} />
          </>
        ) : null}
        {tab === 'bestellingen' ? <Board orders={orders} t={t} onStage={moveOrder} full /> : null}
        {tab === 'tafels' ? <Tables tables={view.tables} events={events} t={t} onAnswer={answer} focus={focusTable} /> : null}
        {tab === 'bezorging' ? <Couriers couriers={view.couriers} orders={orders} t={t} /> : null}
        {tab === 'menu' ? <MenuManager orders={orders} t={t} soldOut={bridge.soldOut} onToggle={toggleSoldOut} /> : null}
        {tab === 'cijfers' ? (
          <>
            <Numbers orders={orders} now={now} />
            <Prep now={now} />
          </>
        ) : null}
        {tab === 'social' ? <Social orders={orders} events={events} now={now} /> : null}
        {tab === 'cameras' ? <Cameras device={bridge.cameras ?? {}} appUrl={APP_URL} onChange={refresh} /> : null}
      </main>

      <footer className="foot">
        <span>
          {RESTAURANT.name} · {RESTAURANT.street}, {RESTAURANT.city} · elke dag 15:00–00:00
        </span>
        <span>Demo met testgegevens: gasten, bestellingen, team en cijfers zijn verzonnen. Menu, prijzen, adres en openingstijden zijn van Grill-Point.</span>
      </footer>

      {toast ? (
        <div className={`toast${toast.app ? ' app' : ''}`} role="status">
          {toast.app ? <em>Uit de app</em> : null}
          <b>{toast.title}</b>
          {toast.text ? <span>{toast.text}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
