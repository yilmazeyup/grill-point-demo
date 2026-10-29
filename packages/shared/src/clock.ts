import { addDays, atMinute, minuteOf, startOfDay } from './format';
import { isOpenAt, RESTAURANT } from './restaurant';

export type KitchenClock = {
  now: Date;
  /** False while Grill-Point is really open and the demo follows the real clock. */
  demo: boolean;
  reason: 'live' | 'closed' | 'set';
};

const ZONE = 'Europe/Amsterdam';

/** Minutes the restaurant's time zone is ahead of UTC at `date`. */
function zoneOffset(date: Date): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: ZONE,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(date);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
    return Math.round((asUtc - date.getTime()) / 60000);
  } catch {
    return -date.getTimezoneOffset();
  }
}

/**
 * The time on the wall in Valkenswaard, as a Date whose local hours and minutes read as the restaurant's: the demo can
 * be opened anywhere (Istanbul, Amsterdam) and still shows the kitchen's own clock.
 */
export function wallClock(real: Date = new Date()): Date {
  return new Date(real.getTime() + (zoneOffset(real) + real.getTimezoneOffset()) * 60000);
}

/** "2026-10-29T19:20" (seconds optional), in restaurant time, as an offset from the wall clock; 0 when absent. */
export function offsetFrom(at: string | null | undefined, real: Date = new Date()): number {
  if (!at || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(at)) return 0;
  const moment = new Date(at).getTime();
  return Number.isNaN(moment) ? 0 : moment - wallClock(real).getTime();
}

/** The busy stretch the demo replays while the kitchen is closed: 17:30 to 21:30. */
export const REPLAY = { from: 17 * 60 + 30, length: 240 };

/**
 * The kitchen's clock, the same in the app and the panel. While Grill-Point is open (every day 15:00–00:00) it is the
 * real time in Valkenswaard. At night and in the morning the demo replays last evening's rush, 17:30 to 21:30, at real
 * speed, so the grill is always lit and both screens show the same moment.
 */
export function kitchenNow(real: Date = new Date(), offset = 0): KitchenClock {
  const wall = wallClock(real);
  if (offset) return { now: new Date(wall.getTime() + offset), demo: true, reason: 'set' };
  if (isOpenAt(wall)) return { now: wall, demo: false, reason: 'live' };
  const evening = minuteOf(wall) < RESTAURANT.opens ? addDays(startOfDay(wall), -1) : startOfDay(wall);
  const minute = REPLAY.from + (minuteOf(wall) % REPLAY.length);
  return { now: atMinute(evening, minute), demo: true, reason: 'closed' };
}

// ---------------------------------------------------------------------------------------------------------- the sun

const rad = Math.PI / 180;

/**
 * Sunset in Valkenswaard on `day`, in minutes after midnight local time (NOAA's approximation, good to a minute or two).
 * The app turns from cream to charcoal and ember when the sun goes down.
 */
export function sunsetMinute(day: Date, lat: number = RESTAURANT.lat, lon: number = RESTAURANT.lon): number {
  return sunEvent(day, lat, lon, false);
}

export function sunriseMinute(day: Date, lat: number = RESTAURANT.lat, lon: number = RESTAURANT.lon): number {
  return sunEvent(day, lat, lon, true);
}

function sunEvent(day: Date, lat: number, lon: number, rise: boolean): number {
  const start = new Date(day.getFullYear(), 0, 0);
  const n = Math.floor((startOfDay(day).getTime() - start.getTime()) / 86400000);
  const gamma = ((2 * Math.PI) / 365) * (n - 1);
  const eqTime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
  const decl = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma) - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma) - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
  const cosH = Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(decl)) - Math.tan(lat * rad) * Math.tan(decl);
  const ha = Math.acos(Math.max(-1, Math.min(1, cosH))) / rad;
  const utc = 720 - 4 * (lon + (rise ? ha : -ha)) - eqTime;
  // The offset of the restaurant's zone on that day (CET or CEST).
  const offset = zoneOffset(new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), 12)));
  return (utc + offset + 1440) % 1440;
}

/** True between sunset and sunrise in Valkenswaard. */
export function isDark(now: Date): boolean {
  const m = minuteOf(now);
  return m >= sunsetMinute(now) || m < sunriseMinute(now);
}
