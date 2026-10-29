import { RESTAURANT } from '@grill/shared';
import { Linking, View } from 'react-native';

import { Icon, type IconName } from '../components/Icon';
import { Photo } from '../components/Photo';
import { Screen } from '../components/Screen';
import { Button, Card, DemoNote, Press, Row, Txt } from '../components/ui';
import { C, R } from '../theme';

const DAYS = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];

function Line({ icon, text, onPress }: { icon: IconName; text: string; onPress?: () => void }) {
  return (
    <Press onPress={onPress} disabled={!onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
      <Icon name={icon} size={19} color={C.flame} />
      <Txt v="body" style={{ flex: 1 }}>
        {text}
      </Txt>
      {onPress ? <Icon name="arrow" size={16} color={C.muted} /> : null}
    </Press>
  );
}

/** Everything Grill-Point says about itself: where, when, how to reach it, how to pay. */
export default function Info() {
  return (
    <Screen back kicker={RESTAURANT.kind} title="Grill-Point" serif="Döner, houtskoolgrill en pizza in Valkenswaard.">
      <Photo id="__storefront" style={{ height: 240, borderRadius: R.xl }} />
      <Card>
        <Line icon="pin" text={`${RESTAURANT.street}, ${RESTAURANT.postcode} ${RESTAURANT.city}`} onPress={() => Linking.openURL(RESTAURANT.maps)} />
        <Line icon="phone" text={RESTAURANT.phone} onPress={() => Linking.openURL(RESTAURANT.phoneHref)} />
        <Line icon="mail" text={RESTAURANT.email} onPress={() => Linking.openURL(`mailto:${RESTAURANT.email}`)} />
        <Line icon="instagram" text={`@${RESTAURANT.instagram}`} onPress={() => Linking.openURL(RESTAURANT.instagramUrl)} />
        <Line icon="globe" text="grill-point.nl" onPress={() => Linking.openURL(RESTAURANT.site)} />
      </Card>
      <Card>
        <Txt v="h2" style={{ marginBottom: 6 }}>
          Openingstijden
        </Txt>
        {DAYS.map((d) => (
          <Row key={d} style={{ justifyContent: 'space-between', paddingVertical: 6 }}>
            <Txt v="body" color={C.soft}>
              {d}
            </Txt>
            <Txt v="num">15:00 – 00:00</Txt>
          </Row>
        ))}
      </Card>
      <Card>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <Txt v="label" color={C.muted}>
              Google
            </Txt>
            <Txt v="hero" size={52}>
              {String(RESTAURANT.rating).replace('.', ',')}
            </Txt>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Row gap={2}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Icon key={i} name="starFill" size={18} color={C.gold} />
              ))}
            </Row>
            <Txt v="small" color={C.muted}>
              {`${RESTAURANT.reviews} reviews`}
            </Txt>
          </View>
        </Row>
        <Button title="Schrijf een review" icon="star" kind="line" size="sm" onPress={() => Linking.openURL(RESTAURANT.maps)} style={{ marginTop: 12 }} />
      </Card>
      <Card>
        <Txt v="h2">Betalen en bestellen</Txt>
        <Txt v="body" color={C.soft} style={{ marginTop: 6 }}>
          Bezorgen of afhalen, betalen met iDEAL | Wero of contant, met fooi van 10, 15 of 20 procent als je wilt. Spaar punten voor korting, VIP-uitnodigingen en een cadeau op je verjaardag.
        </Txt>
      </Card>
      <View style={{ gap: 8 }}>
        <Txt v="label" color={C.muted}>
          De menukaart in de zaak
        </Txt>
        <Photo id="__menuboard" style={{ height: 250, borderRadius: R.lg }} />
      </View>
      <DemoNote text="Echt: het adres, de openingstijden, het menu met prijzen, de telefoon, het e-mailadres, Instagram en de Google-score (oktober 2026). Demo: het team, de bestellingen, de punten en alles wat de app live laat zien. Foto’s van gerechten zijn stockfoto’s (Pexels); de zaak en de menukaart komen van Grill-Points eigen Instagram." />
    </Screen>
  );
}
