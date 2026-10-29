import { area, clock, euro, MODE_NAMES, SOURCE_NAMES, stageAt, type Order, type Source, type Stage } from '@grill/shared';
import { useState } from 'react';

import { columnOf, COLUMNS, lineText, SOURCES, summary, type Column } from '../data';

const SOURCE_SHORT: Record<Source, string> = { app: 'App', site: 'Site', thuisbezorgd: 'Thuisbezorgd', telefoon: 'Telefoon', tafel: 'Tafel' };

const minutes = (ms: number) => Math.max(0, Math.round(ms / 60000));

function OrderCard({ o, t, onStage, open, onOpen }: { o: Order; t: number; onStage: (o: Order, stage: Stage) => void; open: boolean; onOpen: () => void }) {
  const stage = stageAt(o, t)!;
  const progress = stage === 'vuur' ? Math.min(1, (t - o.fire) / Math.max(1, o.ready - o.fire)) : stage === 'onderweg' && o.out ? Math.min(1, (t - o.out) / Math.max(1, o.done - o.out)) : 0;
  const where = o.mode === 'bezorgen' && o.area ? area(o.area).name : o.mode === 'tafel' ? `Tafel ${o.table}` : 'Afhalen';
  const timing =
    stage === 'nieuw'
      ? `${minutes(t - o.placed)} min binnen`
      : stage === 'vuur'
        ? `klaar over ${minutes(o.ready - t)} min`
        : stage === 'onderweg'
          ? `aan de deur over ${minutes(o.done - t)} min`
          : o.mode === 'afhalen'
            ? `ligt ${minutes(t - o.ready)} min klaar`
            : o.mode === 'tafel'
              ? `geserveerd ${clock(new Date(o.ready))}`
              : `wacht op koerier`;
  return (
    <article className={`ticket src-${o.source}${o.mine ? ' mine' : ''}${open ? ' open' : ''}`} onClick={onOpen}>
      <header>
        <b className="num">{o.number}</b>
        <span className="src">{SOURCE_SHORT[o.source]}</span>
        <span className="time">{clock(new Date(o.placed))}</span>
      </header>
      <div className="who">
        <span>{o.guest}</span>
        <em>{o.mode === 'afhalen' ? MODE_NAMES[o.mode] : `${MODE_NAMES[o.mode]} · ${where}`}</em>
      </div>
      <p className="what">{summary(o, open ? 12 : 3)}</p>
      {open ? (
        <ul className="lines">
          {lineText(o).map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      ) : null}
      {progress ? (
        <div className="meter">
          <i style={{ width: `${progress * 100}%` }} />
        </div>
      ) : null}
      <footer>
        <span>{timing}</span>
        <b>{euro(o.total)}</b>
      </footer>
      {o.mine && (stage === 'nieuw' || stage === 'vuur') ? (
        <div className="acts">
          {stage === 'nieuw' ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStage(o, 'vuur');
              }}
            >
              Op het vuur
            </button>
          ) : null}
          <button
            className="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onStage(o, 'klaar');
            }}
          >
            Klaar
          </button>
        </div>
      ) : null}
      {o.mine ? <span className="mine-tag">Uit de app · deze demo</span> : null}
    </article>
  );
}

/** One board for every channel: the app, the website, Thuisbezorgd, the phone and the tables. */
export function Board({ orders, t, onStage, full }: { orders: Order[]; t: number; onStage: (o: Order, stage: Stage) => void; full?: boolean }) {
  const [only, setOnly] = useState<Source | 'alle'>('alle');
  const [open, setOpen] = useState<string | null>(null);
  const cols = new Map<Column, Order[]>(COLUMNS.map((c) => [c.id, []]));
  for (const o of orders) {
    if (only !== 'alle' && o.source !== only) continue;
    const stage = stageAt(o, t);
    if (!stage) continue;
    const col = columnOf(o, stage);
    if (col) cols.get(col)!.push(o);
  }
  for (const list of cols.values()) list.sort((a, b) => Number(!!b.mine) - Number(!!a.mine) || a.placed - b.placed);
  const limit = full ? 14 : 6;
  return (
    <section className="board card">
      <div className="section-head">
        <div>
          <div className="kicker">Alle kanalen op één bord</div>
          <h2>Bestellingen</h2>
        </div>
        <div className="chips">
          <button className={only === 'alle' ? 'on' : ''} onClick={() => setOnly('alle')}>
            Alle
          </button>
          {SOURCES.map((s) => (
            <button key={s.id} className={only === s.id ? 'on' : ''} onClick={() => setOnly(s.id)} style={{ ['--c' as string]: s.colour }}>
              <i /> {SOURCE_NAMES[s.id]}
            </button>
          ))}
        </div>
      </div>
      <div className="columns">
        {COLUMNS.map((c) => {
          const list = cols.get(c.id)!;
          return (
            <div key={c.id} className={`col col-${c.id}`}>
              <div className="col-head">
                <b>{c.title}</b>
                <span className="count">{list.length}</span>
                <small>{c.hint}</small>
              </div>
              <div className="col-body">
                {list.slice(0, limit).map((o) => (
                  <OrderCard key={o.id} o={o} t={t} onStage={onStage} open={open === o.id} onOpen={() => setOpen(open === o.id ? null : o.id)} />
                ))}
                {list.length > limit ? <div className="more">+{list.length - limit} meer</div> : null}
                {!list.length ? <div className="empty">Leeg</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
