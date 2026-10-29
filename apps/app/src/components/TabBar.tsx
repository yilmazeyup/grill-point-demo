import { euro } from '@grill/shared';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tr } from '../i18n';
import { useDemo } from '../state/demo';
import { C, fx, MAX_WIDTH } from '../theme';
import { Icon, type IconName } from './Icon';
import { LiveDot, Press, Txt } from './ui';

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Home', icon: 'home' },
  menu: { label: 'Menu', icon: 'book' },
  tafel: { label: 'Tafel', icon: 'table' },
  ik: { label: 'Ik', icon: 'user' },
};

/**
 * A floating bar of smoked glass with the Grill-Cam raised in the middle like a coal in the fire. Above it, the basket
 * as soon as something is in it.
 */
export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { cartCount, cartTotal, mine, now } = useDemo();
  const routes = state.routes.filter((r) => TABS[r.name]);
  const left = routes.slice(0, 2);
  const right = routes.slice(2);
  const active = mine.find((o) => o.done > now.getTime());
  const item = (route: (typeof routes)[number]) => {
    const tab = TABS[route.name];
    const index = state.routes.indexOf(route);
    const focused = state.index === index;
    return (
      <Press
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={tr(tab.label)}
        scaleTo={0.88}
        onPress={() => {
          if (!focused) navigateToTab(route.key);
        }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, height: 64 }}
      >
        <Icon name={tab.icon} size={22} color={focused ? C.ink : C.muted} stroke={focused ? 2.1 : 1.7} />
        <Txt v="label" size={9} numberOfLines={1} color={focused ? C.flame : C.muted}>
          {tab.label}
        </Txt>
      </Press>
    );
  };
  const live = state.routes.find((r) => r.name === 'live');
  const onLive = state.routes[state.index]?.name === 'live';
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: Math.max(insets.bottom, 12) + 4, alignItems: 'center', gap: 10 }}>
      {cartCount > 0 ? (
        <Press
          onPress={() => router.push('/mandje')}
          fxNames="dye-fire glow sheen"
          accessibilityLabel={tr('Naar je mandje')}
          style={{ width: '92%', maxWidth: MAX_WIDTH - 40, height: 54, borderRadius: 27, backgroundColor: C.flame, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 10 }}
        >
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,246,236,0.18)', alignItems: 'center', justifyContent: 'center' }}>
            <Txt v="price" size={18} color="#FFF6EC">
              {cartCount}
            </Txt>
          </View>
          <Txt v="h3" color="#FFF6EC" weight="700" style={{ flex: 1 }}>
            Bekijk je mandje
          </Txt>
          <Txt v="price" size={19} color="#FFF6EC" style={{ marginRight: 6 }}>
            {euro(cartTotal)}
          </Txt>
          <Icon name="arrow" size={18} color="#FFF6EC" stroke={2.2} />
        </Press>
      ) : null}
      <View
        {...fx('glass-strong')}
        style={{ width: '92%', maxWidth: MAX_WIDTH - 40, height: 68, borderRadius: 34, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, borderWidth: 1, borderColor: C.line2, backgroundColor: C.glass }}
      >
        {left.map(item)}
        <Press
          accessibilityLabel="Grill-Cam"
          accessibilityRole="tab"
          accessibilityState={{ selected: onLive }}
          scaleTo={0.9}
          onPress={() => {
            if (live && !onLive) navigateToTab(live.key);
          }}
          fxNames="dye-coal glow"
          style={{ width: 62, height: 62, borderRadius: 31, marginHorizontal: 2, marginTop: -26, backgroundColor: C.coal, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: onLive ? C.flame : C.bg }}
        >
          <View {...fx('flicker')}>
            <Icon name="flame" size={26} color="#FF6A2B" stroke={2} />
          </View>
          <View style={{ position: 'absolute', bottom: 7, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <LiveDot size={5} alert={!!active} color="#FF4B2B" />
            <Txt v="label" size={7.5} color="#FFF6EC" style={{ letterSpacing: 1 }}>
              LIVE
            </Txt>
          </View>
        </Press>
        {right.map(item)}
      </View>
    </View>
  );
}
