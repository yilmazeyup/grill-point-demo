import { AREAS, dish, euro, levelOf, lineTotal, picksLabel, pointsFor, promise, RESTAURANT, type Mode } from '@grill/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Icon, type IconName } from '../components/Icon';
import { Photo } from '../components/Photo';
import { Screen } from '../components/Screen';
import { useToast } from '../components/Toast';
import { Button, Card, Chip, DemoNote, Press, Row, Segments, Stepper, Txt } from '../components/ui';
import { tr } from '../i18n';
import { useDemo } from '../state/demo';
import { C, fx, R } from '../theme';

const PAY: { id: string; label: string; icon: IconName }[] = [
  { id: 'ideal', label: 'iDEAL | Wero', icon: 'card' },
  { id: 'contant', label: 'Contant', icon: 'cash' },
];

/**
 * The basket and checkout, the way Grill-Point's own site works (delivery or pickup, a tip of 10, 15 or 20 %, iDEAL |
 * Wero or cash), plus "Vuur aan bij aankomst": for pickup, the kitchen lights the grill when you are close.
 */
export default function Basket() {
  const { guest, setQty, setMode, setArea, place, evening, now, cartTotal } = useDemo();
  const toast = useToast();
  const [tip, setTip] = useState(0);
  const [pay, setPay] = useState('ideal');
  const [arrive, setArrive] = useState<number | null>(null);
  const area = AREAS.find((a) => a.id === guest.area) ?? AREAS[0];
  const p = promise(evening, now.getTime(), area.ride);
  const mode: Mode = guest.mode === 'tafel' && !guest.table ? 'bezorgen' : guest.mode;
  const tipAmount = Math.round(cartTotal * tip) / 100;
  const total = cartTotal + tipAmount;
  const points = pointsFor(cartTotal);
  const after = levelOf(guest.points + points);

  if (!guest.cart.length) {
    return (
      <Screen back title="Je mandje" serif="Nog leeg, maar de grill is heet.">
        <Button title="Naar het menu" icon="book" onPress={() => router.replace('/menu')} />
        <Button title="Vraag Usta wat je moet nemen" icon="sparkle" kind="line" onPress={() => router.push('/chef')} />
      </Screen>
    );
  }

  const order = () => {
    const o = place({ arrive: mode === 'afhalen' && arrive ? arrive : undefined, tip, pay });
    toast(`${tr('Bestelling')} ${o.number} ${tr('is binnen')}`, { icon: 'flame', text: tr('Kijk live mee hoe hij op het vuur gaat') });
    router.replace('/live');
  };

  return (
    <Screen
      back
      kicker={`${guest.cart.reduce((s, l) => s + l.qty, 0)} ${tr('items')}`}
      title="Je mandje"
      footer={<Button title={mode === 'bezorgen' ? 'Bestel en bezorg' : 'Bestel en haal af'} sub={euro(total)} icon="flame" size="lg" full onPress={order} />}
    >
      <Card pad={6}>
        {guest.cart.map((l, i) => {
          const d = dish(l.dish);
          return (
            <View key={l.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderTopWidth: i ? 1 : 0, borderColor: C.line }}>
              <Photo id={d.photo} style={{ width: 56, height: 56, borderRadius: 12 }} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt v="h3" size={15} numberOfLines={1}>
                  {d.name}
                </Txt>
                {picksLabel(d, l.picks) ? (
                  <Txt v="small" size={12} color={C.muted} numberOfLines={2}>
                    {picksLabel(d, l.picks)}
                  </Txt>
                ) : null}
                <Txt v="num" size={13} color={C.flame}>
                  {euro(lineTotal(l))}
                </Txt>
              </View>
              <Stepper value={l.qty} onChange={(n) => setQty(l.key, n)} />
            </View>
          );
        })}
      </Card>

      <Segments
        value={mode === 'tafel' ? 'bezorgen' : mode}
        onChange={(m) => setMode(m)}
        options={[
          { id: 'bezorgen', label: 'Bezorgen', icon: 'scooter' },
          { id: 'afhalen', label: 'Afhalen', icon: 'bag' },
        ]}
      />

      {mode === 'bezorgen' ? (
        <Card>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt v="label" color={C.muted}>
                Bezorgen in
              </Txt>
              <Txt v="h3">{`${area.name}, Valkenswaard`}</Txt>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Txt v="price" size={24} fire>
                {`${p.door} min`}
              </Txt>
              <Txt v="label" size={9} color={C.muted}>
                eerlijke schatting
              </Txt>
            </View>
          </Row>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
            {AREAS.map((a) => (
              <Chip key={a.id} small label={a.name} on={a.id === guest.area} onPress={() => setArea(a.id)} />
            ))}
          </View>
        </Card>
      ) : (
        <Card>
          <Row gap={12} style={{ alignItems: 'flex-start' }}>
            <View {...fx('dye-fire')} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: C.flame }}>
              <Icon name="flame" size={20} color="#FFF6EC" />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Txt v="h3">Vuur aan bij aankomst</Txt>
              <Txt v="small" color={C.muted}>
                {`De keuken legt je bestelling pas op de grill als je onderweg bent, zodat hij heet en krokant is als je binnenloopt aan de ${RESTAURANT.street}.`}
              </Txt>
            </View>
          </Row>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
            <Chip small label={`Zo snel mogelijk · ${p.ready} min`} on={arrive === null} onPress={() => setArrive(null)} />
            {[10, 15, 20, 30].map((m) => (
              <Chip key={m} small label={`Ik ben er over ${m} min`} on={arrive === m} onPress={() => setArrive(m)} />
            ))}
          </View>
        </Card>
      )}

      <View style={{ gap: 10 }}>
        <Txt v="label" color={C.muted}>
          Fooi voor het team
        </Txt>
        <Row gap={8}>
          {[0, ...RESTAURANT.tips].map((t) => (
            <Press key={t} onPress={() => setTip(t)} scaleTo={0.94} style={{ flex: 1, height: 46, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: tip === t ? C.flame : C.line2, backgroundColor: tip === t ? C.paper : 'transparent' }}>
              <Txt v="h3" size={14} color={tip === t ? C.flame : C.soft}>
                {t ? `${t}%` : 'Geen'}
              </Txt>
            </Press>
          ))}
        </Row>
      </View>

      <View style={{ gap: 10 }}>
        <Txt v="label" color={C.muted}>
          Betalen
        </Txt>
        <Row gap={8}>
          {PAY.map((m) => (
            <Press key={m.id} onPress={() => setPay(m.id)} scaleTo={0.95} style={{ flex: 1, height: 54, borderRadius: R.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: pay === m.id ? C.flame : C.line2, backgroundColor: pay === m.id ? C.paper : 'transparent' }}>
              <Icon name={m.icon} size={19} color={pay === m.id ? C.flame : C.soft} />
              <Txt v="h3" size={14} color={pay === m.id ? C.ink : C.soft}>
                {m.label}
              </Txt>
            </Press>
          ))}
        </Row>
      </View>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="body" color={C.soft}>
            Subtotaal
          </Txt>
          <Txt v="num">{euro(cartTotal)}</Txt>
        </Row>
        {tipAmount ? (
          <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
            <Txt v="body" color={C.soft}>
              Fooi
            </Txt>
            <Txt v="num">{euro(tipAmount)}</Txt>
          </Row>
        ) : null}
        <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
          <Txt v="body" color={C.soft}>
            Transactiekosten
          </Txt>
          <Txt v="num">{euro(0)}</Txt>
        </Row>
        <View style={{ height: 1, backgroundColor: C.line, marginVertical: 12 }} />
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="h2">Totaal</Txt>
          <Txt v="price" size={26}>
            {euro(total)}
          </Txt>
        </Row>
        <Row gap={8} style={{ marginTop: 12 }}>
          <Icon name="flame" size={16} color={C.gold} />
          <Txt v="small" color={C.gold} style={{ flex: 1 }}>
            {`+${points} vuurpunten${after.level.id !== levelOf(guest.points).level.id ? ` · je wordt ${after.level.name}!` : ''}`}
          </Txt>
        </Row>
      </Card>
      <DemoNote text="Dit is een demo: er wordt niets betaald of echt besteld. Je bestelling gaat wel live naar het keukenscherm van de demo." />
    </Screen>
  );
}
