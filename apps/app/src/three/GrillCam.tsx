import type { Station } from '@grill/shared';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import type { SkewerKind } from './kitchen';

export type CamProps = {
  station: Station;
  mine: { label: string; kind: SkewerKind | 'spit' | 'pizza' | 'burger'; cook: number } | null;
  tickets: string[];
  style?: StyleProp<ViewStyle>;
};

/** Natively the Grill-Cam is not drawn yet; the box stays dark. */
export function GrillCam({ style }: CamProps) {
  return <View style={[{ backgroundColor: '#0D0907' }, style]} />;
}
