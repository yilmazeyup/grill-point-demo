import type { Station } from '@grill/shared';
import { View, type StyleProp, type ViewStyle } from 'react-native';

/** Natively the live feeds are not played yet; the Grill-Cam shows the 3D kitchen. */
export function CameraFeed({ style }: { url: string; station: Station; style?: StyleProp<ViewStyle>; onState?: (ok: boolean) => void }) {
  return <View style={style} />;
}
