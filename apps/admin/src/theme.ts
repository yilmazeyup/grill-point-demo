import { isDark, paletteCss, PALETTES, readThemeChoice, saveThemeChoice, type ThemeChoice, type ThemeMode } from '@grill/shared';
import { useEffect, useState } from 'react';

// Both looks as CSS custom properties, once, before the first paint.
const style = document.createElement('style');
style.id = 'gp-palette';
style.textContent = paletteCss();
document.head.appendChild(style);

/** The first look is set straight away; only later switches sweep in. */
let painted = false;

/**
 * "Crème" by day and "Kool & gloed" after sunset in Valkenswaard: the kitchen clock decides, unless the header switch
 * says otherwise (remembered on this device, the same key as the app's). `?theme=day|night` forces one for a moment.
 */
export function useTheme(now: Date) {
  const [choice, setChoice] = useState<ThemeChoice>(readThemeChoice);
  const mode: ThemeMode = choice === 'auto' ? (isDark(now) ? 'night' : 'day') : choice;

  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.theme === mode) {
      painted = true;
      return;
    }
    const apply = () => {
      root.dataset.theme = mode;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', PALETTES[mode].bg);
    };
    // The switch sweeps in as the sun would; browsers without view transitions just change.
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (painted && doc.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) doc.startViewTransition(apply);
    else apply();
    painted = true;
  }, [mode]);

  return {
    choice,
    mode,
    choose: (next: ThemeChoice) => {
      saveThemeChoice(next);
      setChoice(next);
    },
  };
}
