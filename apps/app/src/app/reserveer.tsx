import { addDays, atMinute, clock, dayShort, rng, startOfDay, TABLES } from '@grill/shared';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Screen } from '../components/Screen';
import { useToast } from '../components/Toast';
import { Button, Card, Chip, Row, Stepper, Txt } from '../components/ui';
import { tr } from '../i18n';
import { useDemo } from '../state/demo';
import { TablePicker } from '../three/TablePicker';
import { C, fx, R } from '../theme';

/** Book a table by picking it in 3D: the day, the time, how many, and which table, inside or on the terrace. */
export default function Book() {
  const { now, guest, send } = useDemo();
  const toast = useToast();
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(startOfDay(now), i)), [now]);
  const [day, setDay] = useState(0);
  const [time, setTime] = useState(18 * 60 + 30);
  const [people, setPeople] = useState(2);
  const [picked, setPicked] = useState<number | null>(null);
  const times = Array.from({ length: 12 }, (_, i) => 17 * 60 + i * 30).filter((m) => day > 0 || m > now.getHours() * 60 + now.getMinutes() + 30);
  // Made-up bookings: some tables are taken at that moment.
  const taken = useMemo(() => {
    const r = rng(`booked-${day}-${time}`);
    return TABLES.filter(() => r() < 0.3).map((t) => t.n);
  }, [day, time]);
  const fitsPeople = (n: number) => (TABLES.find((t) => t.n === n)?.seats ?? 0) >= people;
  const table = picked && !(taken as number[]).includes(picked) && fitsPeople(picked) ? picked : null;

  return (
    <Screen back kicker="Reserveren" title="Kies je tafel" serif="Tik een tafel aan: binnen achter het glas of buiten op het terras.">
      <View {...fx('dye-coal')} style={{ height: 340, borderRadius: R.xl, overflow: 'hidden', backgroundColor: C.coal }}>
        <TablePicker picked={table} taken={[...taken, ...TABLES.filter((t) => !fitsPeople(t.n)).map((t) => t.n)]} onPick={setPicked} style={{ flex: 1 }} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {days.map((d, i) => (
          <Chip key={i} small label={i === 0 ? 'Vandaag' : i === 1 ? 'Morgen' : dayShort(d)} on={i === day} onPress={() => setDay(i)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {times.map((m) => (
          <Chip key={m} small label={clock(atMinute(now, m))} on={m === time} onPress={() => setTime(m)} />
        ))}
      </ScrollView>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <Txt v="h3">Met hoeveel?</Txt>
            <Txt v="small" color={C.muted}>
              Tafels die te klein zijn, vallen weg
            </Txt>
          </View>
          <Stepper value={people} min={1} onChange={(n) => setPeople(Math.max(1, Math.min(6, n)))} />
        </Row>
      </Card>
      <Button
        title={table ? `Reserveer tafel ${table}` : 'Kies een tafel'}
        icon="check"
        size="lg"
        full
        disabled={!table}
        onPress={() => {
          if (!table) return;
          const start = atMinute(days[day], time);
          send({ kind: 'reserve', at: now.getTime(), table, start: start.getTime(), people, guest: guest.name });
          toast(`${tr('Tafel')} ${table} ${tr('is voor je gereserveerd')}`, { icon: 'check', text: `${dayShort(start)} · ${clock(start)} · ${people} ${tr('personen')}` });
          router.back();
        }}
      />
    </Screen>
  );
}
