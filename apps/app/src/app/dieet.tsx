import { ALLERGEN_NAMES, DISHES, type Allergen } from '@grill/shared';
import { View } from 'react-native';

import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { Card, Chip, DemoNote, Press, Row, Txt } from '../components/ui';
import { fits } from '../menu-fit';
import { useDemo, type Diet } from '../state/demo';
import { C } from '../theme';

const ALLERGENS: Allergen[] = ['gluten', 'melk', 'ei', 'sesam', 'noten', 'vis', 'mosterd', 'selderij'];

function Toggle({ label, line, on, onPress }: { label: string; line: string; on: boolean; onPress: () => void }) {
  return (
    <Press onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
      <View style={{ flex: 1 }}>
        <Txt v="h3">{label}</Txt>
        <Txt v="small" color={C.muted}>
          {line}
        </Txt>
      </View>
      <View style={{ width: 50, height: 30, borderRadius: 15, padding: 3, backgroundColor: on ? C.flame : C.bg2, borderWidth: 1, borderColor: C.line2 }}>
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: on ? '#FFF6EC' : C.muted, transform: [{ translateX: on ? 20 : 0 }] }} />
      </View>
    </Press>
  );
}

/** What the guest does not eat: the menu, the AI chef and the dish pages all take it into account. */
export default function DietScreen() {
  const { guest, setDiet } = useDemo();
  const diet = guest.diet;
  const set = (patch: Partial<Diet>) => setDiet({ ...diet, ...patch });
  const count = DISHES.filter((d) => d.cat !== 'drinks' && d.cat !== 'sauzen' && fits(d, diet)).length;
  return (
    <Screen back kicker="Mijn dieet" title="Wat eet je niet?" serif={`${count} gerechten passen bij je keuzes.`}>
      <Card>
        <Toggle label="Alleen halal" line="Al het vlees bij Grill-Point is halal" on={diet.halal} onPress={() => set({ halal: !diet.halal })} />
        <Toggle label="Vegetarisch" line="Geen vlees of vis" on={diet.vega} onPress={() => set({ vega: !diet.vega })} />
        <Toggle label="Niet pittig" line="Laat pittige gerechten weg" on={diet.mild} onPress={() => set({ mild: !diet.mild })} />
      </Card>
      <View style={{ gap: 10 }}>
        <Txt v="label" color={C.muted}>
          Allergenen vermijden
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {ALLERGENS.map((a) => (
            <Chip key={a} label={ALLERGEN_NAMES[a]} on={diet.avoid.includes(a)} onPress={() => set({ avoid: diet.avoid.includes(a) ? diet.avoid.filter((x) => x !== a) : [...diet.avoid, a] })} />
          ))}
        </View>
      </View>
      <Row gap={10} style={{ alignItems: 'flex-start' }}>
        <Icon name="shield" size={18} color={C.flame} />
        <Txt v="small" color={C.soft} style={{ flex: 1 }}>
          Het menu toont met één tik alleen wat past, en Usta de AI-chef houdt er rekening mee.
        </Txt>
      </Row>
      <DemoNote text="De allergenen per gerecht zijn in deze demo een indicatie. Bij een allergie vraag je het altijd in de zaak." />
    </Screen>
  );
}
