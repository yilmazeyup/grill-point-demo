import {
  AREAS,
  CALL_NAMES,
  CATEGORIES,
  clock,
  dayLong,
  decimal,
  DISHES,
  dish,
  euro,
  promise,
  RESTAURANT,
  rushCurve,
  soldUntil,
  stageAt,
  type BridgeEvent,
  type Order,
} from '@grill/shared';
import { useMemo, useState } from 'react';

import { fakeGuest, feedFor, lastWeek, mainDish, numbers, prepForTomorrow, sharesTonight, summary, type CourierView, type FeedItem, type TableView } from '../data';
import { dishPhoto } from '../photos';

const pct = (x: number) => `${x >= 0 ? '+' : ''}${Math.round(x * 100)}%`;

// ---------------------------------------------------------------------------------------------------------- kpis

export function Kpis({ orders, t, now, load, tables, couriers }: { orders: Order[]; t: number; now: Date; load: number; tables: TableView[]; couriers: CourierView[] }) {
  const n = numbers(orders, t);
  const before = useMemo(() => lastWeek(now), [Math.floor(t / 60000)]);
  const p = promise(orders, t);
  const delta = before.revenue ? n.revenue / before.revenue - 1 : 0;
  const calls = tables.filter((x) => x.call).length;
  const road = couriers.filter((c) => c.phase === 'heen').length;
  const heat = load < 0.34 ? 'Rustig' : load < 0.67 ? 'Druk' : 'Vol vuur';
  return (
    <section className="kpis">
      <div className="kpi card big">
        <div className="kicker">Omzet tot nu</div>
        <b className="num">{euro(Math.round(n.revenue))}</b>
        <small className={delta >= 0 ? 'up' : 'down'}>
          {pct(delta)} op vorige week
        </small>
      </div>
      <div className="kpi card">
        <div className="kicker">Bestellingen</div>
        <b className="num">{n.count}</b>
        <small>gemiddeld {euro(Math.round(n.average * 100) / 100)}</small>
      </div>
      <div className="kpi card heat" style={{ ['--load' as string]: load }}>
        <div className="kicker">Keukendruk</div>
        <div className="heat-row">
          <b className="num">{heat}</b>
          <div className="gauge">
            {Array.from({ length: 12 }, (_, i) => (
              <i key={i} className={i < Math.round(load * 12) ? 'on' : ''} />
            ))}
          </div>
        </div>
        <small>
          De app belooft nu: klaar in {p.ready} min · aan de deur in {p.door} min
        </small>
      </div>
      <div className="kpi card">
        <div className="kicker">Tafels</div>
        <b className="num">
          {tables.filter((x) => x.state !== 'vrij' && x.state !== 'gereserveerd').length}
          <em>/7</em>
        </b>
        <small className={calls ? 'alert' : ''}>{calls ? (calls === 1 ? '1 tafel roept' : `${calls} tafels roepen`) : 'niemand roept'}</small>
      </div>
      <div className="kpi card">
        <div className="kicker">Onderweg</div>
        <b className="num">
          {road}
          <em>/3</em>
        </b>
        <small>bezorgers op pad</small>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------- feed

export function Feed({ now, events }: { now: Date; events: BridgeEvent[] }) {
  const items: FeedItem[] = useMemo(() => feedFor(now, events), [Math.floor(now.getTime() / 60000), events]);
  return (
    <section className="feed card">
      <div className="section-head">
        <div>
          <div className="kicker">Live</div>
          <h2>Uit de keuken en de app</h2>
        </div>
      </div>
      <ol>
        {items.map((item) => (
          <li key={item.id} className={`tone-${item.tone}${item.app ? ' app' : ''}`}>
            <time>{clock(new Date(item.at))}</time>
            <div>
              <b>{item.title}</b>
              <span>{item.text}</span>
            </div>
            {item.app ? <em>app</em> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------- the line

/** What each station is cooking now: the 2D twin of the tickets in 3D. */
export function Line({ stations }: { stations: Record<string, { id: string; number: string; dish: string; mine: boolean; progress: number }[]> }) {
  const rows: [string, string][] = [
    ['grill', 'Houtskoolgrill'],
    ['spit', 'Dönerspit'],
    ['oven', 'Pizzaoven'],
    ['plancha', 'Bakplaat'],
    ['fryer', 'Friteuse'],
  ];
  return (
    <section className="line card">
      <div className="section-head">
        <div>
          <div className="kicker">Op de lijn</div>
          <h2>Wat er nu op het vuur ligt</h2>
        </div>
      </div>
      <div className="stations">
        {rows.map(([id, name]) => {
          const list = stations[id] ?? [];
          return (
            <div key={id} className="station">
              <div className="st-name">
                <b>{name}</b>
                <span>{list.length}</span>
              </div>
              <div className="st-tickets">
                {list.slice(0, 5).map((tk) => (
                  <div key={tk.id} className={`tk${tk.mine ? ' mine' : ''}`}>
                    <b>{tk.number}</b>
                    <span>{tk.dish}</span>
                    <i style={{ width: `${tk.progress * 100}%` }} />
                  </div>
                ))}
                {!list.length ? <em>Stil</em> : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------- tables

const STATE_NAMES: Record<TableView['state'], string> = { vrij: 'Vrij', wacht: 'Wacht op eten', eet: 'Eet', roept: 'Roept', gereserveerd: 'Gereserveerd' };

export function Tables({ tables, events, t, onAnswer, focus }: { tables: TableView[]; events: BridgeEvent[]; t: number; onAnswer: (id: string) => void; focus: number | null }) {
  const lines = events.filter((e) => e.kind === 'table-line' && e.at <= t);
  const spins = events.filter((e) => e.kind === 'spin' && e.at <= t);
  return (
    <section className="tables card">
      <div className="section-head">
        <div>
          <div className="kicker">Binnen en op het terras · QR aan tafel</div>
          <h2>Tafels</h2>
        </div>
      </div>
      <div className="table-grid">
        {tables.map((x) => {
          const extra = lines.filter((e) => e.kind === 'table-line' && e.table === x.n);
          const spin = [...spins].reverse().find((e) => e.kind === 'spin' && e.table === x.n);
          return (
            <div key={x.n} className={`tcard state-${x.state}${x.mine ? ' mine' : ''}${focus === x.n ? ' focus' : ''}`}>
              <div className="t-top">
                <b className="t-n">{x.n}</b>
                <div>
                  <span className="t-zone">
                    {x.zone === 'terras' ? 'Terras' : 'Binnen'} · {x.seats} stoelen
                  </span>
                  <strong>{STATE_NAMES[x.state]}</strong>
                </div>
              </div>
              {x.who ? (
                <p>
                  {x.who}
                  {x.guests > 1 ? ` + ${x.guests - 1}` : ''}
                  {x.total ? ` · ${euro(x.total)}` : ''}
                </p>
              ) : x.booked ? (
                <p>Gereserveerd · {x.booked}</p>
              ) : (
                <p className="muted">Klaar voor gasten</p>
              )}
              {extra.length ? (
                <ul>
                  {extra.slice(-3).map((e) =>
                    e.kind === 'table-line' ? (
                      <li key={e.id}>
                        {e.guest}: {e.line.qty}× {dish(e.line.dish).name}
                      </li>
                    ) : null,
                  )}
                </ul>
              ) : null}
              {spin && spin.kind === 'spin' ? <p className="spin">De spies koos {spin.winner}</p> : null}
              {x.call ? (
                <div className="t-call">
                  <span>
                    {CALL_NAMES[x.call.kind]}
                    <small>
                      {x.call.guest} · {Math.max(0, Math.round((t - x.call.at) / 60000))} min
                    </small>
                  </span>
                  <button onClick={() => onAnswer(x.call!.id)}>Beantwoord</button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------- couriers

export function Couriers({ couriers, orders, t }: { couriers: CourierView[]; orders: Order[]; t: number }) {
  // The areas sit on a grid of about −2…1 around the shop; spread them over the whole map.
  const cx = 302;
  const cy = 283;
  const pos = (x: number, y: number) => [cx + x * 150, cy + y * 140] as const;
  const road = orders.filter((o) => o.mode === 'bezorgen' && (stageAt(o, t) === 'onderweg' || stageAt(o, t) === 'klaar'));
  return (
    <section className="couriers card">
      <div className="section-head">
        <div>
          <div className="kicker">Bezorging in Valkenswaard</div>
          <h2>Koeriers</h2>
        </div>
      </div>
      <div className="map-wrap">
        <svg viewBox="0 0 500 440" className="map" role="img" aria-label="Kaart van de bezorging">
          <defs>
            <radialGradient id="glow" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="var(--gp-ember)" stopOpacity="0.55" />
              <stop offset="1" stopColor="var(--gp-ember)" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* A suggestion of the town: the N69 through it, a few lanes, the Dommel to the west. */}
          <path d="M 40 60 C 160 140, 300 180, 470 420" className="road main" />
          <path d="M 20 250 C 140 230, 360 240, 490 210" className="road" />
          <path d="M 250 20 C 240 140, 260 300, 230 430" className="road" />
          <path d="M 60 420 C 100 300, 70 180, 30 40" className="river" />
          {[1, 2, 3].map((r) => (
            <circle key={r} cx={cx} cy={cy} r={r * 70} className="ring" />
          ))}
          {AREAS.map((a) => {
            const [x, y] = pos(a.x, a.y);
            return (
              <g key={a.id} className="area">
                <line x1={cx} y1={cy} x2={x} y2={y} />
                <circle cx={x} cy={y} r={5} />
                <text x={x} y={y - 12} textAnchor="middle">
                  {a.name}
                </text>
                <text x={x} y={y + 20} textAnchor="middle" className="ride">
                  {a.ride} min
                </text>
              </g>
            );
          })}
          <circle cx={cx} cy={cy} r={40} fill="url(#glow)" />
          <circle cx={cx} cy={cy} r={9} className="shop" />
          <text x={cx} y={cy - 18} textAnchor="middle" className="shop-name">
            Grill-Point
          </text>
          {couriers.map((c, i) => {
            if (!c.area) return null;
            const [x, y] = pos(c.area.x, c.area.y);
            const p = c.phase === 'heen' ? c.progress : c.phase === 'terug' ? 1 - c.progress : 0;
            const px = cx + (x - cx) * p;
            const py = cy + (y - cy) * p + (c.phase === 'wacht' ? 14 + i * 12 : 0);
            return (
              <g key={c.id} className={`scooter phase-${c.phase}${c.order?.mine ? ' mine' : ''}`} transform={`translate(${px} ${py})`}>
                <circle r={11} />
                <text y={4} textAnchor="middle">
                  {c.name.charAt(0)}
                </text>
              </g>
            );
          })}
        </svg>
        <ul className="riders">
          {couriers.map((c) => (
            <li key={c.id} className={`phase-${c.phase}${c.order?.mine ? ' mine' : ''}`}>
              <b>{c.name}</b>
              <span>
                {c.phase === 'heen'
                  ? `${c.order?.number} naar ${c.area?.name} · nog ${Math.max(1, Math.round(((c.order?.done ?? t) - t) / 60000))} min`
                  : c.phase === 'terug'
                    ? `Terug uit ${c.area?.name}`
                    : c.phase === 'wacht'
                      ? `Wacht op ${c.order?.number}`
                      : 'Vrij, bij de zaak'}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="road-list">
        {road.slice(0, 6).map((o) => (
          <div key={o.id} className={o.mine ? 'mine' : ''}>
            <b>{o.number}</b>
            <span>{summary(o, 2)}</span>
            <em>{stageAt(o, t) === 'onderweg' ? `onderweg · ${Math.max(1, Math.round((o.done - t) / 60000))} min` : 'klaar, wacht'}</em>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------- menu

export function MenuManager({ orders, t, soldOut, onToggle }: { orders: Order[]; t: number; soldOut: string[]; onToggle: (id: string, out: boolean) => void }) {
  const [cat, setCat] = useState(CATEGORIES[0].id);
  const sold = useMemo(() => new Map(soldUntil(orders, t).map((r) => [r.dish, r.qty])), [orders, Math.floor(t / 60000)]);
  const list = DISHES.filter((d) => d.cat === cat);
  return (
    <section className="menu card">
      <div className="section-head">
        <div>
          <div className="kicker">Wat op is, is op · de app toont het meteen</div>
          <h2>Menu vanavond</h2>
        </div>
        <span className="soldout-count">{soldOut.length ? `${soldOut.length} uitverkocht` : 'Alles leverbaar'}</span>
      </div>
      <div className="chips">
        {CATEGORIES.map((c) => (
          <button key={c.id} className={cat === c.id ? 'on' : ''} onClick={() => setCat(c.id)}>
            {c.name}
          </button>
        ))}
      </div>
      <div className="dish-list">
        {list.map((d) => {
          const out = soldOut.includes(d.id);
          const photo = dishPhoto(d.id);
          return (
            <div key={d.id} className={`dish${out ? ' out' : ''}`}>
              <div className="thumb" style={photo ? { backgroundImage: `url(${photo})` } : undefined} />
              <div className="d-text">
                <b>{d.name}</b>
                <span>
                  {euro(d.price)} · vanavond {sold.get(d.id) ?? 0}×
                </span>
              </div>
              <button className={`toggle${out ? ' on' : ''}`} role="switch" aria-checked={out} onClick={() => onToggle(d.id, !out)}>
                <i />
                <span>{out ? 'Uitverkocht' : 'Leverbaar'}</span>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------- numbers

export function Numbers({ orders, now }: { orders: Order[]; now: Date }) {
  const t = now.getTime();
  const n = numbers(orders, t);
  const curve = rushCurve(orders, now);
  const minute = now.getHours() * 60 + now.getMinutes();
  const top = soldUntil(orders, t)
    .filter((r) => !['drinks', 'sauzen'].includes(dish(r.dish).cat))
    .slice(0, 8);
  const max = Math.max(1, ...curve.map((c) => c.count));
  const maxSource = Math.max(1, ...n.bySource.map((s) => s.revenue));
  const topMax = Math.max(1, ...top.map((r) => r.qty));
  return (
    <section className="numbers card">
      <div className="section-head">
        <div>
          <div className="kicker">{dayLong(now)}</div>
          <h2>Cijfers van vanavond</h2>
        </div>
      </div>
      <div className="num-grid">
        <div className="rush">
          <h3>Bestellingen per half uur</h3>
          <div className="bars">
            {curve.map((c) => {
              const past = c.minute <= minute;
              const nowBar = minute >= c.minute && minute < c.minute + 30;
              return (
                <div key={c.minute} className={`bar${past ? ' past' : ''}${nowBar ? ' now' : ''}`}>
                  <i style={{ height: `${8 + (c.count / max) * 92}%` }} />
                  <span>{c.minute % 60 === 0 ? String(Math.floor(c.minute / 60) % 24).padStart(2, '0') : ''}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="channels">
          <h3>Per kanaal</h3>
          {n.bySource.map((s) => (
            <div key={s.id} className="channel">
              <span>{s.name}</span>
              <div className="track">
                <i style={{ width: `${(s.revenue / maxSource) * 100}%`, background: s.colour }} />
              </div>
              <b>{euro(Math.round(s.revenue))}</b>
              <small>{s.count}×</small>
            </div>
          ))}
          <p className="note">Thuisbezorgd rekent commissie per bestelling; in de eigen app en op de site blijft de hele omzet bij Grill-Point.</p>
        </div>
        <div className="top-dishes">
          <h3>Meest besteld</h3>
          {top.map((r, i) => (
            <div key={r.dish} className="top-row">
              <em>{i + 1}</em>
              <span>{dish(r.dish).name}</span>
              <div className="track">
                <i style={{ width: `${(r.qty / topMax) * 100}%` }} />
              </div>
              <b>{r.qty}×</b>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------- prep

export function Prep({ now }: { now: Date }) {
  const prep = useMemo(() => prepForTomorrow(now), [now.toDateString()]);
  return (
    <section className="prep card">
      <div className="section-head">
        <div>
          <div className="kicker">AI-voorspelling · demo</div>
          <h2>Prep voor morgen</h2>
        </div>
        <span className="pill">{dayLong(prep.day)}</span>
      </div>
      <p className="lead">
        Verwacht: <b>{prep.orders} bestellingen</b>. Zet dit klaar voor {String(Math.floor(RESTAURANT.opens / 60)).padStart(2, '0')}:00:
      </p>
      <div className="prep-grid">
        {prep.items.map((item) => (
          <div key={item.name} className="prep-item">
            <b className="num">
              {item.unit === 'kg' ? decimal(item.value, item.value % 1 ? 1 : 0) : item.value}
              <small>{item.unit}</small>
            </b>
            <span>{item.name}</span>
          </div>
        ))}
      </div>
      <p className="note">Een demo: de voorspelling volgt de testgegevens van morgen. Live leert ze van de eigen verkoop van Grill-Point, de dag van de week en het weer.</p>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------- social

export function Social({ orders, events, now }: { orders: Order[]; events: BridgeEvent[]; now: Date }) {
  const t = now.getTime();
  const shares = sharesTonight(orders, events, t);
  const reviews = events.filter((e) => e.kind === 'review' && e.at <= t);
  const top = soldUntil(orders, t)
    .filter((r) => !['drinks', 'sauzen'].includes(dish(r.dish).cat))
    .slice(0, 3);
  const latest = orders.filter((o) => o.placed <= t).slice(-1)[0];
  const posts = [
    ...top.map((r, i) => ({
      id: r.dish,
      photo: dishPhoto(r.dish),
      title: i === 0 ? `Vanavond ${r.qty}× van het vuur` : i === 1 ? 'Favoriet in Valkenswaard' : 'Vers van de grill',
      dish: dish(r.dish).name,
      when: i === 0 ? 'Klaar om te plaatsen' : i === 1 ? 'Morgen 16:30' : 'Vrijdag 17:00',
    })),
  ];
  const guestCount = shares.length;
  const reach = guestCount * 180;
  return (
    <section className="social card">
      <div className="section-head">
        <div>
          <div className="kicker">Instagram @{RESTAURANT.instagram} · 40 volgers</div>
          <h2>Social studio</h2>
        </div>
        <span className="pill">De gasten maken de content</span>
      </div>
      <div className="social-grid">
        <div className="posts">
          {posts.map((p) => (
            <div key={p.id} className="post">
              <div className="post-img" style={p.photo ? { backgroundImage: `url(${p.photo})` } : undefined}>
                <span className="brand">GRILL-POINT</span>
                <b>{p.dish}</b>
              </div>
              <div className="post-text">
                <b>{p.title}</b>
                <span>#valkenswaard #grillpoint #{p.dish.toLowerCase().replace(/[^a-z]+/g, '')}</span>
                <em>{p.when}</em>
              </div>
            </div>
          ))}
        </div>
        <div className="funnel">
          <div>
            <b className="num">{guestCount}</b>
            <span>gasten deelden vanavond hun bord als story</span>
          </div>
          <div>
            <b className="num">± {reach.toLocaleString('nl-NL')}</b>
            <span>mensen bereikt (schatting, demo)</span>
          </div>
          <div>
            <b className="num">{reviews.length}</b>
            <span>reviews via de app · Google staat op 4,7 uit 38</span>
          </div>
        </div>
        <div className="shares">
          <h3>Gedeeld vanavond</h3>
          <ul>
            {shares.slice(0, 6).map((s) => (
              <li key={s.id} className={s.app ? 'app' : ''}>
                <time>{clock(new Date(s.at))}</time>
                <span>
                  {s.guest || fakeGuest(s.id)} {s.dish ? `· ${s.dish}` : '· via de app'}
                </span>
              </li>
            ))}
            {!shares.length ? <li className="muted">Nog niets gedeeld vanavond</li> : null}
          </ul>
          {latest ? <p className="note">Na elke bestelling biedt de app een story-kaart met het gerecht en @grillpoint_valkenswaard aan, en na vijf sterren een link naar Google. Laatste bestelling: {mainDish(latest).name}.</p> : null}
        </div>
      </div>
    </section>
  );
}
