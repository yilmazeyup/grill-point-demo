import { addDays, atMinute, minuteOf, startOfDay } from './format';

/**
 * Grill-Point's own facts, as on grill-point.nl, its Google listing and its Instagram (October 2026). Everything else
 * in the demo (the team, guests, orders, reviews in the app, loyalty points) is made up.
 */
export const RESTAURANT = {
  name: 'Grill-Point',
  kind: 'Döner · Pizza · Restaurant',
  street: 'Willibrorduslaan 47',
  postcode: '5552 HB',
  city: 'Valkenswaard',
  phone: '+31 40 202 6582',
  phoneHref: 'tel:+31402026582',
  email: 'grillpointvw@gmail.com',
  site: 'https://grill-point.nl/',
  instagram: 'grillpoint_valkenswaard',
  instagramUrl: 'https://www.instagram.com/grillpoint_valkenswaard/',
  maps: 'https://maps.google.com/?q=Grill-Point,+Willibrorduslaan+47,+5552+HB+Valkenswaard',
  lat: 51.3580453,
  lon: 5.4545003,
  /** Google, October 2026. */
  rating: 4.7,
  reviews: 38,
  /** Every day of the week, 15:00 to midnight. */
  opens: 15 * 60,
  closes: 24 * 60,
  payments: ['iDEAL | Wero', 'Contant'],
  tips: [10, 15, 20],
} as const;

/** Open hours of a day, in minutes after midnight; the same every day. */
export const hoursOf = (_day: Date) => ({ from: RESTAURANT.opens, to: RESTAURANT.closes });

export function isOpenAt(date: Date): boolean {
  const m = minuteOf(date);
  return m >= RESTAURANT.opens && m < RESTAURANT.closes;
}

/** The next moment the kitchen opens, from `date` on. */
export function nextOpening(date: Date): Date {
  if (isOpenAt(date)) return date;
  const today = atMinute(date, RESTAURANT.opens);
  return today.getTime() > date.getTime() ? today : atMinute(addDays(startOfDay(date), 1), RESTAURANT.opens);
}

/** Areas of Valkenswaard the demo delivers to, with a typical ride in minutes from the Willibrorduslaan. */
export const AREAS = [
  { id: 'geenhoven', name: 'Geenhoven', ride: 4, x: 0.6, y: 0.2 },
  { id: 'centrum', name: 'Centrum', ride: 6, x: -0.2, y: 0.5 },
  { id: 'turfberg', name: 'Turfberg', ride: 7, x: 0.9, y: -0.6 },
  { id: 'het-hool', name: 'Het Hool', ride: 8, x: -0.9, y: -0.3 },
  { id: 'kerkakkers', name: 'Kerkakkers', ride: 7, x: -0.6, y: 0.9 },
  { id: 'dommelen', name: 'Dommelen', ride: 11, x: -1.6, y: 0.7 },
  { id: 'borkel', name: 'Borkel en Schaft', ride: 15, x: 0.4, y: -1.8 },
] as const;

export type AreaId = (typeof AREAS)[number]['id'];

export const area = (id: AreaId) => AREAS.find((a) => a.id === id) ?? AREAS[0];
