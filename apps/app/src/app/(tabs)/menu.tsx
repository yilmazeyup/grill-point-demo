import { CATEGORIES, DISHES, euro, TAG_NAMES, type CategoryId, type Dish } from '@grill/shared';
import { router } from 'expo-router';
import { useMemo, useRef, useState, type ComponentRef } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../../components/Icon';
import { Photo } from '../../components/Photo';
import { Backdrop } from '../../components/Screen';
import { useToast } from '../../components/Toast';
import { Chip, Press, Row, Tag, Txt } from '../../components/ui';
import { tr } from '../../i18n';
import { fits } from '../../menu-fit';
import { useDemo, useSoldOut } from '../../state/demo';
import { C, FONT, fx, MAX_WIDTH, PAD, R } from '../../theme';

type Filter = 'halal' | 'pittig' | 'vega' | 'kids' | 'dieet';

/** The whole menu, by category, with a search, filters and "past bij mijn dieet". */
export default function Menu() {
  const insets = useSafeAreaInsets();
  const { guest, add, addToTable } = useDemo();
  const soldOut = useSoldOut();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filter[]>([]);
  const [cat, setCat] = useState<CategoryId>('grill');
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const offsets = useRef<Partial<Record<CategoryId, number>>>({});
  const atTable = guest.mode === 'tafel' && !!guest.table;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DISHES.filter((d) => {
      if (q && !`${d.name} ${tr(d.name)} ${d.tr ?? ''} ${d.desc ?? ''}`.toLowerCase().includes(q)) return false;
      for (const f of filters) {
        if (f === 'dieet' && !fits(d, guest.diet)) return false;
        if (f !== 'dieet' && !d.tags.includes(f)) return false;
      }
      return true;
    });
  }, [query, filters, guest.diet]);

  const toggle = (f: Filter) => setFilters((list) => (list.includes(f) ? list.filter((x) => x !== f) : [...list, f]));
  const jump = (id: CategoryId) => {
    setCat(id);
    const y = offsets.current[id];
    if (y !== undefined) scroll.current?.scrollTo({ y: y - 8, animated: true });
  };
  const quickAdd = (d: Dish) => {
    if (d.options?.length) {
      router.push(`/gerecht/${d.id}`);
      return;
    }
    if (atTable) addToTable(d.id, {});
    else add(d.id, {});
    toast(`${tr(d.name)} ${tr(atTable ? 'staat op de tafelbestelling' : 'zit in je mandje')}`, { icon: 'check' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      <View style={{ paddingTop: insets.top + 14, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' }}>
        <View style={{ paddingHorizontal: PAD, gap: 12 }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View>
              <Txt v="label" color={C.flame}>
                {atTable ? `Tafel ${guest.table!.n} · samen bestellen` : 'Grill-Point · Valkenswaard'}
              </Txt>
              <Txt v="display">Menu</Txt>
            </View>
            <Press onPress={() => router.push('/chef')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 36, borderRadius: 18, backgroundColor: C.bg2, borderWidth: 1, borderColor: C.line }}>
              <Icon name="sparkle" size={15} color={C.flame} />
              <Txt v="small" weight="700">
                Vraag Usta
              </Txt>
            </Press>
          </Row>
          <Row gap={8} style={{ height: 46, borderRadius: R.pill, paddingHorizontal: 16, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line }}>
            <Icon name="search" size={18} color={C.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={tr('Zoek kapsalon, adana, sucuk…')}
              placeholderTextColor={C.muted}
              style={[{ flex: 1, height: 44, color: C.ink, fontFamily: FONT.sans, fontSize: 15 }, { outlineStyle: 'none' } as object]}
            />
            {query ? (
              <Press onPress={() => setQuery('')} accessibilityLabel="Wissen">
                <Icon name="close" size={16} color={C.muted} />
              </Press>
            ) : null}
          </Row>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: PAD, gap: 8, paddingVertical: 12 }}>
          <Chip small label="Past bij mijn dieet" icon="shield" on={filters.includes('dieet')} onPress={() => toggle('dieet')} />
          <Chip small label={TAG_NAMES.halal} on={filters.includes('halal')} onPress={() => toggle('halal')} />
          <Chip small label={TAG_NAMES.pittig} icon="chili" on={filters.includes('pittig')} onPress={() => toggle('pittig')} />
          <Chip small label={TAG_NAMES.vega} icon="leaf" on={filters.includes('vega')} onPress={() => toggle('vega')} />
          <Chip small label={TAG_NAMES.kids} on={filters.includes('kids')} onPress={() => toggle('kids')} />
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderBottomWidth: 1, borderColor: C.line }} contentContainerStyle={{ paddingHorizontal: PAD, gap: 22 }}>
          {CATEGORIES.map((c) => {
            const on = c.id === cat;
            return (
              <Press key={c.id} onPress={() => jump(c.id)} scaleTo={0.94} style={{ paddingVertical: 10, borderBottomWidth: 2.5, borderColor: on ? C.flame : 'transparent' }}>
                <Txt v="title" size={17} color={on ? C.ink : C.muted}>
                  {c.short}
                </Txt>
              </Press>
            );
          })}
        </ScrollView>
      </View>
      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={64}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y + 40;
          let current: CategoryId = 'grill';
          for (const c of CATEGORIES) if ((offsets.current[c.id] ?? Infinity) <= y) current = c.id;
          if (current !== cat) setCat(current);
        }}
      >
        <View style={{ width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingHorizontal: PAD, paddingTop: 10 }}>
          {CATEGORIES.map((c) => {
            const list = shown.filter((d) => d.cat === c.id);
            if (!list.length) return null;
            const big = c.id === 'grill' || c.id === 'burgers';
            const compact = c.id === 'drinks' || c.id === 'sauzen';
            return (
              <View
                key={c.id}
                onLayout={(e) => {
                  offsets.current[c.id] = e.nativeEvent.layout.y;
                }}
                style={{ paddingTop: 22, gap: 12 }}
              >
                <View style={{ gap: 2 }}>
                  <Txt v="title">{c.name}</Txt>
                  <Txt v="serif" size={16} color={C.soft}>
                    {c.line}
                  </Txt>
                </View>
                {compact ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {list.map((d) => (
                      <Press
                        key={d.id}
                        onPress={() => quickAdd(d)}
                        disabled={soldOut.has(d.id)}
                        scaleTo={0.94}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 14, paddingRight: 6, height: 40, borderRadius: R.pill, borderWidth: 1, borderColor: C.line2, backgroundColor: C.paper }}
                      >
                        <Txt v="small" weight="600">
                          {d.name}
                        </Txt>
                        <Txt v="num" size={12} color={C.muted}>
                          {euro(d.price)}
                        </Txt>
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name="plus" size={14} color={C.bg} stroke={2.4} />
                        </View>
                      </Press>
                    ))}
                  </View>
                ) : big ? (
                  list.map((d) => <BigDish key={d.id} d={d} out={soldOut.has(d.id)} onAdd={() => quickAdd(d)} dim={filters.length > 0 && !fits(d, guest.diet) && filters.includes('dieet')} />)
                ) : (
                  list.map((d) => <DishRow key={d.id} d={d} out={soldOut.has(d.id)} onAdd={() => quickAdd(d)} />)
                )}
              </View>
            );
          })}
          {!shown.length ? (
            <View style={{ paddingVertical: 60, alignItems: 'center', gap: 10 }}>
              <Icon name="search" size={30} color={C.muted} />
              <Txt v="body" color={C.muted} align="center">
                Niets gevonden. Vraag het Usta, de AI-chef.
              </Txt>
            </View>
          ) : null}
        </View>
        <View style={{ height: 170 + insets.bottom }} />
      </ScrollView>
    </View>
  );
}

function AddButton({ onPress, out }: { onPress: () => void; out?: boolean }) {
  return (
    <Press onPress={onPress} disabled={out} scaleTo={0.85} accessibilityLabel="Toevoegen" fxNames={out ? '' : 'dye-fire'} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: out ? C.bg2 : C.flame, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="plus" size={18} color={out ? C.muted : '#FFF6EC'} stroke={2.4} />
    </Press>
  );
}

function Tags({ d, out }: { d: Dish; out?: boolean }) {
  return (
    <Row gap={6} wrap>
      {out ? <Tag label="Uitverkocht vanavond" bg={C.flame} color="#FFF6EC" /> : null}
      {d.tags.includes('favoriet') ? <Tag label="Favoriet" icon="heart" color={C.flame} /> : null}
      {d.tags.includes('nieuw') ? <Tag label="Nieuw" color={C.gold} /> : null}
      {d.tags.includes('pittig') ? <Tag label="Pittig" icon="chili" color={C.flame} /> : null}
      {d.tags.includes('vega') ? <Tag label="Vega" icon="leaf" color={C.herb} /> : null}
      {d.tags.includes('halal') ? <Tag label="Halal" /> : null}
    </Row>
  );
}

function BigDish({ d, out, onAdd, dim }: { d: Dish; out: boolean; onAdd: () => void; dim?: boolean }) {
  return (
    <Press accessibilityRole="none" onPress={() => router.push(`/gerecht/${d.id}`)} fxNames="lift grain" style={{ borderRadius: R.lg, overflow: 'hidden', backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, opacity: dim ? 0.45 : 1 }}>
      <Photo id={d.photo} style={{ height: 190 }} dim={out} />
      <View style={{ padding: 16, gap: 8 }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt v="title" size={24}>
              {d.name}
            </Txt>
            {d.tr ? (
              <Txt v="serif" size={15} color={C.muted}>
                {d.tr}
              </Txt>
            ) : null}
          </View>
          <Txt v="price" color={C.flame}>
            {`${d.options?.some((g) => g.id === 'maat' || g.id === 'vorm') ? 'v.a. ' : ''}${euro(d.price)}`}
          </Txt>
        </Row>
        {d.desc ? (
          <Txt v="small" color={C.soft} numberOfLines={2}>
            {d.desc}
          </Txt>
        ) : null}
        <Row style={{ justifyContent: 'space-between' }}>
          <Tags d={d} out={out} />
          <AddButton onPress={onAdd} out={out} />
        </Row>
      </View>
    </Press>
  );
}

function DishRow({ d, out, onAdd }: { d: Dish; out: boolean; onAdd: () => void }) {
  return (
    <Press accessibilityRole="none" onPress={() => router.push(`/gerecht/${d.id}`)} style={{ flexDirection: 'row', gap: 14, paddingVertical: 6 }}>
      <Photo id={d.photo} style={{ width: 96, height: 96, borderRadius: R.md }} dim={out} />
      <View style={{ flex: 1, gap: 4, justifyContent: 'center' }}>
        <Txt v="h3" numberOfLines={1}>
          {d.name}
        </Txt>
        {d.desc ? (
          <Txt v="small" size={12.5} color={C.muted} numberOfLines={2}>
            {d.desc}
          </Txt>
        ) : null}
        <Row style={{ justifyContent: 'space-between', marginTop: 2 }}>
          <Row gap={8}>
            <Txt v="price" size={18}>
              {euro(d.price)}
            </Txt>
            {out ? <Tag label="Uitverkocht" bg={C.flame} color="#FFF6EC" /> : d.tags.includes('pittig') ? <Icon name="chili" size={14} color={C.flame} /> : null}
          </Row>
          <View {...fx('')}>
            <AddButton onPress={onAdd} out={out} />
          </View>
        </Row>
      </View>
    </Press>
  );
}
