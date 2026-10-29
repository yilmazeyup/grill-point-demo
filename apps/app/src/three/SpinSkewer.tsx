import { View, type StyleProp, type ViewStyle } from 'react-native';

/** Natively the skewer is not drawn; the box stays. */
export function SpinSkewer({ style }: { names: string[]; spin: number; onStop: (index: number) => void; style?: StyleProp<ViewStyle> }) {
  return <View style={style} />;
}
