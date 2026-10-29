import * as Haptics from 'expo-haptics';
import { useEffect, useRef, type PropsWithChildren, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Platform,
  Pressable,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { localize, rtl } from '../i18n';
import { C, FONT, fx, isWeb, R, web } from '../theme';
import { Icon, type IconName } from './Icon';

export const nativeDriver = Platform.OS !== 'web';

let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled()
  .then((on) => {
    reduceMotion = on;
  })
  .catch(() => {});
export const prefersReducedMotion = () => reduceMotion;

export function tap(kind: 'light' | 'medium' | 'success' | 'select' = 'light') {
  if (isWeb) return;
  if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else if (kind === 'select') Haptics.selectionAsync().catch(() => {});
  else Haptics.impactAsync(kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

// ---------------------------------------------------------------------------------------------------------- text

export type Variant = 'mega' | 'hero' | 'display' | 'title' | 'h2' | 'h3' | 'body' | 'small' | 'label' | 'num' | 'serif' | 'price';

const VARIANTS: Record<Variant, TextStyle> = {
  mega: { fontFamily: FONT.display, fontWeight: '900', fontSize: 92, lineHeight: 82, letterSpacing: -1, textTransform: 'uppercase' },
  hero: { fontFamily: FONT.display, fontWeight: '900', fontSize: 60, lineHeight: 56, letterSpacing: -0.5, textTransform: 'uppercase' },
  display: { fontFamily: FONT.display, fontWeight: '800', fontSize: 42, lineHeight: 42, letterSpacing: -0.2, textTransform: 'uppercase' },
  title: { fontFamily: FONT.display, fontWeight: '800', fontSize: 30, lineHeight: 31, letterSpacing: 0, textTransform: 'uppercase' },
  serif: { fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: '400', fontSize: 22, lineHeight: 27, letterSpacing: -0.3 },
  h2: { fontFamily: FONT.sans, fontWeight: '700', fontSize: 20, lineHeight: 25, letterSpacing: -0.4 },
  h3: { fontFamily: FONT.sans, fontWeight: '600', fontSize: 16, lineHeight: 21, letterSpacing: -0.2 },
  body: { fontFamily: FONT.sans, fontWeight: '400', fontSize: 15, lineHeight: 22 },
  small: { fontFamily: FONT.sans, fontWeight: '400', fontSize: 13, lineHeight: 18 },
  label: { fontFamily: FONT.mono, fontWeight: '500', fontSize: 10.5, lineHeight: 14, letterSpacing: 1.4, textTransform: 'uppercase' },
  num: { fontFamily: FONT.mono, fontWeight: '500', fontSize: 14, lineHeight: 18 },
  price: { fontFamily: FONT.display, fontWeight: '800', fontSize: 22, lineHeight: 24, letterSpacing: 0.2 },
};

type TxtProps = TextProps & {
  v?: Variant;
  color?: string;
  align?: TextStyle['textAlign'];
  /** Fills the letters with fire on the web. */
  fire?: boolean;
  weight?: TextStyle['fontWeight'];
  size?: number;
};

/** Arabic letters join up; spacing them out would break the script, and it has no capitals. */
const JOINED: TextStyle = { letterSpacing: 0, textTransform: 'none' };

export function Txt({ v = 'body', color = C.ink, align, fire, weight, size, style, children, ...rest }: TxtProps) {
  const base = VARIANTS[v];
  const sized: TextStyle | null = size ? { fontSize: size, lineHeight: Math.round(size * ((base.lineHeight as number) / (base.fontSize as number))) } : null;
  const names = [fire ? 'ink-fire' : '', v === 'num' || v === 'price' ? 'tabular' : '', v === 'hero' || v === 'display' || v === 'title' || v === 'mega' ? 'balance' : ''].filter(Boolean).join(' ');
  return (
    <Text
      {...rest}
      {...fx(names)}
      style={[base, sized, { color: fire && !isWeb ? '#FF6A2B' : color }, align ? { textAlign: align } : null, weight ? { fontWeight: weight } : null, style, rtl() ? JOINED : null]}
    >
      {localize(children)}
    </Text>
  );
}

// ---------------------------------------------------------------------------------------------------------- press

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressProps = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  scaleTo?: number;
  haptic?: boolean;
  fxNames?: string;
};

/** Anything tappable: it gives under the finger and springs back. */
export function Press({ style, children, scaleTo = 0.965, haptic = true, onPressIn, onPressOut, onPress, fxNames = '', disabled, ...rest }: PressProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (value: number) =>
    Animated.spring(scale, { toValue: value, useNativeDriver: nativeDriver, stiffness: value === 1 ? 300 : 520, damping: value === 1 ? 11 : 30, mass: 0.8 }).start();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      {...rest}
      {...fx(`pointer nosel ${fxNames}`)}
      disabled={disabled}
      onPressIn={(e) => {
        if (!reduceMotion) to(scaleTo);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(1);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) tap();
        onPress?.(e);
      }}
      style={[style, { transform: [{ scale }] }, disabled ? { opacity: 0.45 } : null]}
    >
      {children}
    </AnimatedPressable>
  );
}

// ---------------------------------------------------------------------------------------------------------- surfaces

type CardProps = PropsWithChildren<{ style?: StyleProp<ViewStyle>; pad?: number; radius?: number; glass?: boolean; coal?: boolean }>;

/** A sheet of paper in the cream look, a slab of charcoal at night. */
export function Card({ style, pad = 18, radius = R.lg, glass, coal, children }: CardProps) {
  return (
    <View
      {...fx(['grain', glass ? 'glass' : '', coal ? 'dye-coal' : ''].filter(Boolean).join(' '))}
      style={[{ borderRadius: radius, padding: pad, borderWidth: 1, borderColor: C.line, backgroundColor: coal ? C.coal : C.paper, overflow: 'hidden' }, style]}
    >
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------------------------------------- buttons

type ButtonProps = {
  title: string;
  onPress?: () => void;
  icon?: IconName;
  after?: IconName;
  kind?: 'fire' | 'ink' | 'line' | 'ghost' | 'soft';
  size?: 'lg' | 'md' | 'sm';
  full?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  label?: string;
  sub?: string;
};

export function Button({ title, onPress, icon, after, kind = 'fire', size = 'md', full, disabled, style, label, sub }: ButtonProps) {
  const h = size === 'lg' ? 60 : size === 'md' ? 50 : 38;
  const color = kind === 'fire' ? C.onFlame : kind === 'ink' ? C.bg : C.ink;
  const bg: ViewStyle =
    kind === 'fire'
      ? { backgroundColor: C.flame }
      : kind === 'ink'
        ? { backgroundColor: C.ink }
        : kind === 'line'
          ? { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.line2 }
          : kind === 'soft'
            ? { backgroundColor: C.bg2 }
            : { backgroundColor: 'transparent' };
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label ?? title}
      fxNames={kind === 'fire' ? 'dye-fire sheen glow' : ''}
      style={[
        {
          height: h,
          paddingHorizontal: size === 'sm' ? 14 : 22,
          borderRadius: R.pill,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          alignSelf: full ? 'stretch' : 'flex-start',
        },
        bg,
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 19} color={color} stroke={2} /> : null}
      <Txt v="h3" color={color} size={size === 'lg' ? 17 : size === 'md' ? 15.5 : 13.5} weight="700">
        {title}
      </Txt>
      {sub ? (
        <Txt v="num" color={color} size={size === 'lg' ? 15 : 13} style={{ opacity: 0.85 }}>
          {sub}
        </Txt>
      ) : null}
      {after ? <Icon name={after} size={size === 'sm' ? 15 : 18} color={color} stroke={2} /> : null}
    </Press>
  );
}

/** A round icon button on glass, for headers. */
export function IconButton({ name, onPress, label, size = 44, tint, solid }: { name: IconName; onPress?: () => void; label: string; size?: number; tint?: string; solid?: boolean }) {
  return (
    <Press
      onPress={onPress}
      accessibilityLabel={label}
      fxNames={solid ? '' : 'glass'}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: C.line,
        backgroundColor: solid ? C.paper : C.glass,
      }}
    >
      <Icon name={name} size={size * 0.45} color={tint ?? C.ink} />
    </Press>
  );
}

// ---------------------------------------------------------------------------------------------------------- small parts

export function Chip({ label, on, onPress, icon, small }: { label: string; on?: boolean; onPress?: () => void; icon?: IconName; small?: boolean }) {
  return (
    <Press
      onPress={onPress}
      scaleTo={0.93}
      accessibilityState={{ selected: !!on }}
      style={{
        height: small ? 32 : 38,
        paddingHorizontal: small ? 12 : 15,
        borderRadius: R.pill,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: on ? C.ink : C.line2,
        backgroundColor: on ? C.ink : 'transparent',
      }}
    >
      {icon ? <Icon name={icon} size={small ? 13 : 15} color={on ? C.bg : C.soft} /> : null}
      <Txt v="small" size={small ? 12.5 : 13} weight="600" color={on ? C.bg : C.soft}>
        {label}
      </Txt>
    </Press>
  );
}

export function Tag({ label, color = C.soft, bg = C.bg2, icon, style }: { label: string; color?: string; bg?: string; icon?: IconName; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: bg }, style]}>
      {icon ? <Icon name={icon} size={11} color={color} stroke={2} /> : null}
      <Txt v="label" color={color} size={9.5} style={{ letterSpacing: 1 }}>
        {label}
      </Txt>
    </View>
  );
}

/** A small status light: green while open or live, red for alerts. */
export function LiveDot({ color = C.ok, alert, size = 8 }: { color?: string; alert?: boolean; size?: number }) {
  return <View {...fx(alert ? 'pulse-red' : 'pulse')} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: alert ? C.flame : color }} />;
}

export function SectionHead({ kicker, title, action, onAction, serif }: { kicker?: string; title: string; action?: string; onAction?: () => void; serif?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
      <View style={{ flex: 1, gap: 4 }}>
        {kicker ? (
          <Txt v="label" color={C.flame}>
            {kicker}
          </Txt>
        ) : null}
        <Txt v="title">{title}</Txt>
        {serif ? (
          <Txt v="serif" size={17} color={C.soft}>
            {serif}
          </Txt>
        ) : null}
      </View>
      {action ? (
        <Press onPress={onAction} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 }}>
          <Txt v="small" weight="600" color={C.soft}>
            {action}
          </Txt>
          <Icon name="arrow" size={15} color={C.soft} />
        </Press>
      ) : null}
    </View>
  );
}

export function Row({ children, gap = 10, style, wrap }: PropsWithChildren<{ gap?: number; style?: StyleProp<ViewStyle>; wrap?: boolean }>) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}

export const Divider = ({ style }: { style?: StyleProp<ViewStyle> }) => <View style={[{ height: 1, backgroundColor: C.line, marginVertical: 14 }, style]} />;

/** A labelled number, like "Bezorging 32 min". */
export function Stat({ label, value, sub, color = C.ink }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <View style={{ gap: 2, flex: 1 }}>
      <Txt v="label" color={C.muted} size={9.5}>
        {label}
      </Txt>
      <Txt v="price" size={26} color={color}>
        {value}
      </Txt>
      {sub ? (
        <Txt v="small" size={12} color={C.muted}>
          {sub}
        </Txt>
      ) : null}
    </View>
  );
}

/** A thin bar, filled to `value` (0 to 1), in fire. */
export function Bar({ value, height = 6, style, color }: { value: number; height?: number; style?: StyleProp<ViewStyle>; color?: string }) {
  return (
    <View style={[{ height, borderRadius: height, backgroundColor: C.line, overflow: 'hidden' }, style]}>
      <View
        {...fx(color ? '' : 'dye-fire')}
        style={[{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height, borderRadius: height, backgroundColor: color ?? C.flame }, web({ transition: 'width .6s cubic-bezier(.2,.9,.25,1)' })]}
      />
    </View>
  );
}

/** Note for anything that would really happen in a live app: here it is only a demo. */
export function DemoNote({ text }: { text: string }) {
  return (
    <Row gap={8} style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: R.sm, backgroundColor: C.bg2, alignItems: 'flex-start' }}>
      <Icon name="info" size={15} color={C.muted} />
      <Txt v="small" color={C.muted} style={{ flex: 1 }}>
        {text}
      </Txt>
    </Row>
  );
}

/** Pops its content in once: it rises a little and settles with a soft overshoot. */
export function PopIn({ delay = 0, children, style }: PropsWithChildren<{ delay?: number; style?: StyleProp<ViewStyle> }>) {
  const progress = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion) return;
    const animation = Animated.spring(progress, { toValue: 1, delay, stiffness: 170, damping: 16, mass: 0.9, useNativeDriver: nativeDriver });
    animation.start();
    return () => animation.stop();
  }, [progress, delay]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** − 1 + for a quantity. */
export function Stepper({ value, onChange, min = 0 }: { value: number; onChange: (n: number) => void; min?: number }) {
  return (
    <Row gap={2} style={{ borderRadius: R.pill, borderWidth: 1, borderColor: C.line2, padding: 3 }}>
      <Press onPress={() => onChange(Math.max(min, value - 1))} scaleTo={0.85} accessibilityLabel="Minder" style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={value <= 1 && min === 0 ? 'trash' : 'minus'} size={16} color={C.ink} />
      </Press>
      <Txt v="num" size={15} style={{ minWidth: 22, textAlign: 'center' }}>
        {value}
      </Txt>
      <Press onPress={() => onChange(value + 1)} scaleTo={0.85} accessibilityLabel="Meer" style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: C.ink }}>
        <Icon name="plus" size={16} color={C.bg} stroke={2.2} />
      </Press>
    </Row>
  );
}

/** A segmented switch of two to four choices. */
export function Segments<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string; icon?: IconName }[]; onChange: (id: T) => void }) {
  return (
    <Row gap={4} style={{ padding: 4, borderRadius: R.pill, backgroundColor: C.bg2, borderWidth: 1, borderColor: C.line }}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Press
            key={o.id}
            onPress={() => onChange(o.id)}
            scaleTo={0.95}
            accessibilityState={{ selected: on }}
            style={{ flex: 1, height: 40, borderRadius: R.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: on ? C.ink : 'transparent' }}
          >
            {o.icon ? <Icon name={o.icon} size={16} color={on ? C.bg : C.soft} /> : null}
            <Txt v="small" weight="700" color={on ? C.bg : C.soft} numberOfLines={1}>
              {o.label}
            </Txt>
          </Press>
        );
      })}
    </Row>
  );
}
