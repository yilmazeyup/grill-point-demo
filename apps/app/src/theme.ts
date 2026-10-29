import { PALETTES, type Palette } from '@grill/shared';
import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/**
 * Grill-Point's look: "Crème" by day and "Kool & gloed" after sunset. On the web every colour is a CSS variable, so the
 * whole app turns from cream to charcoal in one step when the sun goes down in Valkenswaard (see src/web/css.ts and
 * src/state/theme.tsx); natively the night palette stands in.
 */

export const isWeb = Platform.OS === 'web';

const v = (name: keyof Palette): string => (isWeb ? `var(--gp-${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)})` : PALETTES.night[name]);

export const C = {
  bg: v('bg'),
  bg2: v('bg2'),
  paper: v('paper'),
  raised: v('raised'),
  ink: v('ink'),
  soft: v('soft'),
  muted: v('muted'),
  line: v('line'),
  line2: v('line2'),
  flame: v('flame'),
  ember: v('ember'),
  gold: v('gold'),
  herb: v('herb'),
  glass: v('glass'),
  onFlame: v('onFlame'),
  ok: v('ok'),
  /** Fixed colours that read the same in both looks. */
  white: '#FFF6EC',
  black: '#110C0A',
  coal: '#1C1410',
};

export const FONT = {
  /** Heavy condensed caps, like the letters on a grill-house sign. */
  display: isWeb ? '"Big Shoulders Display", "Noto Kufi Arabic", Impact, "Arial Narrow", sans-serif' : Platform.select({ ios: 'AvenirNextCondensed-Heavy', default: 'sans-serif-condensed' }),
  /** Soft italic serif for the words that carry flavour. */
  serif: isWeb ? '"Fraunces", "Noto Naskh Arabic", Georgia, serif' : Platform.select({ ios: 'Georgia', default: 'serif' }),
  sans: isWeb ? '"Geist", "IBM Plex Sans Arabic", "Helvetica Neue", Arial, sans-serif' : undefined,
  mono: isWeb ? '"Geist Mono", "IBM Plex Sans Arabic", ui-monospace, Menlo, monospace' : Platform.select({ ios: 'Menlo', default: 'monospace' }),
};

export const R = { xs: 8, sm: 12, md: 18, lg: 24, xl: 32, pill: 999 };
export const PAD = 20;

/** Web-only CSS that React Native's types do not know (backdrop filters, gradients, blend modes). */
export const web = (style: Record<string, string | number>): ViewStyle & TextStyle => (isWeb ? (style as ViewStyle & TextStyle) : {});

/** Hooks an element up to the global web stylesheet through a data attribute: `{...fx('glass')}`. Ignored natively. */
export const fx = (names: string): Record<string, unknown> => (isWeb ? { dataSet: { fx: names } } : {});

export const shadow = (depth = 1): ViewStyle =>
  isWeb
    ? ({ boxShadow: `0 ${6 * depth}px ${22 * depth}px -${4 * depth}px rgba(20,10,4,${0.18 + depth * 0.08})` } as ViewStyle)
    : { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 14 * depth, shadowOffset: { width: 0, height: 6 * depth }, elevation: 5 * depth };

/** The width the app is laid out for: a phone, also on a wide screen. */
export const MAX_WIDTH = 520;
