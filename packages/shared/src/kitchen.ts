import { addMinutes, atMinute, dateKey, minuteOf, startOfDay } from './format';
import { cookTime, defaultPicks, dish, DISHES, lineKey, linesTotal, type Line, type Picks } from './menu';
import { between, pick, rng, weighted, type Rng } from './random';
import { AREAS, RESTAURANT, type AreaId } from './restaurant';
import { COURIERS, TABLES, type StaffId } from './team';

/**
 * The demo evening: every order of the night, made up but the same in the app and the panel because it grows from
 * the date. Orders come in through Grill-Point's own app, its website, Thuisbezorgd, the phone and the tables, and each
 * one carries its times (in, on the fire, ready, on the road, done), so any moment of the evening can be shown.
 */

export type Source = 'app' | 'site' | 'thuisbezorgd' | 'telefoon' | 'tafel';
export type Mode = 'bezorgen' | 'afhalen' | 'tafel';
export type Stage = 'nieuw' | 'vuur' | 'klaar' | 'onderweg' | 'gegeten' | 'bezorgd' | 'afgehaald';

export type Order = {
  id: string;
  number: string;
  source: Source;
  mode: Mode;
  guest: string;
  area?: AreaId;
  table?: number;
  people?: number;
  lines: Line[];
  total: number;
  /** Times in ms. */
  placed: number;
  fire: number;
  ready: number;
  out?: number;
  done: number;
  courier?: StaffId;
  /** The guest's own order, placed in the app on this device. */
  mine?: boolean;
};

export const SOURCE_NAMES: Record<Source, string> = {
  app: 'Grill-Point app',
  site: 'grill-point.nl',
  thuisbezorgd: 'Thuisbezorgd',
  telefoon: 'Telefoon',
  tafel: 'Aan tafel',
};

export const MODE_NAMES: Record<Mode, string> = { bezorgen: 'Bezorgen', afhalen: 'Afhalen', tafel: 'Aan tafel' };

export function stageAt(o: Order, t: number): Stage | null {
  if (t < o.placed) return null;
  if (t < o.fire) return 'nieuw';
  if (t < o.ready) return 'vuur';
  if (o.mode === 'bezorgen') {
    if (o.out !== undefined && t < o.out) return 'klaar';
    if (t < o.done) return 'onderweg';
    return 'bezorgd';
  }
  if (t < o.done) return 'klaar';
  return o.mode === 'tafel' ? 'gegeten' : 'afgehaald';
}

export const STAGE_NAMES: Record<Stage, string> = {
  nieuw: 'Nieuw',
  vuur: 'Op het vuur',
  klaar: 'Klaar',
  onderweg: 'Onderweg',
  gegeten: 'Aan tafel',
  bezorgd: 'Bezorgd',
  afgehaald: 'Afgehaald',
};

const FIRST = [
  'Daan', 'Sem', 'Lucas', 'Milan', 'Levi', 'Noah', 'Finn', 'Bram', 'Thijs', 'Luuk', 'Jesse', 'Ruben', 'Lars', 'Tim', 'Stijn',
  'Emre', 'Yusuf', 'Kaan', 'Burak', 'Mehmet', 'Hamza', 'Omar', 'Bilal', 'Ayoub', 'Mohamed',
  'Emma', 'Julia', 'Tess', 'Sophie', 'Fleur', 'Anouk', 'Lotte', 'Noor', 'Sanne', 'Iris', 'Elif', 'Zeynep', 'Esra', 'Yasmina', 'Sara',
];
const LAST = ['de Vries', 'van Dijk', 'Jansen', 'Bakker', 'Hendriks', 'van den Heuvel', 'Willems', 'Peters', 'Smits', 'Verhoeven', 'van Gils', 'Kuijpers', 'Yılmaz', 'Kaya', 'Demir', 'Çelik', 'El Idrissi', 'Bouzid'];

export const guestName = (r: Rng) => `${pick(r, FIRST)} ${pick(r, LAST).split(' ').pop()!.charAt(0)}.`;

/** What people order, by how often. */
const POPULAR: [string, number][] = [
  ['kapsalon', 14], ['durum', 12], ['broodje', 9], ['smash', 9], ['classic', 4], ['chicken', 4], ['mix-grill', 3], ['adana', 4],
  ['kofte', 3], ['kip-sis', 3], ['pirzola', 2], ['kippenvleugels', 2], ['lahmacun', 4], ['lahmacun-doner', 4], ['schotel', 5],
  ['pizza-doner', 4], ['pizza-margherita', 3], ['pizza-salami', 3], ['pizza-pepperoni', 3], ['pizza-sucuk', 2], ['pizza-hawaii', 2],
  ['pizza-shoarma', 2], ['pizza-kipfilet', 2], ['hotwings', 5], ['tenders', 3], ['nuggets', 2], ['friet', 4], ['kids-nuggets', 2],
  ['kids-frikandel', 1], ['pita-doner', 2], ['baklava', 3], ['churros', 2], ['cheesecake', 1], ['poffertjes', 1],
];
const DRINK_IDS = DISHES.filter((d) => d.cat === 'drinks').map((d) => d.id);
const SAUCE_IDS = DISHES.filter((d) => d.cat === 'sauzen').map((d) => d.id);

function randomPicks(r: Rng, id: string): Picks {
  const d = dish(id);
  const picks = defaultPicks(d);
  for (const g of d.options ?? []) {
    if (g.pick !== 'one') continue;
    if (g.id === 'saus') picks.saus = [pick(r, g.choices.slice(1)).id];
    else if (g.id === 'vlees') picks.vlees = [weighted(r, g.choices.map((c, i) => [c.id, i === 0 ? 5 : c.id === 'geen' ? 0.2 : 2] as const))];
    else if (r() < 0.35) picks[g.id] = [pick(r, g.choices).id];
  }
  return picks;
}

function randomLines(r: Rng, people: number): Line[] {
  const lines = new Map<string, Line>();
  const add = (id: string, picks: Picks, qty = 1) => {
    const key = lineKey(id, picks);
    const had = lines.get(key);
    if (had) had.qty += qty;
    else lines.set(key, { key, dish: id, picks, qty });
  };
  for (let p = 0; p < people; p++) {
    const id = weighted(r, POPULAR);
    add(id, randomPicks(r, id));
    if (r() < 0.45) add(pick(r, DRINK_IDS), {});
  }
  if (r() < 0.3) add(pick(r, SAUCE_IDS), {}, between(r, 1, 2));
  if (people > 2 && r() < 0.4) add('friet', randomPicks(r, 'friet'));
  return [...lines.values()];
}

/** How many orders an evening brings, busier at the weekend. */
const ORDERS_PER_DAY = [104, 80, 78, 82, 90, 118, 128];

/** When in the evening orders come in, per half hour from 15:00; the rush is at dinner. */
const CURVE = [1, 1.4, 2, 3, 6, 9.5, 11, 10, 7.5, 5.5, 4.2, 3.4, 3, 2.8, 2.6, 2.2, 1.6, 1];

const cache = new Map<string, Order[]>();

export function eveningOrders(day: Date): Order[] {
  const key = dateKey(day);
  const hit = cache.get(key);
  if (hit) return hit;
  const r = rng(`grill-point-${key}`);
  const base = startOfDay(day);
  const count = ORDERS_PER_DAY[base.getDay()];
  const total = CURVE.reduce((s, w) => s + w, 0);
  const orders: Order[] = [];
  let seq = 1000 + between(r, 0, 40);
  // A courier is free again when back at the shop, and takes up to four bags per ride: at the rush, orders that wait
  // for a courier go out together on the next ride.
  const free: Record<string, number> = Object.fromEntries(COURIERS.map((c) => [c.id, 0]));
  const ride: Record<string, { out: number; bags: number; done: number }> = {};
  const tableFree: Record<number, number> = Object.fromEntries(TABLES.map((t) => [t.n, 0]));
  // The kitchen works through the queue: the next order goes on the fire when a hand is free.
  let kitchenFree = 0;

  for (let slot = 0; slot < CURVE.length; slot++) {
    const n = Math.round((CURVE[slot] / total) * count + (r() - 0.5) * 2);
    for (let i = 0; i < n; i++) {
      const minute = RESTAURANT.opens + slot * 30 + r() * 30;
      if (minute >= RESTAURANT.closes - 10) continue;
      const placed = atMinute(base, minute).getTime();
      const source = weighted<Source>(r, [['app', 32], ['thuisbezorgd', 27], ['site', 13], ['tafel', 20], ['telefoon', 8]]);
      let mode: Mode = source === 'tafel' ? 'tafel' : weighted<Mode>(r, [['bezorgen', 64], ['afhalen', 36]]);
      let table: number | undefined;
      if (mode === 'tafel') {
        // The terrace fills in the warm months; in autumn and winter only now and then.
        const warm = base.getMonth() >= 3 && base.getMonth() <= 8;
        const open = TABLES.filter((t) => tableFree[t.n] <= placed && (t.zone === 'binnen' || warm || r() < 0.15));
        if (!open.length) mode = 'afhalen';
        else table = pick(r, open).n;
      }
      const people = mode === 'tafel' ? between(r, 2, Math.min(5, TABLES.find((t) => t.n === table)!.seats)) : weighted(r, [[1, 40], [2, 34], [3, 14], [4, 12]]);
      const lines = randomLines(r, people);
      const fire = Math.max(placed + between(r, 40, 140) * 1000, kitchenFree);
      kitchenFree = fire + between(r, 20, 70) * 1000;
      const ready = fire + cookTime(lines) * 60000 + between(r, 0, 90) * 1000;
      const order: Order = {
        id: `${key}-${seq}`,
        number: `#${seq++}`,
        source,
        mode,
        guest: guestName(r),
        lines,
        total: linesTotal(lines),
        placed,
        fire,
        ready,
        done: ready,
        people,
      };
      if (mode === 'bezorgen') {
        const a = pick(r, AREAS);
        order.area = a.id;
        // Join a ride that has not left yet and leaves within a quarter of an hour, or take the first courier back.
        const joining = COURIERS.find((c) => ride[c.id] && ride[c.id].bags < 4 && ride[c.id].out >= ready - 60000 && ride[c.id].out <= ready + 15 * 60000);
        if (joining) {
          const trip = ride[joining.id];
          trip.bags++;
          order.courier = joining.id;
          order.out = Math.max(trip.out, ready + 30000);
          trip.out = order.out;
          order.done = Math.max(trip.done, order.out) + (2 + between(r, 1, a.ride)) * 60000;
          trip.done = order.done;
          free[joining.id] = order.done + (a.ride + 1) * 60000;
        } else {
          const courier = [...COURIERS].sort((x, y) => free[x.id] - free[y.id])[0];
          const out = Math.max(ready + between(r, 30, 180) * 1000, free[courier.id]);
          order.courier = courier.id;
          order.out = out;
          order.done = out + (a.ride + between(r, 0, 3)) * 60000;
          free[courier.id] = order.done + (a.ride + 1) * 60000;
          ride[courier.id] = { out, bags: 1, done: order.done };
        }
      } else if (mode === 'afhalen') {
        order.done = ready + between(r, 1, 9) * 60000;
      } else {
        order.table = table;
        order.done = ready + between(r, 35, 70) * 60000;
        tableFree[table!] = order.done + 5 * 60000;
      }
      orders.push(order);
    }
  }
  orders.sort((a, b) => a.placed - b.placed);
  cache.set(key, orders);
  return orders;
}

/** The orders the kitchen has to do something with at `t`: not yet delivered, picked up or eaten. */
export function openOrders(orders: Order[], t: number): Order[] {
  return orders.filter((o) => o.placed <= t && t < o.done);
}

/** How full the kitchen is, 0 to 1: tickets waiting or on the fire. */
export function kitchenLoad(orders: Order[], t: number): number {
  const busy = orders.filter((o) => {
    const s = stageAt(o, t);
    return s === 'nieuw' || s === 'vuur';
  }).length;
  return Math.min(1, busy / 14);
}

/** What the app promises right now: minutes until a new order is ready, and until it is at the door. */
export function promise(orders: Order[], t: number, rideMinutes = 7): { ready: number; door: number; load: number } {
  const load = kitchenLoad(orders, t);
  const ready = Math.round(9 + load * 16);
  return { ready, door: ready + rideMinutes + 3, load };
}

/** Orders per half hour over the evening, for "when is it quiet". */
export function rushCurve(orders: Order[], day: Date): { minute: number; count: number }[] {
  const out = CURVE.map((_, i) => ({ minute: RESTAURANT.opens + i * 30, count: 0 }));
  const base = startOfDay(day).getTime();
  for (const o of orders) {
    const m = (o.placed - base) / 60000;
    const i = Math.floor((m - RESTAURANT.opens) / 30);
    if (out[i]) out[i].count++;
  }
  return out;
}

/** What was sold in the evening up to `t`, per dish, most first. */
export function soldUntil(orders: Order[], t: number): { dish: string; qty: number; revenue: number }[] {
  const map = new Map<string, { dish: string; qty: number; revenue: number }>();
  for (const o of orders) {
    if (o.placed > t) continue;
    for (const l of o.lines) {
      const row = map.get(l.dish) ?? { dish: l.dish, qty: 0, revenue: 0 };
      row.qty += l.qty;
      row.revenue += dish(l.dish).price * l.qty;
      map.set(l.dish, row);
    }
  }
  return [...map.values()].sort((a, b) => b.qty - a.qty);
}

/** Kitchen moments for the "Vers van het vuur" feed: a fresh spit, pizzas from the oven, the grill lit. */
export type Moment = { at: number; kind: 'spit' | 'oven' | 'grill' | 'baklava' | 'terras' | 'rush'; text: string };

export function moments(day: Date): Moment[] {
  const base = startOfDay(day);
  const r = rng(`moments-${dateKey(day)}`);
  const at = (m: number) => atMinute(base, m).getTime();
  const list: Moment[] = [
    { at: at(14 * 60 + 40), kind: 'grill', text: 'Houtskool aan: de grill is heet voor vanavond' },
    { at: at(14 * 60 + 55), kind: 'spit', text: 'Verse döner aan het spit' },
    { at: at(15 * 60 + 5), kind: 'baklava', text: 'Baklava met pistache binnen, vers van vandaag' },
    { at: at(17 * 60 + between(r, 5, 25)), kind: 'spit', text: 'Tweede kipdöner van de avond aan het spit' },
    { at: at(17 * 60 + 40), kind: 'rush', text: 'Etenstijd: de keuken draait op volle kracht' },
    { at: at(18 * 60 + between(r, 0, 30)), kind: 'oven', text: 'Lahmacun komt nu knapperig uit de oven' },
    { at: at(19 * 60 + between(r, 0, 40)), kind: 'grill', text: 'Mix Grill voor tafel 4: Kerem snijdt aan tafel' },
    { at: at(20 * 60 + between(r, 0, 30)), kind: 'spit', text: 'Nieuwe döner aan het spit voor de late trek' },
    { at: at(21 * 60 + between(r, 0, 40)), kind: 'oven', text: 'Pizza Sucuk is vanavond het meest besteld' },
  ];
  return list;
}

/** The order's moment of the evening as minutes after opening, for 3D and charts. */
export const eveningMinute = (t: number) => minuteOf(new Date(t)) - RESTAURANT.opens;

export const addMin = (t: number, m: number) => addMinutes(new Date(t), m).getTime();
