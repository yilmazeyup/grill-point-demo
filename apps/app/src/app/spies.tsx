import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Screen } from '../components/Screen';
import { Button, Card, Chip, Row, Txt } from '../components/ui';
import { tr } from '../i18n';
import { useDemo } from '../state/demo';
import { SpinSkewer } from '../three/SpinSkewer';
import { C, fx, R } from '../theme';

const QUESTIONS = ['Wie betaalt er vanavond?', 'Wie haalt het eten op?', 'Wie kiest het toetje?', 'Wie belt de chef?'];

/** Draai de spies: the table's spin-the-bottle, with a köfte skewer. Fun at the table, and a nice clip to share. */
export default function Spin() {
  const { guest, send, now } = useDemo();
  const names = guest.table?.guests.length && guest.table.guests.length > 1 ? guest.table.guests : [guest.name, 'Daan', 'Elif', 'Sem'];
  const [spin, setSpin] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [question, setQuestion] = useState(QUESTIONS[0]);
  return (
    <Screen back kicker="Aan tafel" title="Draai de spies" serif={question}>
      <View {...fx('dye-coal')} style={{ height: 380, borderRadius: R.xl, overflow: 'hidden', backgroundColor: C.coal }}>
        <SpinSkewer
          names={names}
          spin={spin}
          onStop={(i) => {
            setWinner(names[i]);
            send({ kind: 'spin', at: now.getTime(), table: guest.table?.n ?? 0, winner: names[i] });
          }}
          style={{ flex: 1 }}
        />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {QUESTIONS.map((q) => (
          <Chip key={q} small label={q} on={q === question} onPress={() => setQuestion(q)} />
        ))}
      </View>
      {winner ? (
        <Card>
          <Txt v="label" color={C.flame}>
            De spies heeft gesproken
          </Txt>
          <Txt v="display" fire>
            {winner}
          </Txt>
          <Txt v="serif" color={C.soft}>
            {tr(question).replace('?', '')}
          </Txt>
        </Card>
      ) : null}
      <Row gap={10}>
        <Button
          title={winner ? 'Nog een keer' : 'Draai!'}
          icon="rotate"
          size="lg"
          onPress={() => {
            setWinner(null);
            setSpin((n) => n + 1);
          }}
          style={{ flex: 1 }}
        />
        {guest.table ? <Button title="Naar de rekening" kind="line" size="lg" onPress={() => router.push('/tafel')} /> : null}
      </Row>
    </Screen>
  );
}
