// The Sahara game: the rules of the game, kept free of drawing code so they can be
// tested on their own. All rates are per second of play; one second is YEARS_PER_SEC years.

export const START_BCE = 8500;
export const END_BCE = 1500;
export const YEARS_PER_SEC = 40;
export const GATES = [7000, 5300, 3500, 2500]; // councils after the first, in years BCE
export const SPEED = 200; // world scroll, px per second
export const GROUND = 300; // y of the path in a 960 x 400 world
export const PLAYER_X = 170;

export type StrategyId =
  | 'pottery' | 'harpoons' | 'wildgrain' | 'share' | 'trade' | 'cattle' | 'move' | 'wells' | 'sow';

export type Area = 'Food' | 'Water' | 'People';

export interface Strategy {
  id: StrategyId;
  area: Area;
  name: string;
  gain: string; // one line
  cost: string; // one line
  real: string; // shown at the end
  from: number; // first offered at this year BCE (larger = earlier)
}

export const STRATEGIES: Strategy[] = [
  {
    id: 'harpoons', area: 'Food', name: 'Fish the lakes', from: 8500,
    gain: 'Fish are worth double.',
    cost: 'Useless once the lakes dry up.',
    real: 'Camps beside the early Holocene lakes and rivers of the Sahara are full of fish bones and bone harpoons, from the Nile to Mali.',
  },
  {
    id: 'wildgrain', area: 'Food', name: 'Gather wild grain', from: 8500,
    gain: 'Grain is worth double.',
    cost: 'Wild grain needs rain.',
    real: 'Seeds of wild sorghum and millet turn up at camps in the eastern Sahara thousands of years before either crop was domesticated.',
  },
  {
    id: 'pottery', area: 'Food', name: 'Make pottery', from: 8500,
    gain: 'Cook and store: food lasts longer.',
    cost: 'You drink a little more.',
    real: 'Some of Africa’s oldest pottery, from before 9400 BCE at Ounjougou in Mali, was made by people who boiled wild grass seeds, long before farming.',
  },
  {
    id: 'share', area: 'People', name: 'Share with neighbours', from: 8500,
    gain: 'Neighbours rescue you when you run low.',
    cost: 'You share your finds too.',
    real: 'Lending animals and food between families is still one of the main ways dryland herders get through droughts.',
  },
  {
    id: 'trade', area: 'People', name: 'Trade', from: 7000,
    gain: 'Swap extra food for water, and back.',
    cost: 'Every swap loses a bit.',
    real: 'In the Sahel today, herders and farmers still swap milk and animals for grain. Each side covers what the other lacks.',
  },
  {
    id: 'cattle', area: 'Food', name: 'Herd cattle', from: 7000,
    gain: 'Milk every day while there is grass.',
    cost: 'Cattle drink a lot.',
    real: 'Herding spread across the Sahara thousands of years before crops were domesticated in Africa. Cattle came first.',
  },
  {
    id: 'move', area: 'Water', name: 'Follow the rain', from: 5300,
    gain: 'Move south, where it is wetter.',
    cost: 'Rough ground, and fields left behind.',
    real: 'As the Sahara dried after about 5300 BCE, people moved towards the Nile valley and the Sahel (Kuper & Kröpelin, 2006).',
  },
  {
    id: 'wells', area: 'Water', name: 'Dig wells', from: 5300,
    gain: 'More water, more often.',
    cost: 'Hard work: you eat more.',
    real: 'Wells, small dams and catching run-off are still how people farm the world’s drylands today.',
  },
  {
    id: 'sow', area: 'Food', name: 'Farm sorghum and millet', from: 3500,
    gain: 'Big harvests in good years.',
    cost: 'Fields fail in dry spells.',
    real: 'Domesticated sorghum appears in eastern Sudan by 3500–3000 BCE (Winchell et al., 2017), and pearl millet in Mali by about 2500 BCE (Manning et al., 2011).',
  },
];

export const byId = (id: StrategyId) => STRATEGIES.find((s) => s.id === id)!;

/** Regional moisture through the Holocene, 0 (desert) to 1 (green Sahara). */
export function rainfall(bce: number): number {
  if (bce >= 5300) return 0.9 - 0.04 * Math.sin((bce - 5300) / 380); // the African Humid Period
  if (bce >= 3500) return 0.25 + 0.65 * ((bce - 3500) / 1800); // the long drying
  return Math.max(0.1, 0.25 - 0.15 * ((3500 - bce) / 2000)); // desert, oases and the Nile
}

export function era(bce: number): string {
  if (bce >= 5300) return 'Green Sahara';
  if (bce >= 3500) return 'The drying';
  return 'Desert';
}

export type Kind =
  | 'water' | 'fish' | 'grain' | 'game' | 'field'
  | 'rock' | 'thorn' | 'dune';

export interface Thing { kind: Kind; x: number; y: number; w: number; h: number; taken?: boolean; bonus?: StrategyId; }

export interface Ledger { water: number; food: number; last: number; }

export interface State {
  t: number; bce: number; water: number; food: number;
  herd: number; // 0..1 herd health, only with cattle
  chosen: StrategyId[];
  y: number; vy: number; onGround: boolean; hurt: number;
  things: Thing[]; spawnClock: number; lastHazardX: number;
  spellLeft: number; nextSpell: number;
  shareReady: number; // year BCE after which neighbours help again
  gate: number; // index of the next council in GATES
  lastCouncil: number;
  over: false | 'won' | 'water' | 'food';
  log: { bce: number; water: number; food: number; rain: number }[];
  events: { bce: number; text: string }[];
  fx: { x: number; y: number; text: string; age: number; kind: 'water' | 'food' | 'hurt' }[];
  ledger: Partial<Record<StrategyId, Ledger>>; // what each choice has given (+) or cost (−)
  milkClock: number;
  seed: number; // random-number state, kept in the state so a game can be copied and replayed
  councils: { bce: number; options: StrategyId[]; snap: string; picked?: StrategyId }[];
}

/** Mulberry32, with its state stored on the game state. */
export function rand(s: { seed: number }) {
  s.seed = (s.seed + 0x6d2b79f5) | 0;
  let t = Math.imul(s.seed ^ (s.seed >>> 15), 1 | s.seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function newState(seed = Date.now()): State {
  return {
    t: 0, bce: START_BCE, water: 80, food: 80, herd: 1, chosen: [],
    y: GROUND, vy: 0, onGround: true, hurt: 0,
    things: [], spawnClock: 0.6, lastHazardX: 0,
    spellLeft: 0, nextSpell: 8500 - 700,
    shareReady: START_BCE, gate: 0, lastCouncil: START_BCE + 1,
    over: false, log: [], events: [], fx: [], ledger: {}, milkClock: 0, seed: seed | 0, councils: [],
  };
}

export const has = (s: State, id: StrategyId) => s.chosen.includes(id);
/** `has`, pretending one choice (x) was never made: used to work out what each choice is worth. */
const hx = (s: State, id: StrategyId, x?: StrategyId) => id !== x && has(s, id);

/** Moisture the group actually lives with: regional rain, dry spells, and moving south. */
export function localRain(s: State, x?: StrategyId): number {
  let r = rainfall(s.bce);
  if (s.spellLeft > 0) r *= 0.45;
  if (hx(s, 'move', x)) r = Math.min(1, r + 0.22);
  return r;
}

export const lakeLevel = (r: number) => Math.max(0, Math.min(1, (r - 0.45) / 0.4));

function credit(s: State, id: StrategyId, w: number, f: number) {
  const l = (s.ledger[id] ??= { water: 0, food: 0, last: START_BCE });
  l.water += w; l.food += f;
  if (w > 0.01 || f > 0.01) l.last = s.bce;
}

/** How each choice is doing right now, in a few plain words. */
export function status(s: State, id: StrategyId): { level: 'good' | 'weak' | 'off'; text: string } {
  const r = localRain(s);
  switch (id) {
    case 'harpoons': { const l = lakeLevel(r); return l > 0.4 ? { level: 'good', text: 'Plenty of fish' } : l > 0 ? { level: 'weak', text: 'Lakes shrinking: fewer fish' } : { level: 'off', text: 'Lakes gone: no fish' }; }
    case 'wildgrain': return r > 0.6 ? { level: 'good', text: 'Good wild harvests' } : r > 0.3 ? { level: 'weak', text: 'Thin wild grain' } : { level: 'off', text: 'Too dry for wild grain' };
    case 'pottery': return { level: 'good', text: 'Food lasts longer' };
    case 'cattle': return r > 0.32 ? { level: 'good', text: 'Herd giving milk' } : { level: 'weak', text: 'Not enough grass: herd shrinking' };
    case 'move': return { level: 'good', text: 'Living further south, where it is wetter' };
    case 'wells': return { level: 'good', text: 'Extra water from wells' };
    case 'sow': return s.spellLeft > 0 ? { level: 'weak', text: 'Dry spell: fields failing' } : { level: 'good', text: 'Fields growing' };
    case 'share': return s.bce <= s.shareReady ? { level: 'good', text: 'Neighbours ready to help' } : { level: 'weak', text: 'Neighbours helped recently' };
    case 'trade': return { level: 'good', text: 'Swapping what you have spare' };
  }
}

/** Three options for a council, drawn from what people could plausibly do at that time. */
export function gateOptions(s: State): StrategyId[] {
  const open = STRATEGIES.filter((x) => x.from >= s.bce && !has(s, x.id));
  const fresh = open.filter((x) => x.from < s.lastCouncil);
  const out: Strategy[] = [];
  if (fresh.length) out.push(fresh[Math.floor(rand(s) * fresh.length)]);
  let rest = open.filter((x) => !out.includes(x));
  while (out.length < 3 && rest.length) {
    const newArea = rest.filter((x) => !out.some((o) => o.area === x.area));
    const pool = newArea.length ? newArea : rest;
    const pick = pool[Math.floor(rand(s) * pool.length)];
    out.push(pick); rest = rest.filter((x) => x !== pick);
  }
  return out.map((x) => x.id);
}

export function choose(s: State, id: StrategyId) {
  s.chosen.push(id);
  const c = s.councils[s.councils.length - 1];
  if (c && !c.picked) c.picked = id;
  s.events.push({ bce: s.bce, text: byId(id).name });
}

export function jump(s: State) {
  if (s.onGround && !s.over) { s.vy = -640; s.onGround = false; }
}

const SIZES: Record<Kind, [number, number]> = {
  water: [34, 16], fish: [30, 18], grain: [22, 34], game: [34, 28], field: [70, 34],
  rock: [30, 24], thorn: [40, 30], dune: [64, 30],
};
const HAZARD: Kind[] = ['rock', 'thorn', 'dune'];
export const isHazard = (k: Kind) => HAZARD.includes(k);

function spawn(s: State, worldX: number) {
  const r = localRain(s), R = () => rand(s);
  const aridity = 1 - rainfall(s.bce);
  const lake = lakeLevel(r);
  // hazards
  const pHaz = (0.2 + 0.18 * aridity) * (has(s, 'move') ? 1.3 : 1) * (s.bce > 8000 ? 0.4 : 1);
  if (R() < pHaz && worldX - s.lastHazardX > 260) {
    const kind: Kind = aridity > 0.5 && R() < 0.55 ? 'dune' : R() < 0.5 ? 'rock' : 'thorn';
    const [w, h] = SIZES[kind];
    s.things.push({ kind, x: worldX, y: GROUND - h, w, h });
    s.lastHazardX = worldX;
    return;
  }
  const pBase = 0.09 + 0.4 * r;
  const pWater = has(s, 'wells') ? pBase * 1.5 + 0.07 : pBase;
  const u = R();
  if (u < pWater) { const th = item('water', worldX); if (u >= pBase) th.bonus = 'wells'; s.things.push(th); return; }
  // food: weighted by what the land offers now
  const weights: [Kind, number][] = [
    ['fish', 1.1 * lake],
    ['grain', 0.9 * r],
    ['game', 0.35 + 0.25 * r],
    ['field', has(s, 'sow') ? 1.4 : 0],
  ];
  const total = weights.reduce((a, [, w]) => a + w, 0);
  if (R() < 0.34 && total > 0) {
    let pick = R() * total;
    for (const [k, w] of weights) { pick -= w; if (pick <= 0) { const th = item(k, worldX); if (k === 'field') th.bonus = 'sow'; s.things.push(th); return; } }
  }
}

function item(kind: Kind, x: number): Thing {
  const [w, h] = SIZES[kind];
  const air = kind === 'game' ? 95 : 0; // gazelles bound past: jump to catch them
  return { kind, x, y: GROUND - h - air, w, h };
}

/** Value of a find in the two stores. */
export function value(s: State, k: Kind, x?: StrategyId): [number, number] {
  const r = localRain(s, x);
  let w = 0, f = 0;
  if (k === 'water') w = 15 * (hx(s, 'wells', x) ? 1.35 : 1);
  if (k === 'fish') f = 8 * (hx(s, 'harpoons', x) ? 2 : 1);
  if (k === 'grain') f = 7 * (hx(s, 'wildgrain', x) ? 2 : 1);
  if (k === 'game') f = 11;
  if (k === 'field') f = (s.spellLeft > 0 ? 4 : 18 * Math.min(1, r / 0.35)) * (hx(s, 'move', x) ? 0.6 : 1);
  if (hx(s, 'pottery', x)) f *= 1.3;
  if (hx(s, 'share', x)) { w *= 0.9; f *= 0.9; }
  return [w, f];
}

/** Water and food used per second, after milk. */
function needs(s: State, x?: StrategyId): [number, number, number] {
  const r = localRain(s, x);
  let w = 1.1 + 3.6 * (1 - r);
  let f = 2.1, milk = 0;
  if (hx(s, 'pottery', x)) { f *= 0.85; w *= 1.06; }
  if (hx(s, 'cattle', x)) { w *= 1.25; milk = 1.6 * s.herd * Math.min(1, r / 0.3); }
  if (hx(s, 'wells', x)) f *= 1.12;
  if (hx(s, 'sow', x)) w *= 1.08;
  return [w, f, milk];
}

export function step(s: State, dt: number) {
  if (s.over) return;
  s.t += dt;
  const prev = s.bce;
  s.bce = START_BCE - s.t * YEARS_PER_SEC;
  const r = localRain(s);

  // dry spells: runs of bad years, more frequent as the climate dries
  if (s.spellLeft > 0) s.spellLeft -= dt;
  else if (s.bce <= s.nextSpell) {
    s.spellLeft = 3 + rand(s) * 2.5;
    s.events.push({ bce: s.bce, text: 'Dry spell' });
    const aridity = 1 - rainfall(s.bce);
    s.nextSpell = s.bce - (900 - 600 * aridity) * (0.6 + rand(s) * 0.8);
  }

  // daily needs
  if (has(s, 'cattle')) s.herd = Math.max(0.15, Math.min(1, s.herd + dt * 0.25 * (r - 0.32)));
  const [wNeed, fNeed, milk] = needs(s);
  const fNet = Math.max(0.3, fNeed - milk);
  s.water -= wNeed * dt;
  s.food -= fNet * dt;
  for (const id of s.chosen) {
    if (id === 'cattle') { const [w0] = needs(s, id); credit(s, id, (w0 - wNeed) * dt, (fNeed - milk > 0.3 ? milk : fNeed - 0.3) * dt); continue; }
    const [w0, f0, m0] = needs(s, id);
    credit(s, id, (w0 - wNeed) * dt, (Math.max(0.3, f0 - m0) - fNet) * dt);
  }
  if (milk > 0.3 && (s.milkClock -= dt) <= 0) {
    s.milkClock = 2.2;
    s.fx.push({ x: PLAYER_X - 70, y: GROUND - 40, text: '+milk', age: 0, kind: 'food' });
  }

  // neighbours
  if (has(s, 'share') && s.bce <= s.shareReady && (s.water < 15 || s.food < 15)) {
    if (s.water < 15) { credit(s, 'share', 42 - s.water, 0); s.water = 42; } else { credit(s, 'share', 0, 42 - s.food); s.food = 42; }
    s.shareReady = s.bce - 600;
    s.events.push({ bce: s.bce, text: 'Neighbours helped' });
    s.fx.push({ x: PLAYER_X, y: s.y - 70, text: 'Neighbours helped', age: 0, kind: 'water' });
  }

  // trade: surplus flows to whatever is short, with a loss
  if (has(s, 'trade')) {
    const gap = s.water - s.food;
    if (Math.abs(gap) > 15) {
      const amt = Math.min(3 * dt, Math.abs(gap) / 2);
      if (gap > 0) { s.water -= amt; s.food += amt * 0.85; credit(s, 'trade', -amt, amt * 0.85); }
      else { s.food -= amt; s.water += amt * 0.85; credit(s, 'trade', amt * 0.85, -amt); }
    }
  }

  // movement
  s.vy += 1900 * dt; s.y += s.vy * dt;
  if (s.y >= GROUND) { s.y = GROUND; s.vy = 0; s.onGround = true; }
  if (s.hurt > 0) s.hurt -= dt;
  const dx = SPEED * dt;
  for (const th of s.things) th.x -= dx;
  s.lastHazardX -= dx;
  s.spawnClock -= dt;
  if (s.spawnClock <= 0) { spawn(s, 1000); s.spawnClock = 0.42 + rand(s) * 0.3; }

  // contact
  const px = PLAYER_X - 12, pw = 24, ph = 46, py = s.y - ph;
  for (const th of s.things) {
    if (th.taken || th.x > px + pw || th.x + th.w < px) continue;
    if (py + ph < th.y + 4 || py > th.y + th.h) continue;
    if (isHazard(th.kind)) {
      if (s.hurt <= 0) { s.water -= 8; s.food -= 8; s.hurt = 0.8; th.taken = true; s.fx.push({ x: PLAYER_X, y: s.y - 60, text: '−8 water, −8 food', age: 0, kind: 'hurt' }); }
    } else {
      const [w, f] = value(s, th.kind);
      for (const id of s.chosen) {
        if (th.bonus === id) { credit(s, id, w, f); continue; }
        const [w0, f0] = value(s, th.kind, id);
        if (w !== w0 || f !== f0) credit(s, id, w - w0, f - f0);
      }
      s.water = Math.min(100, s.water + w); s.food = Math.min(100, s.food + f);
      th.taken = true;
      s.fx.push({ x: th.x + th.w / 2, y: th.y - 6, text: w ? `+${Math.round(w)} water` : `+${Math.round(f)} food`, age: 0, kind: w ? 'water' : 'food' });
    }
  }
  for (const f of s.fx) { f.age += dt; f.x -= dx * 0.4; f.y -= 30 * dt; }
  s.fx = s.fx.filter((f) => f.age < 1.1);
  s.things = s.things.filter((th) => th.x + th.w > -40 && !(th.taken && !isHazard(th.kind)));

  if (Math.floor(prev / 50) !== Math.floor(s.bce / 50)) s.log.push({ bce: s.bce, water: s.water, food: s.food, rain: r });
  if (s.water <= 0) { s.water = 0; s.over = 'water'; }
  else if (s.food <= 0) { s.food = 0; s.over = 'food'; }
  else if (s.bce <= END_BCE) s.over = 'won';
}

export const gateDue = (s: State) => !s.over && s.gate < GATES.length && s.bce <= GATES[s.gate];
/** Call when a council opens: options are drawn, then the clock moves to the next one. */
export function council(s: State): StrategyId[] {
  const opts = gateOptions(s);
  s.lastCouncil = s.bce;
  if (s.bce < START_BCE) s.gate++;
  s.councils.push({ bce: s.bce, options: opts, snap: snapshot(s) });
  return opts;
}

function snapshot(s: State): string {
  return JSON.stringify({ ...s, councils: [], log: [], fx: [], events: [] });
}

/** Play the rest of a game automatically: a steady jumper who makes the given later choices when offered. */
export function playOut(snap: string, first: StrategyId, later: StrategyId[], variant = 0): { end: number; won: boolean; low: number } {
  const s: State = JSON.parse(snap);
  s.seed = (s.seed ^ Math.imul(variant + 1, 0x9e3779b1)) | 0;
  choose(s, first);
  const dt = 1 / 30;
  while (!s.over) {
    if (gateDue(s)) {
      const opts = council(s);
      const id = later.find((p) => opts.includes(p) && !has(s, p)) ?? opts[0];
      if (id) choose(s, id);
    }
    for (const th of s.things) {
      const d = th.x - (PLAYER_X + 12);
      if (isHazard(th.kind) && d > 30 && d < 50) jump(s);
      if (th.kind === 'game' && d > -5 && d < 15) jump(s);
    }
    step(s, dt);
  }
  return { end: Math.max(END_BCE, s.bce), won: s.over === 'won', low: Math.min(s.water, s.food) };
}

export interface Review { bce: number; picked: StrategyId; best: StrategyId; years: number; verdict: 'best' | 'close' | 'worse'; }
export const REPLAYS = 4;

/** For every council, replay the rest of history with each option on offer and compare. */
export function hindsight(s: State): Review[] {
  const picks = s.councils.map((c) => c.picked).filter(Boolean) as StrategyId[];
  return s.councils.filter((c) => c.picked).map((c, i) => {
    const later = picks.slice(i + 1);
    const lasted: Record<string, number> = {};
    const score: Record<string, number> = {};
    for (const o of c.options) {
      let y = 0, sc = 0;
      for (let v = 0; v < REPLAYS; v++) {
        const r = playOut(c.snap, o, later, v);
        y += START_BCE - r.end; sc += (START_BCE - r.end) + (r.won ? r.low * 4 : 0);
      }
      lasted[o] = y / REPLAYS; score[o] = sc / REPLAYS;
    }
    const best = c.options.reduce((a, b) => (score[b] > score[a] ? b : a));
    const picked = c.picked!;
    const years = Math.round((lasted[best] - lasted[picked]) / 50) * 50; // years lost by not picking the best
    const verdict = best === picked ? 'best' : score[best] - score[picked] < 80 ? 'close' : 'worse';
    return { bce: c.bce, picked, best, years, verdict };
  });
}
