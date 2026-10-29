import { View, type StyleProp, type ViewStyle } from 'react-native';

/** Natively the dish page shows the photo; the burger in 3D is drawn on the web. */
export function Burger3D({ style }: { kind: 'smash' | 'classic' | 'chicken'; style?: StyleProp<ViewStyle> }) {
  return <View style={style} />;
}
