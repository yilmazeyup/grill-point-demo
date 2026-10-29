import { LEVELS, levelOf, REWARDS } from '@grill/shared';
import { View } from 'react-native';

import { Icon } from '../components/Icon';
import { Flame } from '../components/Logo';
import { Screen } from '../components/Screen';
import { useToast } from '../components/Toast';
import { Bar, Button, Card, DemoNote, Row, Txt } from '../components/ui';
import { tr } from '../i18n';
import { useDemo } from '../state/demo';
import { C, fx, R } from '../theme';

/**
 * Vuurpunten: Grill-Point's own savings programme (welcome discount, points, VIP invitations, a birthday gift), shown
 * as a flame that grows with every euro.
 */
export default function Points() {
  const { guest, spend } = useDemo();
  const toast = useToast();
  const { level, next, progress } = levelOf(guest.points);
  const index = LEVELS.indexOf(level);
  const size = 120 + index * 34 + progress * 30;
  return (
    <Screen back kicker="Vuurpunten" title={`${guest.points} punten`} serif={`Je vuur is nu: ${tr(level.name)}`}>
      <View {...fx('dye-coal')} style={{ height: 300, borderRadius: R.xl, backgroundColor: C.coal, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden', paddingBottom: 30 }}>
        <View style={[{ position: 'absolute', width: 340, height: 340, borderRadius: 170, bottom: -120 }, { backgroundImage: 'radial-gradient(closest-side, rgba(255,90,30,.45), rgba(255,90,30,0))' } as object]} />
        <View {...fx('flicker')}>
          <Flame size={size} id="points" />
        </View>
        <Txt v="label" color="#F2B04A" style={{ marginTop: 10 }}>
          {next ? `${next.from - guest.points} ${tr('punten tot')} ${tr(next.name)}` : tr('Hoogste vuur bereikt')}
        </Txt>
      </View>
      <Bar value={progress} height={8} />
      <Card>
        {LEVELS.map((l, i) => (
          <Row key={l.id} gap={12} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: C.line, opacity: i <= index ? 1 : 0.55 }}>
            <View {...fx(i <= index ? 'dye-fire' : '')} style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: i <= index ? C.flame : C.bg2 }}>
              <Icon name={i <= index ? 'flame' : 'lock'} size={16} color={i <= index ? '#FFF6EC' : C.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt v="h3">{`${tr(l.name)} · ${l.from}+`}</Txt>
              <Txt v="small" color={C.muted}>
                {l.perk}
              </Txt>
            </View>
          </Row>
        ))}
      </Card>
      <Txt v="title" size={24}>
        Inwisselen
      </Txt>
      {REWARDS.map((r) => (
        <Card key={r.id} pad={14}>
          <Row gap={12}>
            <Icon name="gift" size={22} color={C.gold} />
            <View style={{ flex: 1 }}>
              <Txt v="h3">{r.name}</Txt>
              <Txt v="num" size={12} color={C.muted}>
                {`${r.cost} ${tr('punten')}`}
              </Txt>
            </View>
            <Button
              title="Inwisselen"
              size="sm"
              kind={guest.points >= r.cost ? 'fire' : 'soft'}
              disabled={guest.points < r.cost}
              onPress={() => {
                spend(r.cost);
                toast(tr('Ingewisseld'), { icon: 'gift', text: tr('Je beloning staat klaar bij je volgende bestelling') });
              }}
            />
          </Row>
        </Card>
      ))}
      <Card coal>
        <Row gap={12}>
          <Icon name="cake" size={26} color="#F2B04A" />
          <View style={{ flex: 1 }}>
            <Txt v="h3" color="#F6EBDD">
              Op je verjaardag
            </Txt>
            <Txt v="small" color="#BFAE9F">
              Een cadeautje van Grill-Point: baklava met een sterretje erin, aan tafel of in je bezorgtas.
            </Txt>
          </View>
        </Row>
      </Card>
      <DemoNote text="Grill-Point heeft een spaarprogramma met welkomstkorting, punten, VIP-uitnodigingen en een verjaardagscadeau. De niveaus en beloningen hier zijn voor de demo bedacht." />
    </Screen>
  );
}
