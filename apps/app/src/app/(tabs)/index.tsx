import { clock, dish, euro, minuteOf, moments, promise, RESTAURANT, rushCurve, type Dish } from '@grill/shared';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '../../components/Icon';
import { Logo } from '../../components/Logo';
import { Photo } from '../../components/Photo';
import { Backdrop } from '../../components/Screen';
import { Bar, Button, Card, IconButton, LiveDot, Press, Row, SectionHead, Tag, Txt } from '../../components/ui';
import { useDemo, useLevel } from '../../state/demo';
import { useTheme } from '../../state/theme';
import { HeroGrill } from '../../three/HeroGrill';
import { C, fx, MAX_WIDTH, PAD, R } from '../../theme';

const FAVOURITES = ['kapsalon', 'smash', 'mix-grill', 'durum', 'lahmacun-doner', 'pizza-sucuk', 'adana', 'hotwings'];

export default function Home() {
  const insets = useSafeAreaInsets();
  const { now, evening, guest, live, mine } = useDemo();
  const { mode, choose } = useTheme();
  const t = now.getTime();
  const p = promise(evening, t);
  const level = useLevel();
  const feed = useMemo(() => moments(now).filter((m) => m.at <= t).reverse(), [now, t]);
  const curve = useMemo(() => rushCurve(evening, now), [evening, now]);
  const peak = Math.max(...curve.map((c) => c.count));
  const minute = minuteOf(now);
  const busy = p.load > 0.66 ? 'Druk' : p.load > 0.33 ? 'Gezellig druk' : 'Rustig';
  const active = mine.find((o) => o.done > t);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' }}>
          {/* ------------------------------------------------------------------ hero */}
          <View style={{ height: 600 + insets.top }}>
            <HeroGrill style={{ position: 'absolute', left: 0, right: 0, top: 120 + insets.top, height: 420 }} />
            <View style={{ paddingTop: insets.top + 12, paddingHorizontal: PAD }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Logo stacked={false} size={0.9} />
                <Row gap={8}>
                  <IconButton
                    name={mode === 'night' ? 'sun' : 'moon'}
                    label={mode === 'night' ? 'Dag' : 'Nacht'}
                    onPress={() => choose(mode === 'night' ? 'day' : 'night', { x: 9999, y: 0 })}
                  />
                  <IconButton name="chef" label="AI-chef" onPress={() => router.push('/chef')} />
                </Row>
              </Row>
              <View style={{ marginTop: 26, gap: 6 }} pointerEvents="none">
                <Row gap={8}>
                  <LiveDot />
                  <Txt v="label" color={C.soft}>
                    {live ? `Open tot 00:00 · ${busy}` : `Demo-avond · ${clock(now)} · ${busy}`}
                  </Txt>
                </Row>
                <Txt v="mega" size={84}>
                  Vers van
                </Txt>
                <Txt v="mega" size={84} fire style={{ marginTop: -6 }}>
                  het vuur
                </Txt>
                <Txt v="serif" size={19} color={C.soft} style={{ maxWidth: 300, marginTop: 4, textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 10 }}>
                  Döner, houtskoolgrill en pizza aan de Willibrorduslaan
                </Txt>
              </View>
            </View>
            <View style={{ position: 'absolute', left: PAD, right: PAD, bottom: 18, gap: 10 }}>
              <Row gap={10}>
                <Button title="Bestel nu" icon="bag" size="lg" onPress={() => router.push('/menu')} style={{ flex: 1 }} />
                <Button title="Kijk live mee" icon="video" kind="ink" size="lg" onPress={() => router.push('/live')} style={{ flex: 1 }} />
              </Row>
              <Card glass pad={12} radius={R.md}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Promise label="Bezorgd in" value={`${p.door} min`} />
                  <View style={{ width: 1, height: 30, backgroundColor: C.line }} />
                  <Promise label="Afhalen" value={`${p.ready} min`} />
                  <View style={{ width: 1, height: 30, backgroundColor: C.line }} />
                  <Promise label="Google" value={`${String(RESTAURANT.rating).replace('.', ',')} ★`} />
                </Row>
              </Card>
            </View>
          </View>

          {/* ------------------------------------------------------------------ your order, live */}
          {active ? (
            <View style={{ paddingHorizontal: PAD, marginBottom: 18 }}>
              <Press onPress={() => router.push('/live')} fxNames="dye-coal glow" style={{ borderRadius: R.lg, padding: 16, backgroundColor: C.coal, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View {...fx('pulse-red')} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FF4B2B', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="video" size={22} color="#FFF6EC" />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt v="label" color="#F2B04A">
                    {`Bestelling ${active.number}`}
                  </Txt>
                  <Txt v="h3" color="#F6EBDD">
                    Je eten ligt op het vuur: kijk live mee
                  </Txt>
                </View>
                <Icon name="chevron" size={20} color="#F6EBDD" />
              </Press>
            </View>
          ) : null}

          {/* ------------------------------------------------------------------ kitchen moments */}
          <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.line, paddingVertical: 12, overflow: 'hidden' }}>
            <View {...fx('marquee')} style={{ flexDirection: 'row' }}>
              {[0, 1].map((copy) => (
                <Row key={copy} gap={28} style={{ paddingRight: 28 }}>
                  {(feed.length ? feed : moments(now).slice(0, 4)).slice(0, 6).map((m) => (
                    <Row key={`${copy}-${m.at}`} gap={8}>
                      <Icon name="flame" size={14} color={C.flame} />
                      <Txt v="num" size={12} color={C.muted}>
                        {clock(new Date(m.at))}
                      </Txt>
                      <Txt v="small" weight="600" color={C.ink}>
                        {m.text}
                      </Txt>
                    </Row>
                  ))}
                </Row>
              ))}
            </View>
          </View>

          <View style={{ paddingHorizontal: PAD, paddingTop: 26, gap: 30 }}>
            {/* ---------------------------------------------------------------- four doors */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <Door icon="video" title="Grill-Cam" line="Zie je eigen bestelling op het vuur" to="/live" hot />
              <Door icon="chef" title="AI-chef Usta" line="Vraag wat je vanavond moet eten" to="/chef" />
              <Door icon="qr" title="Aan tafel" line="Scan, bestel samen, roep de chef" to="/tafel" />
              <Door icon="skewer" title="Draai de spies" line="Wie betaalt er vanavond?" to="/spies" />
            </View>

            {/* ---------------------------------------------------------------- favourites */}
            <View>
              <SectionHead kicker="Favorieten" title="Wat Valkenswaard bestelt" action="Menu" onAction={() => router.push('/menu')} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -PAD }} contentContainerStyle={{ paddingHorizontal: PAD, gap: 12 }}>
                {FAVOURITES.map((id) => (
                  <Favourite key={id} d={dish(id)} />
                ))}
              </ScrollView>
            </View>

            {/* ---------------------------------------------------------------- mix grill, chef at the table */}
            <Press onPress={() => router.push('/gerecht/mix-grill')} fxNames="lift" style={{ borderRadius: R.xl, overflow: 'hidden', height: 380, backgroundColor: C.coal }}>
              <Photo id="mix-grill" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
              <View {...fx('shade')} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
              <View style={{ position: 'absolute', top: 16, left: 16 }}>
                <Tag label="Om te delen · 2 personen" bg="#FFF6EC" color="#1C1410" />
              </View>
              <View style={{ position: 'absolute', left: 20, right: 20, bottom: 20, gap: 6 }}>
                <Txt v="display" color="#FFF6EC">
                  Mix Grill
                </Txt>
                <Txt v="serif" size={18} color="#F2DCC6">
                  Adana, köfte, vleugels, kipfilet şiş en pirzola
                </Txt>
                <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
                  <Row gap={8}>
                    <Icon name="chef" size={18} color="#F2B04A" />
                    <Txt v="small" weight="600" color="#F6EBDD">
                      Aan tafel snijdt Kerem hem voor je aan
                    </Txt>
                  </Row>
                  <Txt v="price" color="#FFF6EC">
                    {euro(35)}
                  </Txt>
                </Row>
              </View>
            </Press>

            {/* ---------------------------------------------------------------- rush */}
            <Card>
              <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ gap: 2, flex: 1 }}>
                  <Txt v="label" color={C.flame}>
                    Druktemeter
                  </Txt>
                  <Txt v="title" size={26}>
                    {busy}
                  </Txt>
                  <Txt v="small" color={C.muted}>
                    Eerlijke tijden: we rekenen met de bonnen die nu op de grill liggen.
                  </Txt>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Txt v="price" size={30} fire>
                    {`${p.door}′`}
                  </Txt>
                  <Txt v="label" color={C.muted} size={9}>
                    tot je deur
                  </Txt>
                </View>
              </Row>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 70, gap: 3, marginTop: 16 }}>
                {curve.map((c) => {
                  const nowSlot = minute >= c.minute && minute < c.minute + 30;
                  return <View key={c.minute} {...fx(nowSlot ? 'dye-fire' : '')} style={{ flex: 1, height: `${Math.max(6, (c.count / peak) * 100)}%`, borderRadius: 3, backgroundColor: nowSlot ? C.flame : minute > c.minute ? C.line2 : C.bg2 }} />;
                })}
              </View>
              <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
                {['15:00', '18:00', '21:00', '00:00'].map((h) => (
                  <Txt key={h} v="num" size={10} color={C.muted}>
                    {h}
                  </Txt>
                ))}
              </Row>
            </Card>

            {/* ---------------------------------------------------------------- vuurpunten */}
            <Press onPress={() => router.push('/punten')} fxNames="lift">
              <Card coal>
                <Row gap={14}>
                  <View {...fx('flicker')}>
                    <Icon name="flame" size={44} color="#FF6A2B" stroke={1.6} />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Txt v="label" color="#F2B04A">
                      {`Vuurpunten · ${level.level.name}`}
                    </Txt>
                    <Txt v="h2" color="#F6EBDD">
                      {`${guest.points} punten`}
                    </Txt>
                    <Bar value={level.progress} style={{ marginTop: 4 }} />
                    {level.next ? (
                      <Txt v="small" color="#BFAE9F">
                        {`Nog ${level.next.from - guest.points} tot ${level.next.name}`}
                      </Txt>
                    ) : null}
                  </View>
                  <Icon name="chevron" size={18} color="#F6EBDD" />
                </Row>
              </Card>
            </Press>

            {/* ---------------------------------------------------------------- the place */}
            <View>
              <SectionHead kicker="Grill-Point" title="Willibrorduslaan 47" />
              <Card pad={0}>
                <Photo id="__storefront" style={{ height: 210 }} />
                <View style={{ padding: 18, gap: 12 }}>
                  <Row gap={10}>
                    <Icon name="clock" size={18} color={C.flame} />
                    <Txt v="body" style={{ flex: 1 }}>
                      Elke dag van 15:00 tot 00:00
                    </Txt>
                  </Row>
                  <Row gap={10}>
                    <Icon name="pin" size={18} color={C.flame} />
                    <Txt v="body" style={{ flex: 1 }}>
                      {`${RESTAURANT.street}, ${RESTAURANT.postcode} ${RESTAURANT.city}`}
                    </Txt>
                  </Row>
                  <Row gap={10}>
                    <Icon name="star" size={18} color={C.flame} />
                    <Txt v="body" style={{ flex: 1 }}>
                      {`${String(RESTAURANT.rating).replace('.', ',')} op Google, uit ${RESTAURANT.reviews} reviews`}
                    </Txt>
                  </Row>
                  <Txt v="small" color={C.muted}>
                    Gasten noemen vaak de kapsalon met kipfilet, de smash burger en de vriendelijke bezorger.
                  </Txt>
                  <Button title="Alles over Grill-Point" kind="line" after="arrow" onPress={() => router.push('/info')} />
                </View>
              </Card>
            </View>
          </View>
        </View>
        <View style={{ height: 150 + insets.bottom }} />
      </ScrollView>
    </View>
  );
}

function Promise({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 1 }}>
      <Txt v="label" size={9} color={C.muted}>
        {label}
      </Txt>
      <Txt v="price" size={20}>
        {value}
      </Txt>
    </View>
  );
}

function Door({ icon, title, line, to, hot }: { icon: IconName; title: string; line: string; to: string; hot?: boolean }) {
  return (
    <Press
      onPress={() => router.push(to as never)}
      fxNames={`lift ${hot ? 'dye-fire glow' : 'grain'}`}
      style={{ width: '48.4%', minHeight: 132, borderRadius: R.lg, padding: 16, justifyContent: 'space-between', backgroundColor: hot ? C.flame : C.paper, borderWidth: hot ? 0 : 1, borderColor: C.line }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: hot ? 'rgba(255,246,236,0.18)' : C.bg2 }}>
        <Icon name={icon} size={21} color={hot ? '#FFF6EC' : C.flame} />
      </View>
      <View style={{ gap: 2 }}>
        <Txt v="title" size={21} color={hot ? '#FFF6EC' : C.ink}>
          {title}
        </Txt>
        <Txt v="small" size={12.5} color={hot ? '#FFE3CF' : C.muted}>
          {line}
        </Txt>
      </View>
    </Press>
  );
}

function Favourite({ d }: { d: Dish }) {
  return (
    <Press onPress={() => router.push(`/gerecht/${d.id}`)} fxNames="lift" style={{ width: 176 }}>
      <Photo id={d.photo} style={{ width: 176, height: 200, borderRadius: R.lg }} />
      <View style={{ paddingTop: 10, gap: 2 }}>
        <Txt v="h3" numberOfLines={1}>
          {d.name}
        </Txt>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="small" color={C.muted} numberOfLines={1} style={{ flex: 1 }}>
            {d.tr ?? (d.tags.includes('halal') ? 'Halal' : '')}
          </Txt>
          <Txt v="price" size={18} color={C.flame}>
            {euro(d.price)}
          </Txt>
        </Row>
      </View>
    </Press>
  );
}
