import { Image } from 'expo-image';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { PHOTOS } from '../photos';
import { C, fx } from '../theme';
import { Flame } from './Logo';

/** Grill-Point's own pictures, from its Instagram (assets/grillpoint/CREDITS.md). */
const OWN: Record<string, number> = {
  __storefront: require('../../assets/grillpoint/storefront.jpg'),
  __burgerprep: require('../../assets/grillpoint/burger-prep.jpg'),
  __menuboard: require('../../assets/grillpoint/menu-board.jpg'),
};

/**
 * A dish photo (stock photography, see assets/photos/CREDITS.md), filling its box. Without a photo the box shows a
 * fire-coloured tile with the flame, so a missing picture never leaves a hole.
 */
export function Photo({ id, style, radius = 0, dim }: { id: string; style?: StyleProp<ViewStyle>; radius?: number; dim?: boolean }) {
  const source = OWN[id] ?? PHOTOS[id];
  return (
    <View {...fx('photo')} style={[{ overflow: 'hidden', borderRadius: radius, backgroundColor: C.bg2 }, style]}>
      {source ? (
        <Image source={source} style={{ width: '100%', height: '100%', opacity: dim ? 0.45 : 1 }} contentFit="cover" transition={250} />
      ) : (
        <View {...fx('dye-coal')} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.coal }}>
          <Flame size={34} id={`ph-${id}`} />
        </View>
      )}
    </View>
  );
}
