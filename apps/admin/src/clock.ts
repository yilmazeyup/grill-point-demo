import { atMinute, kitchenNow, offsetFrom, RESTAURANT, startOfDay } from '@grill/shared';
import { useEffect, useState } from 'react';

/** `?at=2026-10-29T19:00` (Valkenswaard time) starts the clock at that moment and lets it run on from there. */
const OFFSET = offsetFrom(new URLSearchParams(window.location.search).get('at'));

/** "Play the evening": nine hours in ninety seconds, a step every tenth of a second. */
const STEP_MIN = 0.6;
const TICK_MS = 100;

/**
 * The panel's clock, the same as the app's: the real time in Valkenswaard while Grill-Point is open (15:00–00:00),
 * otherwise a replay of last evening's rush. "Speel de avond af" runs the whole evening from opening to closing in
 * about a minute and a half.
 */
export function useKitchenClock() {
  const [clock, setClock] = useState(() => kitchenNow(new Date(), OFFSET));
  const [play, setPlay] = useState<Date | null>(null);

  useEffect(() => {
    if (play) return;
    const id = window.setInterval(() => setClock(kitchenNow(new Date(), OFFSET)), 1000);
    return () => window.clearInterval(id);
  }, [play]);

  useEffect(() => {
    if (!play) return;
    const id = window.setInterval(() => {
      setPlay((p) => {
        if (!p) return p;
        const next = new Date(p.getTime() + STEP_MIN * 60000);
        const minute = (next.getTime() - startOfDay(next).getTime()) / 60000;
        // Midnight is the end of the evening: back to the clock.
        return next.getDate() !== p.getDate() || minute >= RESTAURANT.closes - 1 ? null : next;
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [play !== null]);

  const now = play ?? clock.now;
  const span = RESTAURANT.closes - RESTAURANT.opens;
  const minute = (now.getTime() - startOfDay(now).getTime()) / 60000;
  const progress = Math.max(0, Math.min(1, (minute - RESTAURANT.opens) / span));
  return {
    now,
    demo: play ? true : clock.demo,
    reason: play ? ('play' as const) : clock.reason,
    playing: !!play,
    progress,
    play: () => setPlay(atMinute(startOfDay(clock.now), RESTAURANT.opens)),
    stop: () => setPlay(null),
  };
}

export type KitchenClockState = ReturnType<typeof useKitchenClock>;
