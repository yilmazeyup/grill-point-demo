import {
  AREAS,
  appOrders,
  cookTime,
  dateKey,
  emit,
  eveningOrders,
  kitchenNow,
  levelOf,
  loadCameras,
  mergeCameras,
  type CameraConfig,
  lineKey,
  linesTotal,
  offsetFrom,
  onBridge,
  pointsFor,
  readBridge,
  type Allergen,
  type AreaId,
  type BridgeEvent,
  type BridgeState,
  type CallKind,
  type Line,
  type Mode,
  type Order,
  type Picks,
} from '@grill/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';

/**
 * The demo guest on this device: the cart, the orders placed from the app, the table they sit at, their points and
 * what they do not eat. Kept in the browser (localStorage); orders and calls also go to the panel over the bridge.
 */

export type Diet = { avoid: Allergen[]; halal: boolean; vega: boolean; mild: boolean };

export type TableSession = { n: number; since: number; guests: string[]; lines: Line[]; paid: boolean; /** Lines already sent to the kitchen. */ sent: string[] };

type Guest = {
  name: string;
  area: AreaId;
  points: number;
  diet: Diet;
  favourites: string[];
  cart: Line[];
  mode: Mode;
  table: TableSession | null;
  /** Orders that were rated or shared, so the app does not ask twice. */
  rated: string[];
};

const KEY = 'grill-point-guest-v1';

const FRESH: Guest = {
  name: 'Lotte',
  area: 'geenhoven',
  points: 238,
  diet: { avoid: [], halal: false, vega: false, mild: false },
  favourites: ['kapsalon', 'smash'],
  cart: [],
  mode: 'bezorgen',
  table: null,
  rated: [],
};

function load(): Guest {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return raw ? { ...FRESH, ...(JSON.parse(raw) as Partial<Guest>) } : FRESH;
  } catch {
    return FRESH;
  }
}

/**
 * In the demo the kitchen runs fast: a minute on the fire takes twenty seconds here, so an order goes from the grill to
 * the door while someone watches.
 */
export const DEMO_MINUTE = 20000;

type Demo = {
  now: Date;
  /** Real time while Grill-Point is open; the replayed evening rush otherwise. */
  live: boolean;
  evening: Order[];
  bridge: BridgeState;
  /** Live camera feeds per station: cameras.json, then what the kitchen screen set on this device. */
  cameras: CameraConfig;
  mine: Order[];
  guest: Guest;
  cartCount: number;
  cartTotal: number;
  add: (dish: string, picks: Picks, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  clearCart: () => void;
  setMode: (mode: Mode) => void;
  setArea: (area: AreaId) => void;
  place: (options: { arrive?: number; tip?: number; pay: string }) => Order;
  joinTable: (n: number) => void;
  leaveTable: () => void;
  addToTable: (dish: string, picks: Picks, by?: string) => void;
  call: (kind: CallKind) => BridgeEvent | null;
  /** Sends the table's new lines to the kitchen as one order. */
  fireTable: () => Order | null;
  payTable: () => void;
  setDiet: (diet: Diet) => void;
  toggleFavourite: (dish: string) => void;
  spend: (points: number) => void;
  markRated: (order: string) => void;
  reset: () => void;
  /** Writes an event to the bridge for the panel. */
  send: (event: Parameters<typeof emit>[0]) => BridgeEvent;
};

const Context = createContext<Demo | null>(null);

const offset = Platform.OS === 'web' ? offsetFrom(new URLSearchParams(globalThis.location?.search ?? '').get('at')) : 0;

export const clockNow = () => kitchenNow(new Date(), offset);

/** Friends who join the table a little after the guest scans the code. */
const FRIENDS = ['Daan', 'Elif', 'Sem'];

export function DemoProvider({ children }: PropsWithChildren) {
  const [clock, setClock] = useState(() => clockNow());
  const [bridge, setBridge] = useState<BridgeState>(() => readBridge());
  const [guest, setGuest] = useState<Guest>(() => load());

  useEffect(() => {
    const t = setInterval(() => setClock(clockNow()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => onBridge(setBridge), []);
  const [cameraFile, setCameraFile] = useState<CameraConfig>({});
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    // cameras.json sits next to the app: at the site root in development, under /app/ on the demo site.
    const path = globalThis.location?.pathname ?? '/';
    const at = path.indexOf('/app/');
    loadCameras(at >= 0 ? path.slice(0, at + 5) : '/').then(setCameraFile);
  }, []);
  const cameras = useMemo(() => mergeCameras(cameraFile, bridge.cameras ?? {}), [cameraFile, bridge.cameras]);
  useEffect(() => {
    try {
      globalThis.localStorage?.setItem(KEY, JSON.stringify(guest));
    } catch {
      // Private mode: the guest lasts for this page.
    }
  }, [guest]);

  const day = dateKey(clock.now);
  // The evening belongs to the day it started: after midnight the demo replays the evening before.
  const evening = useMemo(() => eveningOrders(clock.now), [day]); // eslint-disable-line react-hooks/exhaustive-deps
  const mine = useMemo(() => appOrders(bridge).sort((a, b) => b.placed - a.placed), [bridge]);

  const update = useCallback((change: (g: Guest) => Guest) => setGuest((g) => change(g)), []);

  // A page does not hear its own broadcasts, so after writing to the bridge it reads it back itself.
  const send = useCallback((event: Parameters<typeof emit>[0]) => {
    const e = emit(event);
    setBridge(readBridge());
    return e;
  }, []);

  const add = useCallback(
    (dish: string, picks: Picks, qty = 1) =>
      update((g) => {
        const key = lineKey(dish, picks);
        const had = g.cart.find((l) => l.key === key);
        const cart = had ? g.cart.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l)) : [...g.cart, { key, dish, picks, qty }];
        return { ...g, cart };
      }),
    [update],
  );

  const setQty = useCallback((key: string, qty: number) => update((g) => ({ ...g, cart: qty > 0 ? g.cart.map((l) => (l.key === key ? { ...l, qty } : l)) : g.cart.filter((l) => l.key !== key) })), [update]);

  const nowRef = useRef(clock.now);
  nowRef.current = clock.now;
  const guestRef = useRef(guest);
  guestRef.current = guest;

  const place = useCallback(
    ({ arrive }: { arrive?: number; tip?: number; pay: string }) => {
      const g = guestRef.current;
      const t = nowRef.current.getTime();
      const lines = g.cart;
      const total = linesTotal(lines);
      const minutes = cookTime(lines);
      const ride = AREAS.find((a) => a.id === g.area)?.ride ?? 6;
      // "Vuur aan bij aankomst": the kitchen waits until the guest is that many minutes away.
      const wait = arrive ? Math.max(0, arrive - minutes) * DEMO_MINUTE : 0;
      const fire = t + 25000 + wait;
      const ready = fire + minutes * DEMO_MINUTE;
      const seq = 2000 + (Math.floor(t / 1000) % 7000);
      const order: Order = {
        id: `app-${t}`,
        number: `#${seq}`,
        source: g.mode === 'tafel' ? 'tafel' : 'app',
        mode: g.mode,
        guest: `${g.name} (app)`,
        area: g.mode === 'bezorgen' ? g.area : undefined,
        table: g.mode === 'tafel' ? (g.table?.n ?? 1) : undefined,
        lines,
        total,
        placed: t,
        fire,
        ready,
        out: g.mode === 'bezorgen' ? ready + 30000 : undefined,
        done: g.mode === 'bezorgen' ? ready + 30000 + ride * DEMO_MINUTE : ready + 4 * DEMO_MINUTE,
        courier: g.mode === 'bezorgen' ? 'joep' : undefined,
        people: 1,
        mine: true,
      };
      send({ kind: 'order', at: t, order, arrive });
      update((x) => ({ ...x, cart: [], points: x.points + pointsFor(total) }));
      return order;
    },
    [update, send],
  );

  const joinTable = useCallback(
    (n: number) => {
      const t = nowRef.current.getTime();
      send({ kind: 'join', at: t, table: n, guest: guestRef.current.name });
      update((g) => ({ ...g, mode: 'tafel', table: { n, since: t, guests: [g.name], lines: [], paid: false, sent: [] } }));
    },
    [update, send],
  );

  const addToTable = useCallback(
    (dish: string, picks: Picks, by?: string) => {
      const g = guestRef.current;
      if (!g.table) return;
      const who = by ?? g.name;
      const line: Line = { key: `${lineKey(dish, picks)}#${who}`, dish, picks, qty: 1, by: who };
      send({ kind: 'table-line', at: nowRef.current.getTime(), table: g.table.n, line, guest: who });
      update((x) => (x.table ? { ...x, table: { ...x.table, guests: x.table.guests.includes(who) ? x.table.guests : [...x.table.guests, who], lines: [...x.table.lines, line] } } : x));
    },
    [update, send],
  );

  // At the table, friends join a few seconds after the guest and put something on the shared order.
  const tableN = guest.table?.n;
  useEffect(() => {
    if (!tableN) return;
    const timers = FRIENDS.slice(0, 2).map((friend, i) =>
      setTimeout(
        () => {
          const g = guestRef.current;
          if (!g.table || g.table.guests.includes(friend)) return;
          send({ kind: 'join', at: nowRef.current.getTime(), table: g.table.n, guest: friend });
          update((x) => (x.table ? { ...x, table: { ...x.table, guests: [...x.table.guests, friend] } } : x));
          setTimeout(() => addToTable(i === 0 ? 'mix-grill' : 'lahmacun-doner', i === 0 ? { maat: ['groot'], saus: ['knoflook'] } : { salade: [] }, friend), 2600);
        },
        5000 + i * 7000,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, [tableN, update, addToTable, send]);

  const call = useCallback((kind: CallKind) => {
    const g = guestRef.current;
    if (!g.table) return null;
    return send({ kind: 'call', at: nowRef.current.getTime(), table: g.table.n, call: kind, guest: g.name });
  }, [send]);

  const fireTable = useCallback(() => {
    const g = guestRef.current;
    if (!g.table) return null;
    const lines = g.table.lines.filter((l) => !(g.table!.sent ?? []).includes(l.key));
    if (!lines.length) return null;
    const t = nowRef.current.getTime();
    const minutes = cookTime(lines);
    const fire = t + 20000;
    const ready = fire + minutes * DEMO_MINUTE;
    const order: Order = {
      id: `tafel-${t}`,
      number: `#${2000 + (Math.floor(t / 1000) % 7000)}`,
      source: 'tafel',
      mode: 'tafel',
      guest: `Tafel ${g.table.n}`,
      table: g.table.n,
      lines,
      total: linesTotal(lines),
      placed: t,
      fire,
      ready,
      done: ready + 6 * DEMO_MINUTE,
      people: g.table.guests.length,
      mine: true,
    };
    send({ kind: 'order', at: t, order });
    update((x) => (x.table ? { ...x, table: { ...x.table, sent: [...(x.table.sent ?? []), ...lines.map((l) => l.key)] } } : x));
    return order;
  }, [send, update]);

  const value = useMemo<Demo>(
    () => ({
      now: clock.now,
      live: !clock.demo,
      evening,
      bridge,
      cameras,
      mine,
      guest,
      cartCount: guest.cart.reduce((s, l) => s + l.qty, 0),
      cartTotal: linesTotal(guest.cart),
      add,
      setQty,
      clearCart: () => update((g) => ({ ...g, cart: [] })),
      setMode: (mode) => update((g) => ({ ...g, mode })),
      setArea: (area) => update((g) => ({ ...g, area })),
      place,
      joinTable,
      leaveTable: () => update((g) => ({ ...g, table: null, mode: g.mode === 'tafel' ? 'bezorgen' : g.mode })),
      addToTable,
      call,
      fireTable,
      payTable: () => update((g) => (g.table ? { ...g, points: g.points + pointsFor(linesTotal(g.table.lines.filter((l) => l.by === g.name))), table: { ...g.table, paid: true } } : g)),
      setDiet: (diet) => update((g) => ({ ...g, diet })),
      toggleFavourite: (dish) => update((g) => ({ ...g, favourites: g.favourites.includes(dish) ? g.favourites.filter((d) => d !== dish) : [...g.favourites, dish] })),
      spend: (points) => update((g) => ({ ...g, points: Math.max(0, g.points - points) })),
      markRated: (order) => update((g) => ({ ...g, rated: [...g.rated, order] })),
      reset: () => setGuest(FRESH),
      send,
    }),
    [clock, evening, bridge, cameras, mine, guest, add, setQty, update, place, joinTable, addToTable, call, send, fireTable],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useDemo(): Demo {
  const demo = useContext(Context);
  if (!demo) throw new Error('useDemo outside DemoProvider');
  return demo;
}

export const useLevel = () => levelOf(useDemo().guest.points);

/** Dishes the kitchen marked sold out tonight, from the panel. */
export const useSoldOut = () => new Set(useDemo().bridge.soldOut);
