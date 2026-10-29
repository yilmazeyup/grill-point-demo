import { View, type StyleProp, type ViewStyle } from 'react-native';

/** Natively the floor is not drawn in 3D; the box stays and the table buttons below still work. */
export function TablePicker({ style }: { picked: number | null; taken: number[]; onPick: (n: number) => void; style?: StyleProp<ViewStyle> }) {
  return <View style={style} />;
}
