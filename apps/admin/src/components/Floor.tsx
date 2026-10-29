import type { ThemeMode } from '@grill/shared';
import { useEffect, useRef, useState } from 'react';

import type { FloorView } from '../data';
import { GrillScene, VIEWS, type ViewId } from '../three/shop';
import { Stage } from '../three/stage';

type Props = {
  view: FloorView;
  theme: ThemeMode;
  demoLabel: string | null;
  onAnswer: (callId: string) => void;
  onTable: (n: number) => void;
};

/** Grill-Point in 3D, live: one WebGL view for as long as the panel is open; the floor is pushed in every tick. */
export function Floor({ view, theme, demoLabel, onAnswer, onTable }: Props) {
  const host = useRef<HTMLDivElement | null>(null);
  const stage = useRef<Stage | null>(null);
  const scene = useRef<GrillScene | null>(null);
  const handlers = useRef({ answer: onAnswer, table: onTable });
  handlers.current = { answer: onAnswer, table: onTable };
  const [camera, setCamera] = useState<ViewId>('overzicht');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!host.current) return;
    let s: Stage;
    try {
      const v = VIEWS.overzicht;
      s = new Stage(host.current, { camera: v.camera, target: v.target, intro: [22, 20, 30], fov: 32, minDistance: 3, maxDistance: 36, maxPolarAngle: 1.36, fitAspect: 1.6, sway: 0.08 });
    } catch {
      setFailed(true);
      return;
    }
    stage.current = s;
    scene.current = new GrillScene(s, { answer: (id) => handlers.current.answer(id), table: (n) => handlers.current.table(n) });
    return () => {
      scene.current?.dispose();
      scene.current = null;
      stage.current = null;
      s.dispose();
    };
  }, []);

  useEffect(() => {
    scene.current?.update(view);
  }, [view]);

  useEffect(() => {
    scene.current?.setTheme(theme);
  }, [theme]);

  const go = (id: ViewId) => {
    setCamera(id);
    const v = VIEWS[id];
    stage.current?.flyTo(v.camera, v.target);
  };

  const calls = view.tables.filter((t) => t.call).length;
  const taken = view.tables.filter((t) => t.state !== 'vrij' && t.state !== 'gereserveerd').length;
  const away = view.couriers.filter((c) => c.phase === 'heen' || c.phase === 'terug');
  return (
    <div className="floor card" ref={host}>
      <div className="floor-head">
        <div>
          <div className="kicker">Nu in de zaak{demoLabel ? ` · ${demoLabel}` : ''}</div>
          <h2>
            {view.cooking} op het vuur · {taken} van 7 tafels
          </h2>
        </div>
        <div className="cams" role="group" aria-label="Camera">
          {(Object.keys(VIEWS) as ViewId[]).map((id) => (
            <button key={id} className={camera === id ? 'on' : ''} onClick={() => go(id)}>
              {VIEWS[id].label}
            </button>
          ))}
        </div>
      </div>
      <div className="floor-foot">
        <div className="legend">
          <span>
            <i className="dot flame" /> uit de app
          </span>
          <span>
            <i className="dot gold" /> roept
          </span>
          <span>
            <i className="dot herb" /> eet
          </span>
          {calls ? <span className="calls">{calls === 1 ? '1 tafel roept' : `${calls} tafels roepen`}</span> : null}
        </div>
        {away.length ? (
          <div className="away">
            {away.map((c) => (
              <span key={c.id} className={c.order?.mine ? 'mine' : ''}>
                <b>{c.name}</b> {c.phase === 'heen' ? `→ ${c.area?.name ?? ''}` : `← ${c.area?.name ?? ''}`}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {failed ? <div className="no-gl">3D is op dit apparaat niet beschikbaar; de 2D-weergave toont alles.</div> : null}
    </div>
  );
}
