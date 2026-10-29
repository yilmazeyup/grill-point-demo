import { dish, euro, findDish } from '@grill/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { answer, pairing, STARTERS, type Reply } from '../chef/brain';
import { Icon } from '../components/Icon';
import { Photo } from '../components/Photo';
import { Backdrop, goBack } from '../components/Screen';
import { useToast } from '../components/Toast';
import { IconButton, Press, Row, Txt } from '../components/ui';
import { tr } from '../i18n';
import { useDemo, useSoldOut } from '../state/demo';
import { C, FONT, fx, MAX_WIDTH, PAD, R } from '../theme';

type Message = { id: number; from: 'gast' | 'usta'; text: string; reply?: Reply; shown?: number };

/**
 * Usta, the AI chef: ask anything about the menu in your own language. The answer types itself out, with the dishes it
 * talks about as cards you can put straight in the basket.
 */
export default function Chef() {
  const insets = useSafeAreaInsets();
  const { guest, evening, now, add, addToTable, send } = useDemo();
  const soldOut = useSoldOut();
  const toast = useToast();
  const params = useLocalSearchParams<{ over?: string }>();
  const [messages, setMessages] = useState<Message[]>(() => {
    const first: Message = { id: 0, from: 'usta', text: tr('Hoi! Ik ben Usta, de AI-chef van Grill-Point. Vraag me wat je moet eten, wat iets is, of wat bij je dieet past.'), reply: { text: '', chips: STARTERS } };
    const about = findDish(params.over ?? '');
    if (!about) return [first];
    return [first, { id: 1, from: 'gast', text: `${tr('Wat past bij de')} ${tr(about.name)}?` }, { id: 2, from: 'usta', text: tr(pairing(about)), reply: { text: '', dishes: [about.id] }, shown: 0 }];
  });
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const atTable = guest.mode === 'tafel' && !!guest.table;

  // The newest answer types itself out, a few letters at a time.
  const last = messages[messages.length - 1];
  useEffect(() => {
    if (!last || last.from !== 'usta' || last.shown === undefined || last.shown >= last.text.length) return;
    const t = setTimeout(() => setMessages((list) => list.map((m) => (m.id === last.id ? { ...m, shown: Math.min(m.text.length, (m.shown ?? 0) + 3) } : m))), 16);
    return () => clearTimeout(t);
  }, [last]);
  useEffect(() => {
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [messages.length, typing, last?.shown]);

  const ask = (text: string) => {
    const q = text.trim();
    if (!q) return;
    setInput('');
    const id = Date.now();
    setMessages((list) => [...list, { id, from: 'gast', text: q }]);
    setTyping(true);
    send({ kind: 'chef-ask', at: now.getTime(), question: q, guest: guest.name });
    setTimeout(() => {
      const reply = answer(q, { diet: guest.diet, evening, now: now.getTime(), soldOut });
      setTyping(false);
      setMessages((list) => [...list, { id: id + 1, from: 'usta', text: tr(reply.text), reply, shown: 0 }]);
    }, 700 + Math.random() * 500);
  };

  const put = (id: string) => {
    const d = dish(id);
    if (d.options?.length) {
      router.push(`/gerecht/${id}`);
      return;
    }
    if (atTable) addToTable(id, {});
    else add(id, {});
    toast(`${tr(d.name)} ${tr(atTable ? 'staat op de tafelbestelling' : 'zit in je mandje')}`, { icon: 'check' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: PAD, paddingBottom: 12, borderBottomWidth: 1, borderColor: C.line, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <IconButton name="back" label="Terug" onPress={goBack} />
          <Row gap={10}>
            <View {...fx('dye-fire glow')} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.flame, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="chef" size={22} color="#FFF6EC" />
            </View>
            <View>
              <Txt v="title" size={22}>
                Usta
              </Txt>
              <Row gap={6}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.ok }} />
                <Txt v="label" size={9} color={C.muted}>
                  AI-chef · spreekt jouw taal
                </Txt>
              </Row>
            </View>
          </Row>
          <View style={{ width: 44 }} />
        </Row>
      </View>
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 18 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingHorizontal: PAD, gap: 14 }}>
          {messages.map((m) => {
            const done = m.shown === undefined || m.shown >= m.text.length;
            const text = m.shown === undefined ? m.text : m.text.slice(0, m.shown);
            if (m.from === 'gast')
              return (
                <View key={m.id} style={{ alignSelf: 'flex-end', maxWidth: '82%', backgroundColor: C.ink, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 20, borderBottomRightRadius: 6 }}>
                  <Txt v="body" color={C.bg}>
                    {m.text}
                  </Txt>
                </View>
              );
            return (
              <View key={m.id} style={{ gap: 10, maxWidth: '92%' }}>
                <View {...fx('grain')} style={{ alignSelf: 'flex-start', backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, borderBottomLeftRadius: 6 }}>
                  {/* Already in the guest's language: it was translated when the answer was made. */}
                  <Txt v="body">{text as string}</Txt>
                </View>
                {done && m.reply?.dishes?.length ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                    {m.reply.dishes.map((id) => {
                      const d = dish(id);
                      return (
                        <Press key={id} accessibilityRole="none" onPress={() => router.push(`/gerecht/${id}`)} fxNames="rise lift" style={{ width: 150, borderRadius: R.md, overflow: 'hidden', backgroundColor: C.paper, borderWidth: 1, borderColor: C.line }}>
                          <Photo id={d.photo} style={{ height: 100 }} />
                          <View style={{ padding: 10, gap: 4 }}>
                            <Txt v="small" weight="700" numberOfLines={1}>
                              {d.name}
                            </Txt>
                            <Row style={{ justifyContent: 'space-between' }}>
                              <Txt v="num" size={12} color={C.flame}>
                                {euro(d.price)}
                              </Txt>
                              <Press onPress={() => put(id)} scaleTo={0.85} accessibilityLabel="Toevoegen" fxNames="dye-fire" style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.flame, alignItems: 'center', justifyContent: 'center' }}>
                                <Icon name="plus" size={14} color="#FFF6EC" stroke={2.4} />
                              </Press>
                            </Row>
                          </View>
                        </Press>
                      );
                    })}
                  </ScrollView>
                ) : null}
                {done && m.reply?.chips?.length && m.id === last?.id ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {m.reply.chips.map((c) => (
                      <Press key={c} onPress={() => ask(tr(c))} scaleTo={0.94} style={{ paddingHorizontal: 14, height: 36, borderRadius: 18, justifyContent: 'center', borderWidth: 1, borderColor: C.flame }}>
                        <Txt v="small" weight="600" color={C.flame}>
                          {c}
                        </Txt>
                      </Press>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
          {typing ? (
            <View {...fx('typing')} style={{ alignSelf: 'flex-start', flexDirection: 'row', gap: 4, backgroundColor: C.paper, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 20 }}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.muted }} />
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: PAD, paddingTop: 10, paddingBottom: insets.bottom + 14, borderTopWidth: 1, borderColor: C.line, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' }}>
        <Row gap={8} style={{ height: 52, borderRadius: 26, paddingLeft: 18, paddingRight: 6, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line2 }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => ask(input)}
            placeholder={tr('Vraag Usta iets…')}
            placeholderTextColor={C.muted}
            returnKeyType="send"
            style={[{ flex: 1, height: 48, color: C.ink, fontFamily: FONT.sans, fontSize: 15 }, { outlineStyle: 'none' } as object]}
          />
          <Press onPress={() => ask(input)} accessibilityLabel="Versturen" fxNames="dye-fire" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.flame, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="send" size={18} color="#FFF6EC" />
          </Press>
        </Row>
      </View>
    </View>
  );
}
