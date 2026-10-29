import type { AreaId } from '@grill/shared';
import { View, type StyleProp, type ViewStyle } from 'react-native';

/** Natively the ride home is not drawn in 3D yet; the box stays. */
export function DeliveryMap({ style }: { area: AreaId; progress: number; courier: string; style?: StyleProp<ViewStyle> }) {
  return <View style={style} />;
}
