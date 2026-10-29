import {
  addDays,
  appOrders,
  AREAS,
  CALL_NAMES,
  COURIERS,
  dish,
  eveningOrders,
  guestName,
  moments,
  onBridge,
  picksLabel,
  readBridge,
  rng,
  sameDay,
  stageAt,
  TABLES,
  type BridgeEvent,
  type BridgeState,
  type CallKind,
  type Order,
  type Source,
  type Stage,
  type Station,
} from '@grill/shared';
import { useEffect, useMemo, useState } from 'react';

/**
 * The app's link, live: re-reads whenever the app (or another panel) writes to it. The browser does not tell a page
 * about its own writes, so the panel calls `refresh` after it answers a call or moves an order.
 */
export function useBridge(): { state: BridgeState; refresh: () => void } {
  const [state, setState] = useState<BridgeState>(readBridge);
  useEffect(() => onBridge(setState), []);
  return { state, refresh: () => setState(readBridge()) };
}

/** Tonight's orders from every channel, with the guest's own app orders in among them. */
export function useTonight(now: Date, bridge: BridgeState): Order[] {
  const day = now.toDateString();
  const evening = useMemo(() => eveningOrders(now), [day]);
  const mine = useMemo(() => appOrders(bridge).filter((o) => sameDay(new Date(o.placed), now)), [bridge, day]);
  return useMemo(() => [...evening, ...mine].sort((a, b) => a.placed - b.placed), [evening, mine]);
}

/** Events from the app on the kitchen's day, oldest first. */
export const eventsOn = (bridge: BridgeState, now: Date) => bridge.events.filter((e) => sameDay(new Date(e.at), now));

/** "2× Kapsalon · Dürüm · Cola": an order in one line, the main dishes first. */
export function summary(o: Order, max = 4): string {
  const lines = [...o.lines].sort((a, b) => rank(a.dish) - rank(b.dish));
  const parts = lines.slice(0, max).map((l) => `${l.qty > 1 ? `${l.qty}× ` : ''}${dish(l.dish).name}`);
  if (lines.length > max) parts.push(`+${lines.length - max}`);
  return parts.join(' · ');
}

/** Mains first, then desserts, then drinks and sauces. */
const rank = (id: string) => {
  const cat = dish(id).cat;
  return cat === 'drinks' || cat === 'sauzen' ? 2 : cat === 'desserts' ? 1 : 0;
};

/** The order's main dish: what its ticket on the line says. */
export const mainDish = (o: Order) => dish([...o.lines].sort((a, b) => rank(a.dish) - rank(b.dish) || dish(b.dish).cook - dish(a.dish).cook)[0].dish);

export const lineText = (o: Order) =>
  o.lines.map((l) => {
    const d = dish(l.dish);
    const extra = picksLabel(d, l.picks);
    return `${l.qty}× ${d.name}${extra ? ` (${extra})` : ''}`;
  });

// ---------------------------------------------------------------------------------------------------------- calls

export type Call = { id: string; table: number; kind: CallKind; guest: string; at: number; app: boolean };

/**
 * Who is calling right now: the app's calls that nobody answered yet, and the evening's own calls (the bill near the end
 * of a meal, extra sauce once the food is out), each open for a few minutes unless answered from the panel.
 */
export function openCalls(orders: Order[], events: BridgeEvent[], t: number, answered: Set<string>): Call[] {
  const done = new Set(events.filter((e) => e.kind === 'answer').map((e) => (e.kind === 'answer' ? e.call : '')));
  const calls: Call[] = [];
  for (const e of events) {
    if (e.kind !== 'call' || done.has(e.id) || answered.has(e.id) || e.at > t) continue;
    calls.push({ id: e.id, table: e.table, kind: e.call, guest: e.guest, at: e.at, app: true });
  }
  for (const o of orders) {
    if (o.mode !== 'tafel' || !o.table || o.mine) continue;
    const r = rng(o.id);
    const bill = o.done - 5 * 60000;
    if (t >= bill && t < bill + 3 * 60000 && !answered.has(`${o.id}-rekening`)) calls.push({ id: `${o.id}-rekening`, table: o.table, kind: 'rekening', guest: o.guest, at: bill, app: false });
    if (r() < 0.35) {
      const sauce = o.ready + 4 * 60000;
      if (t >= sauce && t < sauce + 2.5 * 60000 && !answered.has(`${o.id}-saus`)) calls.push({ id: `${o.id}-saus`, table: o.table, kind: 'saus', guest: o.guest, at: sauce, app: false });
    }
    if (o.lines.some((l) => l.dish === 'mix-grill')) {
      const chef = o.ready - 60000;
      if (t >= chef && t < chef + 3 * 60000 && !answered.has(`${o.id}-chef`)) calls.push({ id: `${o.id}-chef`, table: o.table, kind: 'chef', guest: o.guest, at: chef, app: false });
    }
  }
  return calls.sort((a, b) => a.at - b.at);
}

// ---------------------------------------------------------------------------------------------------------- the floor

export type TicketView = { id: string; number: string; dish: string; mine: boolean; progress: number; source: Source };

export type TableState = 'vrij' | 'wacht' | 'eet' | 'roept' | 'gereserveerd';

export type TableView = {
  n: number;
  zone: 'binnen' | 'terras';
  seats: number;
  state: TableState;
  guests: number;
  who: string | null;
  total: number;
  call: Call | null;
  mine: boolean;
  /** "19:30 · 4 pers." for a booking from the app within the hour. */
  booked: string | null;
  number: string | null;
};

export type CourierView = {
  id: string;
  name: string;
  phase: 'binnen' | 'wacht' | 'heen' | 'terug';
  progress: number;
  order: Order | null;
  area: (typeof AREAS)[number] | null;
};

export type FloorView = {
  stations: Record<Station, TicketView[]>;
  tables: TableView[];
  couriers: CourierView[];
  /** Bags on the counter, ready to be picked up. */
  bags: { number: string; mine: boolean }[];
  load: number;
  cooking: number;
};

const STATIONS: Station[] = ['grill', 'spit', 'oven', 'plancha', 'fryer', 'pass', 'cold'];

export function floorView(orders: Order[], events: BridgeEvent[], t: number, calls: Call[]): FloorView {
  const stations = Object.fromEntries(STATIONS.map((s) => [s, [] as TicketView[]])) as Record<Station, TicketView[]>;
  let cooking = 0;
  for (const o of orders) {
    const stage = stageAt(o, t);
    if (stage !== 'vuur') continue;
    cooking++;
    const progress = Math.max(0, Math.min(1, (t - o.fire) / Math.max(1, o.ready - o.fire)));
    const seen = new Set<Station>();
    for (const l of o.lines) {
      const d = dish(l.dish);
      if (d.cat === 'drinks' || d.cat === 'sauzen' || seen.has(d.station)) continue;
      seen.add(d.station);
      stations[d.station].push({ id: `${o.id}-${d.station}`, number: o.number, dish: d.name, mine: !!o.mine, progress, source: o.source });
    }
  }
  for (const s of STATIONS) stations[s].sort((a, b) => Number(b.mine) - Number(a.mine) || b.progress - a.progress);

  type Join = Extract<BridgeEvent, { kind: 'join' }>;
  type Reserve = Extract<BridgeEvent, { kind: 'reserve' }>;
  const joins = events.filter((e): e is Join => e.kind === 'join' && e.at <= t && t - e.at < 3 * 3600000);
  const reserves = events.filter((e): e is Reserve => e.kind === 'reserve' && e.at <= t && e.start - t < 3600000 && e.start > t - 30 * 60000);
  const tables: TableView[] = TABLES.map((table) => {
    const o = orders.find((x) => x.mode === 'tafel' && x.table === table.n && x.placed <= t && t < x.done);
    const joined = joins.filter((e) => e.table === table.n);
    const call = calls.find((c) => c.table === table.n) ?? null;
    const booking = reserves.find((e) => e.table === table.n);
    const mine = !!o?.mine || joined.length > 0;
    let state: TableState = 'vrij';
    if (o) state = stageAt(o, t) === 'klaar' ? 'eet' : 'wacht';
    else if (joined.length) state = 'wacht';
    else if (booking) state = 'gereserveerd';
    if (call) state = 'roept';
    const firstJoin = joined[0];
    return {
      n: table.n,
      zone: table.zone,
      seats: table.seats,
      state,
      guests: o?.people ?? (joined.length ? new Set(joined.map((e) => e.guest)).size : 0),
      who: o?.guest ?? firstJoin?.guest ?? null,
      total: o?.total ?? 0,
      call,
      mine,
      booked: booking ? `${hhmm(booking.start)} · ${booking.people} pers.` : null,
      number: o?.number ?? null,
    };
  });

  const couriers: CourierView[] = COURIERS.map((c) => {
    const mineOrders = orders.filter((o) => o.courier === c.id);
    const riding = mineOrders.find((o) => o.out !== undefined && o.out <= t && t < o.done);
    const area = (o: Order | undefined) => AREAS.find((a) => a.id === o?.area) ?? null;
    if (riding) return { id: c.id, name: c.name, phase: 'heen', progress: (t - riding.out!) / Math.max(1, riding.done - riding.out!), order: riding, area: area(riding) };
    const back = mineOrders.find((o) => {
      const a = area(o);
      return a && o.done <= t && t < o.done + (a.ride + 1) * 60000;
    });
    if (back) {
      const a = area(back)!;
      return { id: c.id, name: c.name, phase: 'terug', progress: (t - back.done) / ((a.ride + 1) * 60000), order: back, area: a };
    }
    const waiting = mineOrders.find((o) => o.ready <= t && o.out !== undefined && t < o.out);
    if (waiting) return { id: c.id, name: c.name, phase: 'wacht', progress: 0, order: waiting, area: area(waiting) };
    return { id: c.id, name: c.name, phase: 'binnen', progress: 0, order: null, area: null };
  });

  const bags = orders.filter((o) => o.mode === 'afhalen' && stageAt(o, t) === 'klaar').map((o) => ({ number: o.number, mine: !!o.mine }));
  const busy = orders.filter((o) => {
    const s = stageAt(o, t);
    return s === 'nieuw' || s === 'vuur';
  }).length;
  return { stations, tables, couriers, bags, load: Math.min(1, busy / 14), cooking };
}

const hhmm = (t: number) => {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// ---------------------------------------------------------------------------------------------------------- the board

export type Column = 'nieuw' | 'vuur' | 'klaar' | 'onderweg' | 'tafel';

export const COLUMNS: { id: Column; title: string; hint: string }[] = [
  { id: 'nieuw', title: 'Nieuw', hint: 'Binnen, nog niet op het vuur' },
  { id: 'vuur', title: 'Op het vuur', hint: 'Grill, spit, oven of friteuse' },
  { id: 'klaar', title: 'Klaar', hint: 'Wacht op koerier of op de gast' },
  { id: 'onderweg', title: 'Onderweg', hint: 'Bij de koerier' },
  { id: 'tafel', title: 'Aan tafel', hint: 'Geserveerd binnen of op het terras' },
];

export function columnOf(o: Order, stage: Stage): Column | null {
  if (stage === 'nieuw' || stage === 'vuur' || stage === 'onderweg') return stage;
  if (stage === 'klaar') return o.mode === 'tafel' ? 'tafel' : 'klaar';
  return null;
}

// ---------------------------------------------------------------------------------------------------------- the feed

export type FeedItem = { id: string; at: number; tone: 'flame' | 'gold' | 'herb' | 'ink'; title: string; text: string; app: boolean };

export function eventText(e: BridgeEvent): { title: string; text: string; tone: FeedItem['tone'] } | null {
  switch (e.kind) {
    case 'order':
      return { title: `Bestelling ${e.order.number} uit de app`, text: `${e.order.guest} · ${summary(e.order, 3)}`, tone: 'flame' };
    case 'arrive':
      return { title: `Vuur aan bij aankomst`, text: `Gast is over ${e.minutes} min hier`, tone: 'flame' };
    case 'call':
      return { title: `Tafel ${e.table}: ${CALL_NAMES[e.call]}`, text: `${e.guest} roept via de app`, tone: 'gold' };
    case 'answer':
      return { title: `Oproep beantwoord`, text: `Onderweg over ${e.minutes} min`, tone: 'herb' };
    case 'join':
      return { title: `Tafel ${e.table}: nieuwe gast`, text: `${e.guest} schoof aan via de QR-code`, tone: 'gold' };
    case 'table-line':
      return { title: `Tafel ${e.table} bestelt bij`, text: `${e.guest}: ${e.line.qty}× ${dish(e.line.dish).name}`, tone: 'flame' };
    case 'reserve':
      return { title: `Reservering tafel ${e.table}`, text: `${e.guest} · ${hhmm(e.start)} · ${e.people} pers.`, tone: 'gold' };
    case 'review':
      return { title: `${'★'.repeat(e.stars)} van ${e.guest}`, text: e.text || 'Zonder tekst', tone: 'herb' };
    case 'share':
      return { title: `${e.guest} deelde een story`, text: 'Story-kaart met @grillpoint_valkenswaard', tone: 'herb' };
    case 'spin':
      return { title: `Tafel ${e.table} draaide de spies`, text: `${e.winner} betaalt vanavond`, tone: 'gold' };
    case 'chef-ask':
      return { title: `Vraag aan de AI-chef`, text: `“${e.question}”`, tone: 'ink' };
    case 'stage':
      return null;
  }
}

/** Kitchen moments and what happened in the app, newest first. */
export function feedFor(now: Date, events: BridgeEvent[]): FeedItem[] {
  const t = now.getTime();
  const items: FeedItem[] = moments(now)
    .filter((m) => m.at <= t)
    .map((m) => ({ id: `m-${m.at}`, at: m.at, tone: m.kind === 'rush' ? 'flame' : m.kind === 'baklava' ? 'gold' : 'ink', title: 'Vers van het vuur', text: m.text, app: false }));
  for (const e of events) {
    if (e.at > t) continue;
    const text = eventText(e);
    if (text) items.push({ id: e.id, at: e.at, tone: text.tone, title: text.title, text: text.text, app: true });
  }
  return items.sort((a, b) => b.at - a.at).slice(0, 18);
}

// ---------------------------------------------------------------------------------------------------------- numbers

export const SOURCES: { id: Source; name: string; colour: string }[] = [
  { id: 'app', name: 'Grill-Point app', colour: 'var(--gp-flame)' },
  { id: 'thuisbezorgd', name: 'Thuisbezorgd', colour: '#F28A1E' },
  { id: 'site', name: 'grill-point.nl', colour: 'var(--gp-gold)' },
  { id: 'tafel', name: 'Aan tafel', colour: 'var(--gp-herb)' },
  { id: 'telefoon', name: 'Telefoon', colour: 'var(--gp-muted)' },
];

export function numbers(orders: Order[], t: number) {
  const placed = orders.filter((o) => o.placed <= t);
  const revenue = placed.reduce((s, o) => s + o.total, 0);
  const bySource = SOURCES.map((s) => {
    const list = placed.filter((o) => o.source === s.id);
    return { ...s, count: list.length, revenue: list.reduce((x, o) => x + o.total, 0) };
  });
  return { count: placed.length, revenue, average: placed.length ? revenue / placed.length : 0, bySource };
}

/** The same weekday a week ago, up to the same minute: the comparison under the numbers. */
export function lastWeek(now: Date) {
  const then = addDays(now, -7);
  const orders = eveningOrders(then);
  return numbers(orders, then.getTime());
}

/**
 * Tomorrow's prep list, from tomorrow's demo evening: portions of each meat, dough balls, fries and charcoal. A demo
 * forecast; a live version would learn from Grill-Point's own sales and the weather.
 */
export function prepForTomorrow(now: Date) {
  const tomorrow = addDays(now, 1);
  const orders = eveningOrders(tomorrow);
  const meat: Record<string, number> = { doner: 0, kipdoner: 0, shoarma: 0, kipfilet: 0 };
  let skewers = 0;
  let dough = 0;
  let lahmacun = 0;
  let fries = 0;
  let grill = 0;
  let baklava = 0;
  for (const o of orders) {
    for (const l of o.lines) {
      const d = dish(l.dish);
      const big = l.picks.maat?.[0] === 'groot' ? 1.5 : 1;
      const v = l.picks.vlees?.[0];
      const portion = d.cat === 'kapsalon' ? 0.2 : 0.14;
      if (v && v in meat) meat[v] += portion * big * l.qty;
      if (v === 'mix') {
        meat.doner += (portion / 2) * big * l.qty;
        meat.kipdoner += (portion / 2) * big * l.qty;
      }
      if (/doner/.test(d.id) && !v) meat[d.id.includes('kip') ? 'kipdoner' : 'doner'] += 0.12 * l.qty;
      if (d.cat === 'grill') {
        grill += l.qty * (d.id === 'mix-grill' ? 3 : 1) * big;
        skewers += l.qty * (d.id === 'mix-grill' ? 4 : 2) * big;
      }
      if (d.cat === 'pizza') dough += l.qty;
      if (d.id.startsWith('lahmacun')) lahmacun += l.qty;
      if (d.cat === 'kapsalon' || d.id === 'friet' || d.cat === 'kids' || l.picks.vorm?.[0] === 'menu') fries += 0.25 * l.qty * big;
      if (d.id === 'baklava') baklava += 4 * l.qty;
    }
  }
  const kg = (x: number) => Math.ceil(x * 1.1 * 2) / 2;
  return {
    day: tomorrow,
    orders: orders.length,
    items: [
      { name: 'Döner', value: kg(meat.doner), unit: 'kg' },
      { name: 'Kipdöner', value: kg(meat.kipdoner), unit: 'kg' },
      { name: 'Shoarma', value: kg(meat.shoarma), unit: 'kg' },
      { name: 'Kipfilet', value: kg(meat.kipfilet), unit: 'kg' },
      { name: 'Spiesen rijgen', value: Math.ceil(skewers * 1.1), unit: 'st' },
      { name: 'Pizzadeeg', value: Math.ceil(dough * 1.1), unit: 'bollen' },
      { name: 'Lahmacun', value: Math.ceil(lahmacun * 1.15), unit: 'st' },
      { name: 'Friet', value: kg(fries), unit: 'kg' },
      { name: 'Houtskool', value: kg(8 + grill * 0.35), unit: 'kg' },
      { name: 'Baklava', value: Math.ceil(baklava * 1.1), unit: 'st' },
    ],
  };
}

/** Guests who shared their plate tonight: the app's own shares and the evening's. */
export function sharesTonight(orders: Order[], events: BridgeEvent[], t: number) {
  const fromApp = events.filter((e) => e.kind === 'share' && e.at <= t).map((e) => ({ id: e.id, at: e.at, guest: e.kind === 'share' ? e.guest : '', dish: '', app: true }));
  const evening = orders
    .filter((o) => o.done <= t && !o.mine && rng(`${o.id}-share`)() < 0.12)
    .map((o) => ({ id: `${o.id}-share`, at: o.done, guest: o.guest, dish: mainDish(o).name, app: false }));
  return [...fromApp, ...evening].sort((a, b) => b.at - a.at);
}

/** Made-up guests for the social studio when the app has not been used yet. */
export const fakeGuest = (seed: string) => guestName(rng(seed));
