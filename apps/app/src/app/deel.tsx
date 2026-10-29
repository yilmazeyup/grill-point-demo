import { dish, RESTAURANT } from '@grill/shared';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image as RNImage, Linking, View } from 'react-native';

import { Flame } from '../components/Logo';
import { Photo } from '../components/Photo';
import { Screen } from '../components/Screen';
import { useToast } from '../components/Toast';
import { Button, Chip, DemoNote, Row, Txt } from '../components/ui';
import { tr } from '../i18n';
import { PHOTOS } from '../photos';
import { useDemo } from '../state/demo';
import { C, FONT, isWeb, R } from '../theme';

type Look = 'vuur' | 'creme' | 'polaroid';

const LOOKS: Record<Look, { bg: string; ink: string; accent: string }> = {
  vuur: { bg: '#110C0A', ink: '#F6EBDD', accent: '#FF6A2B' },
  creme: { bg: '#F4ECE0', ink: '#1C1410', accent: '#D42D17' },
  polaroid: { bg: '#2A1E19', ink: '#1C1410', accent: '#D42D17' },
};

/** Draws the story card on a canvas, 1080 × 1920, the size of an Instagram story. */
async function drawStory(look: Look, photo: string, title: string, line: string): Promise<Blob | null> {
  const L = LOOKS[look];
  const c = document.createElement('canvas');
  c.width = 1080;
  c.height = 1920;
  const ctx = c.getContext('2d')!;
  await document.fonts.load('900 120px "Big Shoulders Display"').catch(() => undefined);
  ctx.fillStyle = L.bg;
  ctx.fillRect(0, 0, 1080, 1920);
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = photo;
  await new Promise((r) => {
    img.onload = r;
    img.onerror = r;
  });
  const frame = look === 'polaroid' ? { x: 110, y: 260, w: 860, h: 860 } : { x: 0, y: 0, w: 1080, h: 1240 };
  if (look === 'polaroid') {
    ctx.fillStyle = '#FBF6EE';
    ctx.save();
    ctx.translate(540, 820);
    ctx.rotate(-0.04);
    ctx.fillRect(-480, -620, 960, 1180);
    ctx.restore();
  }
  ctx.save();
  if (look === 'polaroid') {
    ctx.translate(540, 820);
    ctx.rotate(-0.04);
    ctx.translate(-540, -820);
  }
  const s = Math.max(frame.w / (img.width || 1), frame.h / (img.height || 1));
  ctx.beginPath();
  ctx.rect(frame.x, frame.y, frame.w, frame.h);
  ctx.clip();
  if (img.width) ctx.drawImage(img, frame.x + (frame.w - img.width * s) / 2, frame.y + (frame.h - img.height * s) / 2, img.width * s, img.height * s);
  ctx.restore();
  if (look !== 'polaroid') {
    const g = ctx.createLinearGradient(0, 900, 0, 1300);
    g.addColorStop(0, `${L.bg}00`);
    g.addColorStop(1, L.bg);
    ctx.fillStyle = g;
    ctx.fillRect(0, 900, 1080, 400);
  }
  const textY = look === 'polaroid' ? 1290 : 1380;
  ctx.fillStyle = look === 'polaroid' ? L.ink : L.accent;
  ctx.font = '500 34px "Geist Mono", monospace';
  ctx.fillText(line.toUpperCase(), 90, textY - 110);
  ctx.fillStyle = look === 'polaroid' ? '#1C1410' : L.ink;
  ctx.font = '900 150px "Big Shoulders Display", Impact, sans-serif';
  const words = title.toUpperCase();
  ctx.fillText(words.length > 12 ? words.slice(0, 12) : words, 84, textY + 40);
  if (words.length > 12) ctx.fillText(words.slice(12), 84, textY + 180);
  ctx.fillStyle = look === 'polaroid' ? '#F6EBDD' : L.ink;
  ctx.font = '800 64px "Big Shoulders Display", Impact, sans-serif';
  ctx.fillText('GRILL-POINT', 90, 1760);
  ctx.font = '500 30px "Geist", sans-serif';
  ctx.fillStyle = look === 'polaroid' ? '#D6C4B4' : look === 'creme' ? '#4A3C33' : '#D6C4B4';
  ctx.fillText(`@${RESTAURANT.instagram} · ${RESTAURANT.street}, ${RESTAURANT.city}`, 90, 1815);
  return new Promise((r) => c.toBlob((b) => r(b), 'image/jpeg', 0.9));
}

/**
 * Deel je bord: a story card made from your order in Grill-Point's look, ready for Instagram. Grill-Point has a small
 * Instagram (40 followers); every guest who shares a card brings the restaurant to their own followers.
 */
export default function Share() {
  const { mine, guest, send, now } = useDemo();
  const toast = useToast();
  const params = useLocalSearchParams<{ order?: string }>();
  const order = mine.find((o) => o.id === params.order) ?? mine[0];
  const d = order ? dish([...order.lines].sort((a, b) => dish(b.dish).price - dish(a.dish).price)[0].dish) : dish(guest.favourites[0] ?? 'kapsalon');
  const [look, setLook] = useState<Look>('vuur');
  const L = LOOKS[look];
  const line = tr('Vers van het vuur in Valkenswaard');

  const share = async () => {
    send({ kind: 'share', at: now.getTime(), order: order?.id ?? '', guest: guest.name });
    if (!isWeb) return;
    const src = RNImage.resolveAssetSource(PHOTOS[d.photo])?.uri ?? '';
    const blob = await drawStory(look, src, tr(d.name), line);
    if (!blob) return;
    const file = new File([blob], `grill-point-${d.id}.jpg`, { type: 'image/jpeg' });
    const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
    if (nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], text: `@${RESTAURANT.instagram}` }).catch(() => undefined);
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }
    toast(tr('Je story staat klaar'), { icon: 'instagram', text: `${tr('Tag')} @${RESTAURANT.instagram}` });
  };

  return (
    <Screen back kicker="Deel je bord" title="Jouw story" serif="Gemaakt van je bestelling, in de stijl van Grill-Point.">
      <View style={{ alignItems: 'center' }}>
        <View style={{ width: 280, height: 498, borderRadius: R.lg, overflow: 'hidden', backgroundColor: L.bg, borderWidth: 1, borderColor: C.line }}>
          {look === 'polaroid' ? (
            <View style={{ position: 'absolute', left: 26, right: 26, top: 60, height: 300, backgroundColor: '#FBF6EE', padding: 10, transform: [{ rotate: '-2.3deg' }] }}>
              <Photo id={d.photo} style={{ flex: 1 }} />
              <View style={{ height: 70, justifyContent: 'center' }}>
                <Txt v="label" size={8} color="#1C1410">
                  {line}
                </Txt>
                <Txt v="title" size={26} color="#1C1410">
                  {d.name}
                </Txt>
              </View>
            </View>
          ) : (
            <>
              <Photo id={d.photo} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 320 }} />
              <View style={[{ position: 'absolute', top: 200, left: 0, right: 0, height: 130 }, isWeb ? ({ backgroundImage: `linear-gradient(180deg, ${L.bg}00, ${L.bg})` } as object) : null]} />
              <View style={{ position: 'absolute', left: 22, right: 22, top: 330, gap: 2 }}>
                <Txt v="label" size={8} color={L.accent}>
                  {line}
                </Txt>
                <Txt v="hero" size={44} color={L.ink}>
                  {d.name}
                </Txt>
              </View>
            </>
          )}
          <View style={{ position: 'absolute', left: 22, bottom: 20, gap: 2 }}>
            <Row gap={4}>
              <Flame size={18} id="story" />
              <Txt v="title" size={18} color={look === 'creme' ? '#1C1410' : '#F6EBDD'} style={{ fontFamily: FONT.display }}>
                GRILL-POINT
              </Txt>
            </Row>
            <Txt v="small" size={9} color={look === 'creme' ? '#4A3C33' : '#D6C4B4'}>
              {`@${RESTAURANT.instagram}`}
            </Txt>
          </View>
        </View>
      </View>
      <Row gap={8} style={{ justifyContent: 'center' }}>
        <Chip small label="Vuur" on={look === 'vuur'} onPress={() => setLook('vuur')} />
        <Chip small label="Crème" on={look === 'creme'} onPress={() => setLook('creme')} />
        <Chip small label="Polaroid" on={look === 'polaroid'} onPress={() => setLook('polaroid')} />
      </Row>
      <Button title="Deel op Instagram" icon="instagram" size="lg" full onPress={share} />
      <Button title="Schrijf een review op Google" icon="star" kind="line" size="lg" full onPress={() => Linking.openURL(RESTAURANT.maps)} />
      <DemoNote text="Op de telefoon opent het deelmenu met de story als foto; op de computer wordt hij gedownload. Het keukenscherm telt de gedeelde stories mee." />
    </Screen>
  );
}
