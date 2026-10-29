import type { Order, Stage } from './kitchen';
import type { Line, Station } from './menu';
import type { StaffId } from './team';

/**
 * The live link between the app and the panel. Both are served from the same site, so they share the browser's
 * storage: what a guest does in the app (order, call the chef to the table, join a table, book one) is written here and
 * shows up in the panel at once, and what the kitchen does in the panel (fire an order, answer a call, mark a dish sold
 * out) shows up in the app. Also when the two are open side by side on the start page. Nothing leaves the browser.
 */

export type CallKind = 'chef' | 'ober' | 'rekening' | 'saus' | 'water';

export const CALL_NAMES: Record<CallKind, string> = {
  chef: 'Chef aan tafel',
  ober: 'Bediening',
  rekening: 'De rekening',
  saus: 'Extra saus',
  water: 'Een kan water',
};

export type BridgeEvent = { id: string; /** Kitchen clock, ms. */ at: number } & (
  | { kind: 'order'; order: Order; arrive?: number }
  | { kind: 'arrive'; order: string; minutes: number }
  | { kind: 'call'; table: number; call: CallKind; guest: string }
  | { kind: 'answer'; call: string; by: StaffId; minutes: number }
  | { kind: 'join'; table: number; guest: string }
  | { kind: 'table-line'; table: number; line: Line; guest: string }
  | { kind: 'reserve'; table: number; start: number; people: number; guest: string }
  | { kind: 'review'; stars: number; text: string; order: string; guest: string }
  | { kind: 'share'; order: string; guest: string }
  | { kind: 'spin'; table: number; winner: string }
  | { kind: 'stage'; order: string; stage: Stage }
  | { kind: 'chef-ask'; question: string; guest: string }
);

export type BridgeState = {
  events: BridgeEvent[];
  /** Dishes the kitchen marked sold out for tonight. */
  soldOut: string[];
  /** Camera feeds set on the kitchen screen, per station, on top of cameras.json (see cameras.ts). */
  cameras: Partial<Record<Station, string>>;
};

const KEY = 'grill-point-demo-v1';
const CHANNEL = 'grill-point-demo';
const EMPTY: BridgeState = { events: [], soldOut: [], cameras: {} };

const storage = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

let channel: BroadcastChannel | null = null;
const getChannel = () => {
  if (!channel && typeof BroadcastChannel !== 'undefined') channel = new BroadcastChannel(CHANNEL);
  return channel;
};

export function readBridge(): BridgeState {
  try {
    const raw = storage()?.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<BridgeState>;
    return {
      events: Array.isArray(parsed.events) ? parsed.events : [],
      soldOut: Array.isArray(parsed.soldOut) ? parsed.soldOut : [],
      cameras: parsed.cameras && typeof parsed.cameras === 'object' ? parsed.cameras : {},
    };
  } catch {
    return EMPTY;
  }
}

function write(state: BridgeState) {
  try {
    storage()?.setItem(KEY, JSON.stringify({ ...state, events: state.events.slice(-160) }));
  } catch {
    // Private mode or storage off: the demo still works on this screen.
  }
  getChannel()?.postMessage('changed');
}

export function updateBridge(update: (state: BridgeState) => BridgeState) {
  write(update(readBridge()));
}

let seq = 0;

type NewEvent = BridgeEvent extends infer E ? (E extends BridgeEvent ? Omit<E, 'id'> : never) : never;

/** Adds what just happened; returns the event with its id. */
export function emit(event: NewEvent): BridgeEvent {
  const full = { ...event, id: `${event.kind}-${Date.now()}-${++seq}` } as BridgeEvent;
  updateBridge((s) => ({ ...s, events: [...s.events, full] }));
  return full;
}

export const setSoldOut = (dishId: string, out: boolean) =>
  updateBridge((s) => ({ ...s, soldOut: out ? [...new Set([...s.soldOut, dishId])] : s.soldOut.filter((d) => d !== dishId) }));

/** Sets (or with an empty url, clears) the camera feed of a station. */
export const setCamera = (station: Station, url: string) =>
  updateBridge((s) => {
    const cameras = { ...s.cameras };
    if (url.trim()) cameras[station] = url.trim();
    else delete cameras[station];
    return { ...s, cameras };
  });

/** Starts the demo over, but keeps the cameras the kitchen set up. */
export const resetBridge = () => write({ ...EMPTY, cameras: readBridge().cameras });

/** Calls back whenever the other screen changes something. */
export function onBridge(callback: (state: BridgeState) => void): () => void {
  const ch = getChannel();
  const onMessage = () => callback(readBridge());
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) callback(readBridge());
  };
  ch?.addEventListener('message', onMessage);
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') window.addEventListener('storage', onStorage);
  return () => {
    ch?.removeEventListener('message', onMessage);
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') window.removeEventListener('storage', onStorage);
  };
}

/** The guest's own orders from the app, with the kitchen's moves applied (fired early, marked ready). */
export function appOrders(state: BridgeState): Order[] {
  const orders = new Map<string, Order>();
  for (const e of state.events) {
    if (e.kind === 'order') orders.set(e.order.id, { ...e.order, mine: true });
    if (e.kind === 'stage') {
      const o = orders.get(e.order);
      if (!o) continue;
      const at = e.at;
      if (e.stage === 'vuur' && at < o.fire) {
        const shift = o.fire - at;
        orders.set(o.id, { ...o, fire: at, ready: o.ready - shift, out: o.out !== undefined ? o.out - shift : undefined, done: o.done - shift });
      }
      if (e.stage === 'klaar' && at < o.ready) {
        const shift = o.ready - at;
        orders.set(o.id, { ...o, fire: Math.min(o.fire, at), ready: at, out: o.out !== undefined ? o.out - shift : undefined, done: o.done - shift });
      }
    }
    if (e.kind === 'arrive') {
      const o = orders.get(e.order);
      if (o) orders.set(o.id, { ...o });
    }
  }
  return [...orders.values()];
}
