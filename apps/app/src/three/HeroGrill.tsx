import { View, type StyleProp, type ViewStyle } from 'react-native';

/** Natively the home screen shows the photo behind; the 3D grill is drawn on the web. */
export function HeroGrill({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={style} />;
}
