import { cameraFor, clock, countdown, dish, euro, openOrders, picksLabel, rng, STATION_NAMES, stageAt, staff, COOK_AT, type Order, type Stage, type Station } from '@grill/shared';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CameraFeed } from '../../components/CameraFeed';
import { Icon } from '../../components/Icon';
import { Backdrop } from '../../components/Screen';
import { useToast } from '../../components/Toast';
import { Button, Card, Chip, DemoNote, LiveDot, Press, Row, Segments, Txt } from '../../components/ui';
import { tr } from '../../i18n';
import { useDemo } from '../../state/demo';
import { DeliveryMap } from '../../three/DeliveryMap';
import { GrillCam } from '../../three/GrillCam';
import type { SkewerKind } from '../../three/kitchen';
import { C, fx, MAX_WIDTH, PAD, R } from '../../theme';

const CAM_ORDER: Station[] = ['grill', 'spit', 'oven', 'plancha', 'pass'];
const CAM_NAMES: Record<Station, string> = { grill: 'CAM 1 · GRILL', spit: 'CAM 2 · DÖNER', oven: 'CAM 3 · OVEN', plancha: 'CAM 4 · BAKPLAAT', fryer: 'CAM 4 · BAKPLAAT', pass: 'CAM 5 · UITGIFTE', cold: 'CAM 5 · UITGIFTE' };

const KIND: Record<string, SkewerKind> = { adana: 'adana', kofte: 'kofte', 'kip-sis': 'sis', kippenvleugels: 'vleugel', pirzola: 'pirzola', 'mix-grill': 'adana' };

/** The dish on an order that the camera follows: the one that takes longest on the fire. */
function mainLine(o: Order) {
  return [...o.lines].sort((a, b) => dish(b.dish).cook - dish(a.dish).cook)[0];
}

const STEPS: { id: Stage; label: string }[] = [
  { id: 'nieuw', label: 'Ontvangen' },
  { id: 'vuur', label: 'Op het vuur' },
  { id: 'klaar', label: 'Klaar' },
  { id: 'onderweg', label: 'Onderweg' },
  { id: 'bezorgd', label: 'Bezorgd' },
];

/**
 * The Grill-Cam. After ordering, the guest watches their own food being made: the camera hangs over the station that is
 * cooking it, their item glows with their name, and the ticket hangs on the rail. Then the courier rides home on a 3D
 * map. Without an order, the kitchen is live anyway, with tonight's tickets.
 */
export default function Live() {
  const insets = useSafeAreaInsets();
  const { mine, now, evening, guest, markRated, send, cameras } = useDemo();
  const toast = useToast();
  const t = now.getTime();
  const active = mine.find((o) => o.done > t - 15 * 60000);
  const stage = active ? stageAt(active, t) : null;
  const [manual, setManual] = useState<Station | null>(null);
  const [auto, setAuto] = useState(0);
  const [cheers, setCheers] = useState(0);
  const [view, setView] = useState<'camera' | '3d'>('camera');
  useEffect(() => {
    const id = setInterval(() => setAuto((n) => n + 1), 7000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => setManual(null), [stage]);

  const tickets = useMemo(
    () =>
      openOrders(evening, t)
        .filter((o) => stageAt(o, t) === 'vuur' || stageAt(o, t) === 'nieuw')
        .map((o) => o.number)
        .slice(0, 9),
    [evening, Math.floor(t / 30000)], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const viewers = 3 + Math.floor(rng(Math.floor(t / 20000))() * 11);

  const line = active ? mainLine(active) : null;
  const d = line ? dish(line.dish) : null;
  const station: Station = (() => {
    if (manual) return manual;
    if (!active || !d) return CAM_ORDER[auto % CAM_ORDER.length];
    if (stage === 'vuur') return d.station === 'fryer' ? 'plancha' : d.station === 'cold' ? 'pass' : d.station;
    return 'pass';
  })();
  const cookProgress = active ? Math.max(0, Math.min(1, (t - active.fire) / (active.ready - active.fire))) : 0;
  const kind: SkewerKind | 'spit' | 'pizza' | 'burger' = d ? (KIND[d.id] ?? (d.station === 'spit' ? 'spit' : d.station === 'oven' ? 'pizza' : 'burger')) : 'adana';
  const label = active && d ? `${active.number} · ${guest.name}: ${tr(d.name)}` : '';
  const cook = d ? staff(COOK_AT[d.station]) : null;
  const delivering = active && stage === 'onderweg';
  // The real camera over that station when one is connected; the 3D kitchen otherwise, or when the guest picks it.
  const feed = cameras[cameraFor(station)];
  const anyCamera = Object.values(cameras).some(Boolean);
  const showFeed = !!feed && view === 'camera';
  const finished = active && (stage === 'bezorgd' || stage === 'afgehaald' || stage === 'gegeten');
  const steps = active?.mode === 'afhalen' ? STEPS.filter((s) => s.id !== 'onderweg').map((s) => (s.id === 'bezorgd' ? { id: 'afgehaald' as Stage, label: 'Afgehaald' } : s)) : STEPS;
  const at = steps.findIndex((s) => s.id === stage);
  const caption = (() => {
    if (!active || !d || !cook) return 'De keuken van Grill-Point, nu';
    if (stage === 'nieuw') return `Je bon komt binnen bij ${staff('sevda').name}`;
    if (stage === 'vuur') return `${cook.name} maakt je ${tr(d.name)} · ${tr(STATION_NAMES[d.station])}`;
    if (stage === 'klaar') return active.mode === 'bezorgen' ? `${staff('sevda').name} pakt je bestelling in` : 'Klaar! Je kunt hem ophalen';
    return '';
  })();
  const nextAt = active ? (stage === 'nieuw' ? active.fire : stage === 'vuur' ? active.ready : stage === 'klaar' ? (active.out ?? active.done) : active.done) : 0;
  const rated = active ? guest.rated.includes(active.id) : false;

  const rate = (stars: number) => {
    if (!active) return;
    send({ kind: 'review', at: t, stars, text: '', order: active.id, guest: guest.name });
    markRated(active.id);
    toast(stars >= 4 ? 'Dank je! Het team ziet je sterren' : 'Dank je, we gaan ermee aan de slag', { icon: 'star' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' }}>
          {/* ------------------------------------------------------------------ the feed */}
          <View style={{ height: 470 + insets.top, backgroundColor: '#0D0907' }}>
            {delivering && active.area ? (
              <DeliveryMap area={active.area} courier={staff(active.courier ?? 'joep').name} progress={(t - (active.out ?? active.ready)) / (active.done - (active.out ?? active.ready))} style={{ flex: 1 }} />
            ) : showFeed ? (
              <CameraFeed key={`${station}-${feed}`} url={feed!} station={cameraFor(station)} style={{ flex: 1 }} />
            ) : (
              <GrillCam station={station} mine={active && stage === 'vuur' ? { label, kind, cook: cookProgress } : null} tickets={tickets} style={{ flex: 1 }} />
            )}
            {showFeed && active && stage === 'vuur' ? (
              <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + 56, left: 0, right: 0, alignItems: 'center' }}>
                <View style={{ backgroundColor: '#FFB04A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 }}>
                  <Txt v="small" weight="700" color="#1C1410">
                    {label}
                  </Txt>
                </View>
              </View>
            ) : null}
            {!delivering ? <View {...fx('cctv')} pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} /> : null}
            <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + 14, left: PAD, right: PAD, flexDirection: 'row', justifyContent: 'space-between' }}>
              <Row gap={8} style={{ backgroundColor: 'rgba(13,9,7,0.6)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                <LiveDot alert size={7} />
                <Txt v="label" color="#FFF6EC" size={10}>
                  {delivering ? `LIVE · ${tr('ONDERWEG')}` : `${showFeed ? 'LIVE' : '3D'} · ${tr(CAM_NAMES[station])}`}
                </Txt>
              </Row>
              <Row gap={8} style={{ backgroundColor: 'rgba(13,9,7,0.6)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                <Icon name="users" size={13} color="#FFF6EC" />
                <Txt v="num" size={11} color="#FFF6EC">
                  {`${viewers}`}
                </Txt>
                <Txt v="num" size={11} color="#BFAE9F">
                  {`${clock(now)}:${String(now.getSeconds()).padStart(2, '0')}`}
                </Txt>
              </Row>
            </View>
            {caption ? (
              <View pointerEvents="none" style={{ position: 'absolute', left: PAD, right: PAD, bottom: 16 }}>
                <Txt v="h3" color="#FFF6EC" style={{ textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 8 }}>
                  {caption}
                </Txt>
              </View>
            ) : null}
            {cheers ? (
              <View pointerEvents="none" key={cheers} {...fx('rise')} style={{ position: 'absolute', right: 28, bottom: 70 }}>
                <Icon name="flame" size={42} color="#FF6A2B" />
              </View>
            ) : null}
          </View>

          {!delivering && feed ? (
            <View style={{ paddingHorizontal: PAD, paddingTop: 12 }}>
              <Segments
                value={view}
                onChange={setView}
                options={[
                  { id: 'camera', label: 'Camerabeeld', icon: 'video' },
                  { id: '3d', label: '3D-keuken', icon: 'cube' },
                ]}
              />
            </View>
          ) : null}
          {!delivering ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: PAD, gap: 8, paddingVertical: 12 }}>
              {CAM_ORDER.map((s) => (
                <Chip key={s} small label={CAM_NAMES[s].split(' · ')[1]} on={station === s} icon={cameras[cameraFor(s)] ? 'video' : 'cube'} onPress={() => setManual(s)} />
              ))}
            </ScrollView>
          ) : null}

          <View style={{ paddingHorizontal: PAD, paddingTop: delivering ? 18 : 4, gap: 18 }}>
            {active ? (
              <>
                <Card>
                  <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ gap: 2, flex: 1 }}>
                      <Txt v="label" color={C.flame}>
                        {`Bestelling ${active.number} · ${active.mode === 'bezorgen' ? tr('Bezorgen') : tr('Afhalen')}`}
                      </Txt>
                      <Txt v="title" size={26}>
                        {finished ? (active.mode === 'bezorgen' ? 'Eet smakelijk!' : 'Opgehaald, eet smakelijk!') : (steps[at]?.label ?? 'Ontvangen')}
                      </Txt>
                    </View>
                    {!finished ? (
                      <View style={{ alignItems: 'flex-end' }}>
                        <Txt v="price" size={30} fire>
                          {countdown(nextAt - t)}
                        </Txt>
                        <Txt v="label" size={9} color={C.muted}>
                          {stage === 'onderweg' ? 'tot je deur' : 'tot de volgende stap'}
                        </Txt>
                      </View>
                    ) : null}
                  </Row>
                  <Row gap={4} style={{ marginTop: 16 }}>
                    {steps.map((s, i) => (
                      <View key={s.id} style={{ flex: 1, gap: 6 }}>
                        <View {...fx(i <= at ? 'dye-fire' : '')} style={{ height: 5, borderRadius: 3, backgroundColor: i <= at ? C.flame : C.line }} />
                        <Txt v="label" size={8.5} color={i <= at ? C.ink : C.muted} numberOfLines={1}>
                          {s.label}
                        </Txt>
                      </View>
                    ))}
                  </Row>
                  <View style={{ height: 1, backgroundColor: C.line, marginVertical: 14 }} />
                  {active.lines.map((l) => (
                    <Row key={l.key} style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
                      <Txt v="small" style={{ flex: 1 }} numberOfLines={1}>
                        {`${l.qty}× ${tr(dish(l.dish).name)}${picksLabel(dish(l.dish), l.picks) ? ` · ${picksLabel(dish(l.dish), l.picks)}` : ''}`}
                      </Txt>
                      <Txt v="num" size={12} color={C.muted}>
                        {euro(dish(l.dish).price * l.qty)}
                      </Txt>
                    </Row>
                  ))}
                </Card>

                {stage === 'vuur' ? (
                  <Press onPress={() => { setCheers((n) => n + 1); toast(`${cook?.name ?? 'Kerem'} ${tr('ziet je vuurtje op het keukenscherm')}`, { icon: 'flame' }); }} fxNames="grain" style={{ borderRadius: R.lg, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line }}>
                    <Icon name="flame" size={22} color={C.flame} />
                    <Txt v="h3" style={{ flex: 1 }}>
                      Stuur de keuken een vuurtje
                    </Txt>
                    <Icon name="send" size={18} color={C.muted} />
                  </Press>
                ) : null}

                {finished ? (
                  <Card>
                    <Txt v="h2">Hoe was het?</Txt>
                    {!rated ? (
                      <Row gap={6} style={{ marginTop: 12 }}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Press key={n} onPress={() => rate(n)} scaleTo={0.8} accessibilityLabel={`${n} sterren`} style={{ flex: 1, height: 52, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg2 }}>
                            <Icon name="starFill" size={24} color={C.gold} />
                          </Press>
                        ))}
                      </Row>
                    ) : (
                      <Txt v="small" color={C.muted} style={{ marginTop: 6 }}>
                        Bedankt voor je sterren. Deel je bord met je vrienden of zet een review op Google.
                      </Txt>
                    )}
                    <Row gap={8} style={{ marginTop: 14 }}>
                      <Button title="Deel je bord" icon="instagram" size="sm" onPress={() => router.push({ pathname: '/deel', params: { order: active.id } })} />
                      <Button title="Review op Google" icon="star" kind="line" size="sm" onPress={() => router.push('/info')} />
                    </Row>
                  </Card>
                ) : null}
                <DemoNote text={anyCamera ? 'In de demo gaat alles sneller: een minuut in de keuken duurt hier twintig seconden. Waar een camera hangt zie je het echte beeld; elders de 3D-keuken.' : 'In de demo gaat alles sneller: een minuut in de keuken duurt hier twintig seconden. Zodra de camera’s boven de grill hangen, zie je hier het echte beeld; tot dan toont de Grill-Cam de 3D-keuken.'} />
              </>
            ) : (
              <>
                <View style={{ gap: 6 }}>
                  <Txt v="label" color={C.flame}>
                    Grill-Cam
                  </Txt>
                  <Txt v="display">Kijk mee in de keuken</Txt>
                  <Txt v="serif" color={C.soft}>
                    {`${tickets.length} bonnen op het vuur. Bestel, en je ziet je eigen eten op de grill, met je naam erbij.`}
                  </Txt>
                </View>
                <Button title="Bestel en kijk mee" icon="flame" size="lg" full onPress={() => router.push('/menu')} />
                <DemoNote text={anyCamera ? 'Waar een camera hangt zie je het echte beeld uit de keuken; bij de andere stations de 3D-keuken.' : 'Zodra de camera’s boven de grill hangen, zie je hier het echte beeld. Tot dan toont de Grill-Cam een 3D-keuken die meeloopt met de bestellingen van vanavond.'} />
              </>
            )}
          </View>
        </View>
        <View style={{ height: 150 + insets.bottom }} />
      </ScrollView>
    </View>
  );
}
