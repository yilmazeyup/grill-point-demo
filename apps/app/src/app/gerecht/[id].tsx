import { ALLERGEN_NAMES, COOK_AT, defaultPicks, dish, euro, findDish, STATION_NAMES, staff, unitPrice, type Dish, type OptionGroup, type Picks } from '@grill/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../../components/Icon';
import { Photo } from '../../components/Photo';
import { Backdrop, goBack } from '../../components/Screen';
import { useToast } from '../../components/Toast';
import { Button, Card, IconButton, Press, Row, Segments, Stepper, Tag, Txt } from '../../components/ui';
import { pairing } from '../../chef/brain';
import { tr } from '../../i18n';
import { fits } from '../../menu-fit';
import { useDemo, useSoldOut } from '../../state/demo';
import { Burger3D } from '../../three/Burger3D';
import { C, fx, MAX_WIDTH, PAD, R } from '../../theme';

/** One dish: the photo (or the burger in 3D, taken apart), what is in it, the choices, and into the basket. */
export default function DishScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = findDish(id ?? '') ?? dish('kapsalon');
  return <DishView key={d.id} d={d} />;
}

function DishView({ d }: { d: Dish }) {
  const insets = useSafeAreaInsets();
  const { add, addToTable, guest, toggleFavourite } = useDemo();
  const soldOut = useSoldOut();
  const toast = useToast();
  const [picks, setPicks] = useState<Picks>(() => defaultPicks(d));
  const [qty, setQty] = useState(1);
  const burger = d.cat === 'burgers';
  const [view, setView] = useState<'foto' | '3d'>(burger ? '3d' : 'foto');
  const out = soldOut.has(d.id);
  const atTable = guest.mode === 'tafel' && !!guest.table;
  const price = unitPrice(d, picks) * qty;
  const fav = guest.favourites.includes(d.id);
  const tip = pairing(d);
  const cook = staff(COOK_AT[d.station]);

  const set = (g: OptionGroup, choice: string) =>
    setPicks((p) => {
      if (g.pick === 'one') return { ...p, [g.id]: [choice] };
      const had = p[g.id] ?? [];
      return { ...p, [g.id]: had.includes(choice) ? had.filter((c) => c !== choice) : [...had, choice] };
    });

  const confirm = () => {
    if (atTable) for (let i = 0; i < qty; i++) addToTable(d.id, picks);
    else add(d.id, picks, qty);
    toast(`${tr(d.name)} ${tr(atTable ? 'staat op de tafelbestelling' : 'zit in je mandje')}`, { icon: 'check', text: atTable ? undefined : tr('Tik hier om af te rekenen'), onPress: atTable ? undefined : () => router.push('/mandje') });
    goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' }}>
          <View style={{ height: 420 + insets.top }}>
            {view === '3d' ? (
              <View {...fx('dye-coal')} style={{ flex: 1, backgroundColor: C.coal }}>
                <Burger3D kind={d.id as 'smash' | 'classic' | 'chicken'} style={{ flex: 1 }} />
                <View style={{ position: 'absolute', top: insets.top + 68, left: 0, right: 0, alignItems: 'center' }} pointerEvents="none">
                  <Txt v="label" color="#BFAE9F">
                    Sleep om te draaien · tik om uit elkaar te halen
                  </Txt>
                </View>
              </View>
            ) : (
              <Photo id={d.photo} style={{ flex: 1 }} dim={out} />
            )}
            <View {...fx('fade-b')} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 120, backgroundColor: 'rgba(17,12,10,0.35)' }} pointerEvents="none" />
            <Row style={{ position: 'absolute', top: insets.top + 12, left: PAD, right: PAD, justifyContent: 'space-between' }}>
              <IconButton name="close" label="Sluiten" onPress={goBack} />
              <IconButton name="heart" label={fav ? 'Uit favorieten' : 'Favoriet'} tint={fav ? C.flame : undefined} onPress={() => toggleFavourite(d.id)} />
            </Row>
            {burger ? (
              <View style={{ position: 'absolute', bottom: 12, left: PAD, right: PAD }}>
                <Segments
                  value={view}
                  onChange={setView}
                  options={[
                    { id: '3d', label: 'In 3D', icon: 'cube' },
                    { id: 'foto', label: 'Foto', icon: 'camera' },
                  ]}
                />
              </View>
            ) : null}
          </View>

          <View style={{ paddingHorizontal: PAD, paddingTop: 20, gap: 18 }}>
            <View style={{ gap: 6 }}>
              <Row gap={6} wrap>
                {out ? <Tag label="Uitverkocht vanavond" bg={C.flame} color="#FFF6EC" /> : null}
                {d.tags.map((t) => (
                  <Tag key={t} label={t === 'vega' ? 'Vegetarisch' : t === 'delen' ? 'Om te delen' : t.charAt(0).toUpperCase() + t.slice(1)} icon={t === 'pittig' ? 'chili' : t === 'vega' ? 'leaf' : t === 'favoriet' ? 'heart' : undefined} color={t === 'pittig' || t === 'favoriet' ? C.flame : t === 'vega' ? C.herb : C.soft} />
                ))}
              </Row>
              <Txt v="display">{d.name}</Txt>
              {d.tr ? (
                <Txt v="serif" color={C.muted}>
                  {d.tr}
                </Txt>
              ) : null}
              {d.desc ? (
                <Txt v="body" color={C.soft} style={{ marginTop: 4 }}>
                  {d.desc}
                </Txt>
              ) : null}
              {!fits(d, guest.diet) ? (
                <Row gap={8} style={{ marginTop: 6, padding: 10, borderRadius: R.sm, backgroundColor: C.bg2 }}>
                  <Icon name="shield" size={16} color={C.flame} />
                  <Txt v="small" color={C.flame} style={{ flex: 1 }}>
                    Past niet bij je dieet in de app. Kijk bij allergenen hieronder.
                  </Txt>
                </Row>
              ) : null}
            </View>

            {/* The AI chef's word on this dish. */}
            <Press onPress={() => router.push({ pathname: '/chef', params: { over: d.id } })} fxNames="grain" style={{ borderRadius: R.lg, padding: 14, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <View {...fx('dye-fire')} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: C.flame }}>
                <Icon name="chef" size={18} color="#FFF6EC" />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Txt v="label" color={C.flame}>
                  Usta, de AI-chef
                </Txt>
                <Txt v="small" color={C.ink}>
                  {tip}
                </Txt>
              </View>
            </Press>

            {(d.options ?? []).map((g) => (
              <View key={g.id} style={{ gap: 10 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Txt v="h2" size={17}>
                    {g.label}
                  </Txt>
                  <Txt v="label" color={C.muted}>
                    {g.pick === 'one' ? 'Kies één' : 'Optioneel'}
                  </Txt>
                </Row>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {g.choices.map((c) => {
                    const on = (picks[g.id] ?? []).includes(c.id);
                    return (
                      <Press
                        key={c.id}
                        onPress={() => set(g, c.id)}
                        scaleTo={0.94}
                        accessibilityState={{ selected: on }}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, minHeight: 42, paddingVertical: 8, borderRadius: R.md, borderWidth: 1.5, borderColor: on ? C.flame : C.line2, backgroundColor: on ? C.paper : 'transparent', maxWidth: '100%' }}
                      >
                        <View style={{ width: 16, height: 16, borderRadius: g.pick === 'one' ? 8 : 4, borderWidth: 1.5, borderColor: on ? C.flame : C.muted, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.flame : 'transparent' }}>
                          {on ? <Icon name="check" size={11} color="#FFF6EC" stroke={3} /> : null}
                        </View>
                        <Txt v="small" weight={on ? '700' : '500'} style={{ flexShrink: 1 }}>
                          {c.label}
                        </Txt>
                        {c.extra ? (
                          <Txt v="num" size={12} color={C.muted}>
                            {`+${euro(c.extra)}`}
                          </Txt>
                        ) : null}
                      </Press>
                    );
                  })}
                </View>
              </View>
            ))}

            <Card>
              <Row gap={12}>
                <Icon name="flame" size={22} color={C.flame} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt v="h3">{`${tr(STATION_NAMES[d.station])} · ${d.cook} min`}</Txt>
                  <Txt v="small" color={C.muted}>
                    {d.cook > 1 ? `${cook.name} maakt het. Kijk mee op de Grill-Cam zodra je besteld hebt.` : 'Direct klaar uit de koeling.'}
                  </Txt>
                </View>
              </Row>
              <View style={{ height: 1, backgroundColor: C.line, marginVertical: 14 }} />
              <Txt v="label" color={C.muted} style={{ marginBottom: 8 }}>
                Allergenen (indicatie)
              </Txt>
              <Row gap={6} wrap>
                {d.allergens.length ? d.allergens.map((a) => <Tag key={a} label={ALLERGEN_NAMES[a]} />) : <Txt v="small" color={C.muted}>Geen van de veertien hoofdallergenen bekend.</Txt>}
              </Row>
              <Txt v="small" size={12} color={C.muted} style={{ marginTop: 10 }}>
                Allergisch? Vraag het ons altijd even: in de keuken komt alles bij elkaar.
              </Txt>
            </Card>
          </View>
        </View>
        <View style={{ height: 130 + insets.bottom }} />
      </ScrollView>
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom + 14, paddingTop: 14, paddingHorizontal: PAD, alignItems: 'center' }}>
        <View {...fx('glass-strong')} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: C.glass, borderTopWidth: 1, borderColor: C.line }} />
        <Row gap={12} style={{ width: '100%', maxWidth: MAX_WIDTH - PAD * 2 }}>
          <Stepper value={qty} onChange={(n) => setQty(Math.max(1, n))} min={1} />
          <Button
            title={out ? 'Uitverkocht' : atTable ? 'Op de tafel' : 'In mandje'}
            sub={out ? undefined : euro(price)}
            icon={atTable ? 'table' : 'bag'}
            size="lg"
            disabled={out}
            onPress={confirm}
            style={{ flex: 1 }}
          />
        </Row>
      </View>
    </View>
  );
}
