import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { C, FONT, fx } from '../theme';
import { Txt } from './ui';

/** The flame from Grill-Point's logo: red at the base, orange and gold at the tips. */
export function Flame({ size = 40, id = 'f' }: { size?: number; id?: string }) {
  return (
    <Svg width={size * 0.72} height={size} viewBox="0 0 36 50">
      <Defs>
        <LinearGradient id={`${id}-o`} x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor="#B3160C" />
          <Stop offset="0.45" stopColor="#F0461C" />
          <Stop offset="1" stopColor="#FFB23E" />
        </LinearGradient>
        <LinearGradient id={`${id}-i`} x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor="#FF7A2A" />
          <Stop offset="1" stopColor="#FFE08A" />
        </LinearGradient>
      </Defs>
      <Path
        d="M18 49C8.6 49 2 42.8 2 34.3c0-7.4 4.8-11.6 7.6-17.6 1 3.6 2.9 6 5.5 7.4C15.6 15 18.4 7.4 24.5 1c-.8 7 1.7 11.4 4.4 15.7 2.2 3.6 5.1 8.4 5.1 15.3C34 42.4 27.3 49 18 49z"
        fill={`url(#${id}-o)`}
      />
      <Path d="M18 49c-4.6 0-7.7-3-7.7-7.2 0-4.4 3.4-6.8 5.1-11 3.4 2.6 9.3 6 9.3 11.1C24.7 46.1 21.7 49 18 49z" fill={`url(#${id}-i)`} />
    </Svg>
  );
}

/** The wordmark as on the sign and the Instagram badge: GRILL-POINT with VALKENSWAARD below and the flame on top. */
export function Logo({ size = 1, stacked = true, color = C.ink }: { size?: number; stacked?: boolean; color?: string }) {
  if (!stacked) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 * size }}>
        <View {...fx('flicker')}>
          <Flame size={26 * size} id="lf" />
        </View>
        <Txt v="title" size={24 * size} color={color} style={{ letterSpacing: 0.5 }}>
          GRILL-POINT
        </Txt>
      </View>
    );
  }
  return (
    <View style={{ alignItems: 'center' }}>
      <View {...fx('flicker')}>
        <Flame size={58 * size} id="ls" />
      </View>
      <Txt v="hero" size={50 * size} color={color} style={{ marginTop: -6 * size, fontFamily: FONT.display, letterSpacing: 0.5 }}>
        GRILL-POINT
      </Txt>
      <Txt v="label" size={10 * size} color={C.gold} style={{ letterSpacing: 6 * size, marginTop: 2 }}>
        VALKENSWAARD
      </Txt>
    </View>
  );
}
