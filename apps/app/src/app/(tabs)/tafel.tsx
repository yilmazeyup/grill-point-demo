import { CALL_NAMES, dish, euro, lineTotal, picksLabel, staff, TABLES, type CallKind } from '@grill/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { Icon, type IconName } from '../../components/Icon';
import { Photo } from '../../components/Photo';
import { Screen } from '../../components/Screen';
import { useToast } from '../../components/Toast';
import { Button, Card, DemoNote, Press, Row, Segments, Tag, Txt } from '../../components/ui';
import { tr } from '../../i18n';
import { useDemo } from '../../state/demo';
import { C, fx, R } from '../../theme';

const CALLS: { id: CallKind; icon: IconName }[] = [
  { id: 'ober', icon: 'wave' },
  { id: 'saus', icon: 'sauce' },
  { id: 'water', icon: 'water' },
  { id: 'rekening', icon: 'receipt' },
];

const AVATAR = ['#E0321B', '#C98A1E', '#4E7D3A', '#6A4C93', '#2F6F8F'];

/**
 * Aan tafel, like a QR menu on the table: scan the code, and everyone at the table orders from their own phone on one
 * shared order. Call the chef to the table (Kerem comes to carve the Mix Grill), the waiter, sauce, water or the bill;
 * split the bill or let the skewer decide who pays.
 */
export default function Table() {
  const { guest, joinTable, leaveTable, call, fireTable, payTable, bridge, now, send } = useDemo();
  const toast = useToast();
  const params = useLocalSearchParams<{ nr?: string }>();
  const [split, setSplit] = useState<'eigen' | 'gelijk'>('eigen');
  const table = guest.table;

  // A QR code on the table opens /tafel?nr=4.
  useEffect(() => {
    const n = Number(params.nr);
    if (n && TABLES.some((t) => t.n === n) && guest.table?.n !== n) joinTable(n);
  }, [params.nr]); // eslint-disable-line react-hooks/exhaustive-deps

  // The latest call from this table and whether the team answered it.
  const status = useMemo(() => {
    if (!table) return null;
    const calls = bridge.events.filter((e) => e.kind === 'call' && e.table === table.n && e.at >= table.since);
    const last = calls[calls.length - 1];
    if (!last || last.kind !== 'call') return null;
    const answer = bridge.events.find((e) => e.kind === 'answer' && e.call === last.id);
    return { call: last, answer: answer && answer.kind === 'answer' ? answer : null };
  }, [bridge, table]);

  // If no one answers from the panel, the team answers by itself after a few seconds (the demo plays the staff).
  useEffect(() => {
    if (!status || status.answer) return;
    const wait = setTimeout(() => {
      send({ kind: 'answer', at: now.getTime(), call: status.call.id, by: status.call.call === 'chef' ? 'kerem' : 'sevda', minutes: status.call.call === 'chef' ? 3 : 2 });
    }, 9000);
    return () => clearTimeout(wait);
  }, [status?.call.id, status?.answer]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!table) return <Scan onPick={joinTable} />;

  const info = TABLES.find((t) => t.n === table.n)!;
  const byGuest = table.guests.map((g) => ({ g, lines: table.lines.filter((l) => l.by === g) }));
  const total = table.lines.reduce((s, l) => s + lineTotal(l), 0);
  const unsent = table.lines.filter((l) => !(table.sent ?? []).includes(l.key));
  const mineTotal = split === 'gelijk' ? total / Math.max(1, table.guests.length) : table.lines.filter((l) => l.by === guest.name).reduce((s, l) => s + lineTotal(l), 0);

  const ask = (kind: CallKind) => {
    call(kind);
    toast(tr(CALL_NAMES[kind]), { icon: kind === 'chef' ? 'chef' : 'bell', text: tr('Het team ziet je verzoek op het keukenscherm') });
  };

  return (
    <Screen
      tabs
      kicker={`Tafel ${table.n} · ${info.zone === 'terras' ? tr('Terras') : tr('Binnen')}`}
      title="Aan tafel"
      right={
        <Press onPress={leaveTable} style={{ paddingHorizontal: 14, height: 36, borderRadius: 18, justifyContent: 'center', borderWidth: 1, borderColor: C.line2 }}>
          <Txt v="small" weight="600">
            Verlaat tafel
          </Txt>
        </Press>
      }
    >
      <Row gap={-8}>
        {table.guests.map((g, i) => (
          <View key={g} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: C.bg, backgroundColor: AVATAR[i % AVATAR.length], alignItems: 'center', justifyContent: 'center', marginLeft: i ? -8 : 0 }}>
            <Txt v="h3" color="#FFF6EC">
              {g.charAt(0)}
            </Txt>
          </View>
        ))}
        <Txt v="small" color={C.muted} style={{ marginLeft: 14 }}>
          {`${table.guests.join(', ')} ${tr('bestellen samen')}`}
        </Txt>
      </Row>

      {/* -------------------------------------------------------------------- chef to the table */}
      <Press onPress={() => ask('chef')} fxNames="dye-coal glow lift" style={{ borderRadius: R.xl, padding: 18, backgroundColor: C.coal, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View {...fx('dye-fire')} style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.flame, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chef" size={28} color="#FFF6EC" />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt v="title" size={24} color="#FFF6EC">
            Chef aan tafel
          </Txt>
          <Txt v="small" color="#D6C4B4">
            Kerem komt langs: voor advies, of om de Mix Grill aan tafel aan te snijden.
          </Txt>
        </View>
      </Press>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {CALLS.map((c) => (
          <Press key={c.id} onPress={() => ask(c.id)} scaleTo={0.92} fxNames="grain" style={{ flex: 1, height: 84, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line }}>
            <Icon name={c.icon} size={22} color={C.flame} />
            <Txt v="small" size={11.5} weight="600" align="center">
              {CALL_NAMES[c.id]}
            </Txt>
          </Press>
        ))}
      </View>
      {status ? (
        <Row gap={12} style={{ padding: 14, borderRadius: R.md, backgroundColor: status.answer ? C.paper : C.bg2, borderWidth: 1, borderColor: status.answer ? C.ok : C.line }}>
          {status.answer ? <Icon name="check" size={20} color={C.ok} /> : <View {...fx('spin')} style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: C.flame, borderTopColor: 'transparent' }} />}
          <Txt v="small" weight="600" style={{ flex: 1 }}>
            {status.answer
              ? `${staff(status.answer.by).name} ${tr('komt eraan')} · ±${status.answer.minutes} min · ${tr(CALL_NAMES[status.call.call])}`
              : `${tr(CALL_NAMES[status.call.call])} · ${tr('verstuurd, het team kijkt')}`}
          </Txt>
        </Row>
      ) : null}

      {/* -------------------------------------------------------------------- the shared order */}
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="h2">Tafelbestelling</Txt>
          <Txt v="price" size={20}>
            {euro(total)}
          </Txt>
        </Row>
        {byGuest.map(({ g, lines }, i) => (
          <View key={g} style={{ marginTop: 14, gap: 8 }}>
            <Row gap={8}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: AVATAR[i % AVATAR.length] }} />
              <Txt v="label" color={C.soft}>
                {g === guest.name ? `${g} (jij)` : g}
              </Txt>
            </Row>
            {lines.length ? (
              lines.map((l) => {
                const d = dish(l.dish);
                const sent = (table.sent ?? []).includes(l.key);
                return (
                  <Row key={l.key} gap={10} {...fx('rise')}>
                    <Photo id={d.photo} style={{ width: 40, height: 40, borderRadius: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Txt v="small" weight="600" numberOfLines={1}>
                        {d.name}
                      </Txt>
                      {picksLabel(d, l.picks) ? (
                        <Txt v="small" size={11.5} color={C.muted} numberOfLines={1}>
                          {picksLabel(d, l.picks)}
                        </Txt>
                      ) : null}
                    </View>
                    {sent ? <Tag label="In de keuken" color={C.ok} /> : null}
                    <Txt v="num" size={12} color={C.muted}>
                      {euro(lineTotal(l))}
                    </Txt>
                  </Row>
                );
              })
            ) : (
              <Txt v="small" color={C.muted}>
                {g === guest.name ? 'Nog niets gekozen.' : 'Kijkt nog in het menu…'}
              </Txt>
            )}
          </View>
        ))}
        <Row gap={8} style={{ marginTop: 18 }}>
          <Button title="Voeg toe" icon="plus" kind="line" size="sm" onPress={() => router.push('/menu')} />
          <Button
            title={unsent.length ? `Naar de keuken (${unsent.length})` : 'Alles is in de keuken'}
            icon="flame"
            size="sm"
            disabled={!unsent.length}
            onPress={() => {
              const o = fireTable();
              if (o) toast(`${tr('Tafel')} ${table.n}: ${tr('de keuken is begonnen')}`, { icon: 'flame', text: tr('Kijk live mee op de Grill-Cam'), onPress: () => router.push('/live') });
            }}
            style={{ flex: 1 }}
          />
        </Row>
      </Card>

      {/* -------------------------------------------------------------------- the bill */}
      {table.lines.length ? (
        <Card>
          <Txt v="h2">De rekening</Txt>
          <View style={{ marginTop: 12 }}>
            <Segments
              value={split}
              onChange={setSplit}
              options={[
                { id: 'eigen', label: 'Ieder het zijne', icon: 'split' },
                { id: 'gelijk', label: 'Gelijk delen', icon: 'users' },
              ]}
            />
          </View>
          {table.guests.map((g) => {
            const part = split === 'gelijk' ? total / table.guests.length : table.lines.filter((l) => l.by === g).reduce((s, l) => s + lineTotal(l), 0);
            return (
              <Row key={g} style={{ justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: C.line }}>
                <Txt v="body">{g}</Txt>
                <Txt v="num">{euro(part)}</Txt>
              </Row>
            );
          })}
          <Row gap={8} style={{ marginTop: 16 }}>
            <Button title="Draai de spies" icon="skewer" kind="line" size="sm" onPress={() => router.push('/spies')} />
            <Button
              title={table.paid ? 'Betaald' : `Betaal jouw deel`}
              sub={table.paid ? undefined : euro(mineTotal)}
              icon={table.paid ? 'check' : 'card'}
              size="sm"
              disabled={table.paid || !mineTotal}
              onPress={() => {
                payTable();
                toast(tr('Betaald met iDEAL | Wero'), { icon: 'check', text: tr('Je vuurpunten zijn bijgeschreven') });
              }}
              style={{ flex: 1 }}
            />
          </Row>
        </Card>
      ) : null}
      <DemoNote text="In de demo schuiven Daan en Elif na een paar seconden aan. Oproepen en de tafelbestelling verschijnen live op het keukenscherm." />
    </Screen>
  );
}

/** Not at a table yet: the scanner, and in the demo a choice of table. */
function Scan({ onPick }: { onPick: (n: number) => void }) {
  return (
    <Screen tabs kicker="Aan tafel" title="Scan je tafel" serif="Bestel samen vanaf je eigen telefoon, roep de chef en splits de rekening.">
      <View {...fx('dye-coal')} style={{ height: 300, borderRadius: R.xl, backgroundColor: C.coal, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        <Photo id="__storefront" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.35 }} />
        <View style={{ width: 190, height: 190 }}>
          {[
            { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 },
            { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 },
            { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 },
            { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 },
          ].map((s, i) => (
            <View key={i} style={[{ position: 'absolute', width: 40, height: 40, borderColor: '#FF6A2B', borderRadius: 6 }, s]} />
          ))}
          <View {...fx('float')} style={{ position: 'absolute', left: 14, right: 14, top: 92, height: 2, backgroundColor: '#FF6A2B', shadowColor: '#FF6A2B', shadowRadius: 12, shadowOpacity: 1 }} />
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="qr" size={64} color="rgba(255,246,236,0.5)" />
          </View>
        </View>
        <Txt v="label" color="#F6EBDD" style={{ position: 'absolute', bottom: 16 }}>
          Richt je camera op de QR-code op tafel
        </Txt>
      </View>
      <View style={{ gap: 10 }}>
        <Txt v="label" color={C.muted}>
          Demo: kies je tafel
        </Txt>
        {(['binnen', 'terras'] as const).map((zone) => (
          <View key={zone} style={{ gap: 8 }}>
            <Txt v="small" weight="700" color={C.soft}>
              {zone === 'binnen' ? 'Binnen' : 'Terras'}
            </Txt>
            <Row gap={8}>
              {TABLES.filter((t) => t.zone === zone).map((t) => (
                <Press key={t.n} onPress={() => onPick(t.n)} scaleTo={0.92} fxNames="grain lift" style={{ flex: 1, height: 72, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper, borderWidth: 1, borderColor: C.line }}>
                  <Txt v="price" size={26}>
                    {t.n}
                  </Txt>
                  <Txt v="label" size={8.5} color={C.muted}>
                    {`${t.seats} ${tr('plaatsen')}`}
                  </Txt>
                </Press>
              ))}
            </Row>
          </View>
        ))}
      </View>
      <Press onPress={() => router.push('/reserveer')} fxNames="lift" style={{ borderRadius: R.lg, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line }}>
        <Icon name="cube" size={24} color={C.flame} />
        <View style={{ flex: 1 }}>
          <Txt v="h3">Reserveer een tafel in 3D</Txt>
          <Txt v="small" color={C.muted}>
            Kies zelf je plek, binnen of op het terras
          </Txt>
        </View>
        <Icon name="chevron" size={18} color={C.muted} />
      </Press>
    </Screen>
  );
}
