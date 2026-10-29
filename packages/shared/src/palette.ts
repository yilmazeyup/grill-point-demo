/**
 * Grill-Point's two looks, after the logo (a red flame over black) and the red-and-white awning on the Willibrorduslaan:
 * "Crème" by day (warm paper, charcoal ink, flame red) and "Kool & gloed" after sunset in Valkenswaard (charcoal,
 * glowing embers, fire light). The app, the panel and the start page switch between them at the same moment.
 */

export type ThemeMode = 'day' | 'night';

export type Palette = {
  bg: string;
  bg2: string;
  paper: string;
  raised: string;
  ink: string;
  soft: string;
  muted: string;
  line: string;
  line2: string;
  flame: string;
  ember: string;
  gold: string;
  herb: string;
  glass: string;
  /** Text on flame red. */
  onFlame: string;
  ok: string;
};

export const PALETTES: Record<ThemeMode, Palette> = {
  day: {
    bg: '#F4ECE0',
    bg2: '#EADFCF',
    paper: '#FBF6EE',
    raised: '#FFFDF9',
    ink: '#1C1410',
    soft: '#4A3C33',
    muted: '#8A7A6E',
    line: 'rgba(28,20,16,0.10)',
    line2: 'rgba(28,20,16,0.20)',
    flame: '#D42D17',
    ember: '#EE5E1C',
    gold: '#C98A1E',
    herb: '#4E7D3A',
    glass: 'rgba(251,246,238,0.78)',
    onFlame: '#FFF6EC',
    ok: '#2F8A4C',
  },
  night: {
    bg: '#110C0A',
    bg2: '#18110E',
    paper: '#1D1512',
    raised: '#261B17',
    ink: '#F6EBDD',
    soft: '#D6C4B4',
    muted: '#9C8778',
    line: 'rgba(255,226,200,0.09)',
    line2: 'rgba(255,226,200,0.18)',
    flame: '#FF4B2B',
    ember: '#FF8A3D',
    gold: '#F2B04A',
    herb: '#8DBF6A',
    glass: 'rgba(29,21,18,0.72)',
    onFlame: '#FFF6EC',
    ok: '#5BCB7E',
  },
};

/** CSS custom properties for both looks, keyed by `data-theme` on the html element. */
export function paletteCss(): string {
  const vars = (p: Palette) =>
    Object.entries(p)
      .map(([k, v]) => `--gp-${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}:${v};`)
      .join('');
  return `:root,[data-theme="day"]{${vars(PALETTES.day)}color-scheme:light;}[data-theme="night"]{${vars(PALETTES.night)}color-scheme:dark;}`;
}

/** Display, accent, text and number faces; loaded from Google Fonts on the web. */
export const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@500..900&family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700&family=Geist:wght@300..700&family=Geist+Mono:wght@400;500&display=swap';

export const ARABIC_FONTS = '&family=Noto+Kufi+Arabic:wght@500..800&family=IBM+Plex+Sans+Arabic:wght@400;500;600';

/** Which look the kitchen clock calls for, unless the guest picked one: from sunset to sunrise, the night. */
export type ThemeChoice = 'auto' | ThemeMode;

const KEY = 'grill-theme';

export function readThemeChoice(): ThemeChoice {
  try {
    const fromAddress = new URLSearchParams(globalThis.location?.search ?? '').get('theme');
    if (fromAddress === 'day' || fromAddress === 'night' || fromAddress === 'auto') return fromAddress;
    const saved = globalThis.localStorage?.getItem(KEY);
    return saved === 'day' || saved === 'night' ? saved : 'auto';
  } catch {
    return 'auto';
  }
}

export function saveThemeChoice(choice: ThemeChoice) {
  try {
    if (choice === 'auto') globalThis.localStorage?.removeItem(KEY);
    else globalThis.localStorage?.setItem(KEY, choice);
  } catch {
    // Private windows: the choice lasts for this page.
  }
}
