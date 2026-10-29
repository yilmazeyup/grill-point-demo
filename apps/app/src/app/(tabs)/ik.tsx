import { clock, dateShort, dish, euro, getLocale, LOCALE_NAMES, LOCALES, minuteOf, resetBridge, stageAt, STAGE_NAMES, sunsetMinute, atMinute } from '@grill/shared';
import { router } from 'expo-router';
import { View } from 'react-native';

import { Icon, type IconName } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { useToast } from '../../components/Toast';
import { Bar, Button, Card, Chip, Press, Row, Segments, Txt } from '../../components/ui';
import { chooseLocale, tr } from '../../i18n';
import { useDemo, useLevel } from '../../state/demo';
import { useTheme } from '../../state/theme';
import { C, fx, R } from '../../theme';

function Item({ icon, title, line, to }: { icon: IconName; title: string; line: string; to: string }) {
  return (
    <Press onPress={() => router.push(to as never)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.bg2, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={19} color={C.flame} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt v="h3">{title}</Txt>
        <Txt v="small" color={C.muted}>
          {line}
        </Txt>
      </View>
      <Icon name="chevron" size={17} color={C.muted} />
    </Press>
  );
}

/** The guest: points, orders, diet, the look of the app and its language, and a way to start the demo over. */
export default function Me() {
  const { guest, mine, now, add, reset } = useDemo();
  const { choice, choose, mode } = useTheme();
  const level = useLevel();
  const toast = useToast();
  const sunset = clock(atMinute(now, sunsetMinute(now)));
  const t = now.getTime();

  return (
    <Screen tabs kicker="Ik" title={guest.name} serif="Vaste gast van de grill">
      <Press onPress={() => router.push('/punten')} fxNames="lift">
        <Card coal>
          <Row gap={14}>
            <View {...fx('flicker')}>
              <Icon name="flame" size={40} color="#FF6A2B" />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Txt v="label" color="#F2B04A">
                {`Vuurpunten · ${tr(level.level.name)}`}
              </Txt>
              <Txt v="price" size={28} color="#F6EBDD">
                {`${guest.points}`}
              </Txt>
              <Bar value={level.progress} />
            </View>
            <Icon name="chevron" size={18} color="#F6EBDD" />
          </Row>
        </Card>
      </Press>

      <View>
        <Txt v="title" size={22} style={{ marginBottom: 8 }}>
          Mijn bestellingen
        </Txt>
        {mine.length ? (
          mine.slice(0, 5).map((o) => {
            const s = stageAt(o, t);
            return (
              <Card key={o.id} pad={14} style={{ marginBottom: 8 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Txt v="label" color={C.muted}>
                      {`${o.number} · ${dateShort(new Date(o.placed))} ${clock(new Date(o.placed))}`}
                    </Txt>
                    <Txt v="h3" numberOfLines={1}>
                      {o.lines.map((l) => `${l.qty}× ${tr(dish(l.dish).name)}`).join(', ')}
                    </Txt>
                    <Txt v="small" color={s === 'bezorgd' || s === 'afgehaald' || s === 'gegeten' ? C.muted : C.flame}>
                      {`${tr(s ? STAGE_NAMES[s] : 'Gepland')} · ${euro(o.total)}`}
                    </Txt>
                  </View>
                  <Button
                    title="Nog eens"
                    size="sm"
                    kind="line"
                    onPress={() => {
                      o.lines.forEach((l) => add(l.dish, l.picks, l.qty));
                      toast(tr('In je mandje gezet'), { icon: 'bag', onPress: () => router.push('/mandje') });
                    }}
                  />
                </Row>
              </Card>
            );
          })
        ) : (
          <Txt v="small" color={C.muted}>
            Nog niets besteld in de app. Je eerste bestelling kijk je live mee op de Grill-Cam.
          </Txt>
        )}
      </View>

      <Card pad={8}>
        <View style={{ paddingHorizontal: 10 }}>
          <Item icon="shield" title="Mijn dieet" line={guest.diet.avoid.length || guest.diet.halal || guest.diet.vega || guest.diet.mild ? 'Ingesteld' : 'Halal, vegetarisch, allergenen'} to="/dieet" />
          <Item icon="cube" title="Reserveer een tafel" line="Kies je plek in 3D" to="/reserveer" />
          <Item icon="instagram" title="Deel je bord" line="Een story van je bestelling" to="/deel" />
          <Item icon="chef" title="Vraag Usta" line="De AI-chef, in jouw taal" to="/chef" />
          <Item icon="info" title="Over Grill-Point" line="Adres, tijden, contact, Google" to="/info" />
        </View>
      </Card>

      <View style={{ gap: 10 }}>
        <Txt v="label" color={C.muted}>
          Weergave
        </Txt>
        <Segments
          value={choice}
          onChange={(c) => choose(c, { x: 200, y: 600 })}
          options={[
            { id: 'auto', label: 'Auto', icon: 'flame' },
            { id: 'day', label: 'Dag', icon: 'sun' },
            { id: 'night', label: 'Nacht', icon: 'moon' },
          ]}
        />
        <Txt v="small" color={C.muted}>
          {choice === 'auto'
            ? `${tr('Overdag crème, na zonsondergang kool en gloed. Vandaag gaat de zon in Valkenswaard onder om')} ${sunset}${minuteOf(now) >= sunsetMinute(now) ? '' : ''}.`
            : mode === 'night'
              ? 'Kool en gloed, de hele dag.'
              : 'Crème, de hele dag.'}
        </Txt>
      </View>

      <View style={{ gap: 10 }}>
        <Txt v="label" color={C.muted}>
          Taal
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {LOCALES.map((l) => (
            <Chip key={l} small label={LOCALE_NAMES[l]} on={getLocale() === l} onPress={() => chooseLocale(l)} />
          ))}
        </View>
      </View>

      <Press
        onPress={() => {
          resetBridge();
          reset();
          toast(tr('De demo begint opnieuw'), { icon: 'rotate' });
        }}
        style={{ alignSelf: 'center', padding: 12, borderRadius: R.md }}
      >
        <Txt v="small" color={C.muted}>
          Demo opnieuw beginnen
        </Txt>
      </Press>
    </Screen>
  );
}
