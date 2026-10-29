import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { fx } from '../theme';
import { fontsReady } from '../web/css';
import { Flame } from './Logo';
import { Press, Txt } from './ui';

/**
 * The opening: sparks rise out of the dark, the flame of the logo catches, GRILL-POINT lands letter by letter and the
 * fire clears into the app. About three seconds; a tap skips it.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [phase, setPhase] = useState<'wait' | 'lit' | 'out'>('wait');

  useEffect(() => {
    let alive = true;
    fontsReady(1200).then(() => {
      if (alive) setPhase('lit');
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (phase !== 'lit') return;
    const out = setTimeout(() => setPhase('out'), 2600);
    return () => clearTimeout(out);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'out') return;
    const t = setTimeout(onDone, 650);
    return () => clearTimeout(t);
  }, [phase, onDone]);

  // Sparks on a 2D canvas: additive orange dots that rise, sway and fade.
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      el.width = window.innerWidth * dpr;
      el.height = window.innerHeight * dpr;
    };
    resize();
    window.addEventListener('resize', resize);
    type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number };
    const sparks: Spark[] = [];
    const spawn = () => {
      const w = el.width;
      const h = el.height;
      sparks.push({ x: w * (0.5 + (Math.random() - 0.5) * 0.7), y: h * (0.75 + Math.random() * 0.3), vx: (Math.random() - 0.5) * 0.6 * dpr, vy: -(1.2 + Math.random() * 2.6) * dpr, life: 0, max: 60 + Math.random() * 90, r: (0.8 + Math.random() * 2.2) * dpr });
    };
    let raf = 0;
    const frame = () => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(17,12,10,0.28)';
      ctx.fillRect(0, 0, el.width, el.height);
      for (let i = 0; i < 6; i++) spawn();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life++;
        s.x += s.vx + Math.sin((s.life + i) * 0.08) * 0.5 * dpr;
        s.y += s.vy;
        const k = 1 - s.life / s.max;
        if (k <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
        g.addColorStop(0, `rgba(255,${180 + Math.round(60 * k)},120,${0.9 * k})`);
        g.addColorStop(0.4, `rgba(255,110,40,${0.45 * k})`);
        g.addColorStop(1, 'rgba(255,60,20,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const letters = 'GRILL-POINT'.split('');
  const lit = phase !== 'wait';
  return (
    <Press
      haptic={false}
      scaleTo={1}
      onPress={() => setPhase('out')}
      accessibilityLabel="Overslaan"
      style={[
        { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 500, backgroundColor: '#110C0A', alignItems: 'center', justifyContent: 'center' },
        { opacity: phase === 'out' ? 0 : 1, transitionProperty: 'opacity', transitionDuration: '650ms' } as object,
      ]}
    >
      <canvas ref={canvas} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      <View style={[{ position: 'absolute', width: 520, height: 520, borderRadius: 260, backgroundColor: 'transparent' }, { backgroundImage: 'radial-gradient(closest-side, rgba(255,90,30,.35), rgba(255,90,30,0))', opacity: lit ? 1 : 0, transitionProperty: 'opacity', transitionDuration: '1.2s' } as object]} />
      <View style={{ alignItems: 'center' }}>
        <View style={[{ transform: [{ scale: lit ? 1 : 0.2 }], opacity: lit ? 1 : 0 }, { transitionProperty: 'transform, opacity', transitionDuration: '900ms', transitionTimingFunction: 'cubic-bezier(.2,1.4,.3,1)' } as object]}>
          <View {...fx('flicker')}>
            <Flame size={96} id="intro" />
          </View>
        </View>
        <View style={{ flexDirection: 'row', marginTop: -8 }}>
          {letters.map((ch, i) => (
            <Txt
              key={i}
              v="mega"
              size={74}
              color="#F6EBDD"
              style={[
                { opacity: lit ? 1 : 0, transform: [{ translateY: lit ? 0 : 40 }, { scale: lit ? 1 : 1.6 }] },
                { transitionProperty: 'transform, opacity', transitionDuration: '520ms', transitionDelay: `${380 + i * 55}ms`, transitionTimingFunction: 'cubic-bezier(.2,1.2,.3,1)' } as object,
              ]}
            >
              {ch}
            </Txt>
          ))}
        </View>
        <Txt v="label" size={12} color="#F2B04A" style={[{ letterSpacing: 9, marginTop: 6, opacity: lit ? 1 : 0 }, { transitionProperty: 'opacity', transitionDuration: '800ms', transitionDelay: '1.1s' } as object]}>
          VALKENSWAARD
        </Txt>
        <Txt v="serif" size={20} color="#D6C4B4" style={[{ marginTop: 22, opacity: lit ? 1 : 0 }, { transitionProperty: 'opacity', transitionDuration: '800ms', transitionDelay: '1.5s' } as object]}>
          Vers van het vuur
        </Txt>
      </View>
    </Press>
  );
}
