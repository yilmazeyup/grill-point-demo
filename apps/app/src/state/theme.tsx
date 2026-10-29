import { isDark, readThemeChoice, saveThemeChoice, type ThemeChoice, type ThemeMode } from '@grill/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';

import { isWeb } from '../theme';

type ThemeState = {
  /** The look on screen now. */
  mode: ThemeMode;
  choice: ThemeChoice;
  /** Picks a look; on the web the new one grows as a circle from (x, y) on the screen. */
  choose: (choice: ThemeChoice, from?: { x: number; y: number }) => void;
};

const Context = createContext<ThemeState>({ mode: 'night', choice: 'auto', choose: () => {} });

type ViewTransitionDoc = Document & { startViewTransition?: (update: () => void) => unknown };

function apply(mode: ThemeMode, from?: { x: number; y: number }) {
  if (!isWeb || typeof document === 'undefined') return;
  const root = document.documentElement;
  if (root.dataset.theme === mode) return;
  if (from) {
    root.style.setProperty('--gp-wipe-x', `${from.x}px`);
    root.style.setProperty('--gp-wipe-y', `${from.y}px`);
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  const set = () => {
    root.dataset.theme = mode;
    meta?.setAttribute('content', mode === 'night' ? '#110C0A' : '#F4ECE0');
  };
  const doc = document as ViewTransitionDoc;
  // The sunset wipe; without View Transitions (or on the first paint) the look simply changes.
  if (root.dataset.theme && doc.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) doc.startViewTransition(set);
  else set();
}

/**
 * Cream by day, charcoal and ember from sunset in Valkenswaard: "auto" follows the kitchen clock, which is also the
 * clock of the demo evening when the restaurant is closed. The guest can pin either look under Ik → Weergave.
 */
export function ThemeProvider({ now, children }: PropsWithChildren<{ now: Date }>) {
  const [choice, setChoice] = useState<ThemeChoice>(() => readThemeChoice());
  const dark = isDark(now);
  const mode: ThemeMode = choice === 'auto' ? (dark ? 'night' : 'day') : choice;

  const origin = useRef<{ x: number; y: number } | undefined>(undefined);

  useEffect(() => {
    apply(mode, origin.current);
    origin.current = undefined;
  }, [mode]);

  const choose = useCallback((next: ThemeChoice, from?: { x: number; y: number }) => {
    saveThemeChoice(next);
    origin.current = from;
    setChoice(next);
  }, []);

  const value = useMemo(() => ({ mode, choice, choose }), [mode, choice, choose]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export const useTheme = () => useContext(Context);

/** Sets the look before React draws, so the first frame is already in the right colours. */
export function installTheme(now: Date) {
  const choice = readThemeChoice();
  apply(choice === 'auto' ? (isDark(now) ? 'night' : 'day') : choice);
}
