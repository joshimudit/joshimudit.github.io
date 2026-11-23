// The rules of the Sahara game. Pure functions on a plain, copyable state, so the page,
// tests and automatic players all use exactly the same rules.
import {
  PLACES, KID_LINKS, wetness, SKILLS, skill, HISTORY, JOBS,
  type PlaceId, type JobId, type SkillId,
} from './world';

export type Level = 1 | 2;
export type Weather = 'good' | 'normal' | 'dry' | 'drought';
export type Plan = Record<JobId, number>; // tokens, 10 in total: each is a tenth of your people

export interface Land { health: number; game: number; aquifer: number; }
export interface Line { tone: 'good' | 'bad' | 'info'; text: string; }
export interface Turn {
  year: number; end: number; place: PlaceId; weather: Weather; plan: Plan;
  pop: number; popAfter: number; herdAfter: number; wet: number;
  lines: Line[]; cause?: string; learned?: SkillId; moved?: PlaceId; events: number[];
}

export interface Game {
  level: Level; year: number; place: PlaceId; pop: number; herd: number; store: number; ties: number;
  skills: SkillId[]; land: Record<string, Land>; seed: number; turns: Turn[];
  firedEvents: number[]; boreholes: boolean; borders: boolean; over: false | 'won' | 'lost';
  visited: PlaceId[]; jobsTried: JobId[];
}

export const START = -8500;
export const endYear = (level: Level) => (level === 1 ? -1500 : 2026);
export function turnLength(g: Pick<Game, 'level' | 'year'>): number {
  if (g.level === 1) return 500;
  if (g.year < -1000) return 250;
  if (g.year < 1800) return 100;
  return 25;
}

export function rand(g: { seed: number }) {
  g.seed = (g.seed + 0x6d2b79f5) | 0;
  let t = Math.imul(g.seed ^ (g.seed >>> 15), 1 | g.seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function newGame(level: Level, seed = Date.now()): Game {
  const land: Record<string, Land> = {};
  for (const id of Object.keys(PLACES)) land[id] = { health: 1, game: 1, aquifer: 1 };
  return {
    level, year: START, place: 'east', pop: 60, herd: 0, store: 30, ties: 0.2,
    skills: [], land, seed: seed | 0, turns: [], firedEvents: [], boreholes: false, borders: false,
    over: false, visited: ['east'], jobsTried: [],
  };
}

export const has = (g: Game, s: SkillId) => g.skills.includes(s);
export const emptyPlan = (): Plan => ({ fish: 0, gather: 0, hunt: 0, herd: 0, farm: 0, trade: 0, ties: 0 });
export const links = (g: Game, at = g.place): PlaceId[] => (g.level === 1 ? KID_LINKS[at] ?? [] : PLACES[at].links);

// ---------- what a place offers ----------
export interface Offer { wet: number; water: number; fish: number; plants: number; game: number; grass: number; farm: number; market: number; }

const WMOD: Record<Weather, number> = { good: 0.12, normal: 0, dry: -0.22, drought: -0.4 };
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));

export function offer(g: Game, at: PlaceId = g.place, weather: Weather = 'normal', year = g.year): Offer {
  const p = PLACES[at], L = g.land[at];
  const m0 = wetness(p, year);
  const m = clamp(m0 + WMOD[weather] * (m0 > 0.05 ? 1 : 0.2));
  const low = weather === 'drought' ? 0.5 : weather === 'dry' ? 0.72 : 1;
  let surface = 0;
  if (at === 'east') surface = clamp((m0 - 0.12) / 0.55) * low;
  if (at === 'lake') surface = (0.12 + 0.88 * wetness({ ...p, lat: 19.5 }, year)) * low;
  if (p.river) surface = p.river * (weather === 'drought' ? 0.7 : weather === 'dry' ? 0.85 : 1);
  const fish = at === 'east' || at === 'lake' ? surface : p.river ? 0.8 * surface : 0;
  let water = Math.max(m * 0.9, surface);
  if (at === 'oasis') water = Math.max(water, 0.55 * L.aquifer);
  if (p.groundwater && has(g, 'wells')) water = Math.max(water, (at === 'oasis' ? 0.85 : 0.4) * L.aquifer);
  if (g.boreholes && ['sahel', 'lake', 'niger', 'east', 'highlands'].includes(at)) water = Math.max(water, 0.9);
  const plants = m * L.health;
  const game = clamp(m * 0.9 + (p.kind === 'savanna' ? 0.2 : 0)) * L.game;
  const grass = m * L.health;
  let farm = 0;
  if (at === 'nile' && has(g, 'nilefarm')) farm = weather === 'drought' ? 0.45 : weather === 'dry' ? 0.7 : 1;
  if (has(g, 'sorghum') && at !== 'oasis') {
    let rf = clamp((m - 0.22) / 0.45) * L.health;
    if (p.river) rf = Math.max(rf, 0.65 * surface);
    farm = Math.max(farm, rf);
  }
  if (at === 'oasis') farm = Math.max(farm, has(g, 'foggara') ? 0.95 * L.aquifer : has(g, 'wells') ? 0.4 * L.aquifer : 0);
  if (has(g, 'trees') && year >= 1983) farm *= 1.2;
  let market = 0.2 + 0.4 * g.ties;
  if (p.hub) market += year >= 1900 ? 0.8 : year >= 1500 ? 0.6 : year >= 800 ? 1.2 : year >= 300 ? 0.5 : year >= -500 ? 0.25 : 0;
  else market += year >= 1900 ? 0.6 : year >= 800 ? 0.3 : 0;
  return { wet: m, water, fish, plants, game, grass, farm, market };
}

/** Food each job brings: per worker, and the most the place can give. */
export function jobRates(g: Game, o: Offer): Record<JobId, { per: number; cap: number }> {
  return {
    fish: { per: 1.35 * o.fish * (has(g, 'harpoons') ? 1.3 : 1), cap: 170 * o.fish },
    gather: { per: 1.0 * o.plants * (has(g, 'pots') ? 1.2 : 1), cap: 240 * o.plants },
    hunt: { per: 1.15 * o.game, cap: 90 * o.game },
    farm: { per: 2.1 * o.farm, cap: 1700 * o.farm },
    trade: { per: 0.9 * o.market, cap: 320 * o.market },
    herd: { per: 0, cap: 0 },
    ties: { per: 0.3, cap: 60 },
  };
}

export const herdPer = (g: Game) => (has(g, 'camels') ? 35 : 25);

export function canDo(g: Game, j: JobId, o = offer(g)): boolean {
  if (j === 'fish') return o.fish > 0.04;
  if (j === 'herd') return g.herd > 0;
  if (j === 'farm') return o.farm > 0.01;
  return true;
}

/** How good a job is here and now, 0–3, for the hints in the game. */
export function stars(g: Game, j: JobId, o = offer(g)): number {
  const r = jobRates(g, o)[j];
  if (j === 'herd') return g.herd ? (o.grass > 0.55 ? 3 : o.grass > 0.35 ? 2 : o.grass > 0.15 ? 1 : 0) : 0;
  if (j === 'ties') return 2;
  const v = r.per;
  return v > 1.25 ? 3 : v > 0.8 ? 2 : v > 0.3 ? 1 : 0;
}

export function skillsOpen(g: Game): SkillId[] {
  return SKILLS.filter((s) => !has(g, s.id) && g.year >= s.from && (s.to === undefined || g.year < s.to)
    && (!s.where || s.where.includes(g.place)) && (!s.needs || has(g, s.needs))).map((s) => s.id);
}

// ---------- one turn ----------
export interface Choice { plan: Plan; move?: PlaceId; learn?: SkillId; boreholes?: boolean; }

function rollWeather(g: Game, at: PlaceId, from: number, to: number): Weather {
  if (g.level === 2) {
    if ((from <= 1974 && to > 1968) || (from <= 1985 && to > 1983)) return 'drought';
    if ((from <= 1913 && to > 1910) || (from <= 1944 && to > 1940)) return 'dry';
  }
  const m0 = wetness(PLACES[at], from);
  const r = rand(g);
  // a long turn is more likely to contain a run of dry years than a short one
  const f = Math.sqrt(Math.max(0.35, Math.min(1.3, turnLength(g) / 250)));
  const pDrought = (0.05 + 0.09 * (1 - m0)) * f;
  const pDry = (0.14 + 0.18 * (1 - m0)) * f;
  if (r < pDrought) return 'drought';
  if (r < pDrought + pDry) return 'dry';
  if (r > 0.76) return 'good';
  return 'normal';
}

export function play(g: Game, c: Choice): Turn {
  const kids = g.level === 1;
  const from = g.year, len = turnLength(g), to = Math.min(endYear(g.level), from + len);
  const lines: Line[] = [];
  const say = (tone: Line['tone'], text: string) => lines.push({ tone, text });
  const pop0 = g.pop;
  let travel = 1;

  if (c.move && links(g).includes(c.move)) {
    g.place = c.move;
    travel = g.borders ? 0.55 : has(g, 'camels') ? 0.8 : 0.7;
    g.herd *= has(g, 'camels') ? 0.95 : 0.88;
    if (!g.visited.includes(c.move)) g.visited.push(c.move);
    say('info', kids ? `You walked to ${PLACES[c.move].kidName.toLowerCase()}. The journey was hard, so you found less food.` : `You moved ${PLACES[c.move].short}. Travelling cost you food this time.`);
  }
  if (c.boreholes !== undefined) g.boreholes = c.boreholes;
  let learned: SkillId | undefined;
  if (c.learn && skillsOpen(g).includes(c.learn)) {
    g.skills.push(c.learn); learned = c.learn;
    if (c.learn === 'cattle') g.herd += Math.max(30, g.pop * 0.6);
    if (c.learn === 'camels') g.herd += Math.max(20, g.pop * 0.3);
    if (c.learn === 'goats') g.herd += g.pop * 0.3;
    say('good', kids ? `Your people learned something new: ${skill(c.learn).name.toLowerCase()}.` : `New skill: ${skill(c.learn).name.toLowerCase()}. ${skill(c.learn).gives}`);
  }

  const at = g.place, p = PLACES[at], L = g.land[at];
  const weather = rollWeather(g, at, from, to);
  const o = offer(g, at, weather, from);
  const rates = jobRates(g, o);
  const plan = { ...c.plan };
  for (const j of JOBS) if (!canDo(g, j.id, o) && plan[j.id]) { plan.gather += plan[j.id]; plan[j.id] = 0; }
  const share = (j: JobId) => plan[j] / 10;
  for (const j of JOBS) if (plan[j.id] && !g.jobsTried.includes(j.id)) g.jobsTried.push(j.id);

  if (weather === 'good') say('good', kids ? 'Good rains! Everything grew well.' : 'Good rains this time.');
  if (weather === 'dry') say('bad', kids ? 'A dry spell: the rain stopped for years.' : 'A dry spell: the rains failed for years.');
  if (weather === 'drought') say('bad', kids ? 'A terrible drought: almost no rain.' : 'A severe drought.');

  // food from each job
  const got: Partial<Record<JobId, number>> = {};
  let food = 0;
  for (const j of ['fish', 'gather', 'hunt', 'farm', 'trade', 'ties'] as JobId[]) {
    if (!plan[j]) continue;
    let v = Math.min(g.pop * share(j) * rates[j].per, rates[j].cap);
    got[j] = v; food += v;
  }
  // locusts sometimes strike fields
  if (got.farm && from > -3000 && rand(g) < 0.07) {
    food -= got.farm * 0.6; got.farm *= 0.4;
    say('bad', kids ? 'Locusts! A huge swarm ate your crops.' : 'A locust swarm ate most of your crops.');
    if (!g.firedEvents.includes(-1)) g.firedEvents.push(-1);
  }
  // the herd
  let herdFood = 0;
  const herd0 = g.herd;
  if (g.herd > 0) {
    const perHerder = herdPer(g);
    const managed = kids ? g.herd : Math.min(g.herd, g.pop * share('herd') * perHerder);
    const lost = g.herd - managed;
    herdFood = managed * 0.32;
    food += herdFood; got.herd = herdFood;
    g.herd = managed + lost * 0.6;
    let rate = o.grass > 0.3 ? 0.45 * Math.min(1, (o.grass - 0.3) / 0.4) : -0.5 * (0.3 - o.grass) / 0.3;
    if (weather === 'drought') rate -= has(g, 'goats') ? 0.15 : 0.35;
    if (weather === 'dry') rate -= has(g, 'goats') ? 0.05 : 0.12;
    if (p.tsetse) rate -= 0.35;
    if (o.water + (has(g, 'camels') ? 0.2 : 0) < 0.2) rate -= 0.4;
    g.herd *= 1 + rate;
    const cap = o.grass * p.grassK * (g.boreholes && at !== 'nile' ? 1.4 : 1) + 10;
    if (g.herd > cap) {
      L.health = clamp(L.health - 0.12 * Math.min(2, g.herd / cap - 1));
      g.herd = Math.min(g.herd, cap * 1.15);
      if (g.herd > 40) say('bad', kids ? 'Too many animals ate the grass down to the dirt.' : 'Overgrazing: your herd is wearing out the land.');
    }
    if (g.boreholes && g.herd > 200) L.health = clamp(L.health - 0.05);
    if (p.tsetse && herd0 > 10) say('bad', kids ? 'Tsetse flies made your cattle sick.' : 'Tsetse flies are killing your cattle.');
    if (g.herd < 3) g.herd = 0;
  }
  food *= travel;
  if (learned) food *= 0.9;

  // job results in words
  const verdict = (j: JobId, good: string, bad: string) => {
    if (!plan[j] || got[j] === undefined) return;
    const per = (got[j]! / Math.max(1, g.pop * share(j)));
    const want = j === 'farm' ? 1.4 : j === 'trade' ? 0.8 : 1;
    if (per >= want) say('good', good); else if (per < want * 0.55) say('bad', bad);
  };
  if (kids) {
    verdict('fish', 'Lots of fish in the lake!', o.fish < 0.3 ? 'The water is shrinking, so there were few fish.' : 'Your fishers caught little.');
    verdict('gather', 'Plenty of wild grain to gather.', 'Little wild grain grew this time.');
    verdict('hunt', 'Good hunting.', 'Few animals to hunt.');
    verdict('farm', 'Your fields gave a big harvest!', 'Your fields dried out.');
  } else {
    verdict('fish', 'Your fishers did well.', o.fish < 0.3 ? 'Your fishers caught little: the water is shrinking.' : 'Your fishers caught little.');
    verdict('gather', 'Gatherers found plenty.', 'Little wild food to gather.');
    verdict('hunt', 'Good hunting.', L.game < 0.6 ? 'Hunting is poor: you have hunted out the game.' : 'Hunting is poor here now.');
    verdict('farm', 'A big harvest.', weather === 'drought' || weather === 'dry' ? 'The harvest failed in the dry years.' : 'Poor harvests.');
    verdict('trade', 'Trading brought in plenty.', 'Little to gain from trade here.');
  }
  if (g.herd > herd0 * 1.15 && herd0 > 0) say('good', kids ? 'Your herd grew bigger.' : 'Your herd grew.');
  else if (g.herd < herd0 * 0.75 && herd0 > 0) say('bad', kids ? 'Many of your animals died.' : 'Your herd shrank.');

  // land and wildlife
  if (share('hunt') > 0 && (got.hunt ?? 0) > 0.7 * rates.hunt.cap) L.game = clamp(L.game - 0.15);
  L.game = clamp(L.game + (1 - L.game) * 0.12);
  const cent = len / 100;
  if (share('farm') >= 0.5 && at !== 'nile') { L.health = clamp(L.health - 0.035 * cent * (share('farm') / 0.5)); if (L.health < 0.7) say('bad', kids ? 'The soil is getting tired from farming.' : 'The soil is wearing out from constant farming.'); }
  L.health = clamp(L.health + (1 - L.health) * Math.min(0.6, 0.15 * cent * (has(g, 'trees') ? 2.5 : 1)));
  if (at === 'oasis' && has(g, 'foggara') && share('farm') > 0) L.aquifer = clamp(L.aquifer - 0.05 * share('farm') * len / 100 * 3);
  if (g.boreholes) L.aquifer = clamp(L.aquifer - 0.01);

  // feeding everyone
  const need = g.pop;
  let fed = food;
  const storeCap = g.pop * (0.15 + (has(g, 'pots') ? 0.35 : 0) + (has(g, 'granary') ? 0.6 : 0));
  if (fed >= need) {
    g.store = Math.min(storeCap, g.store + (fed - need) * 0.5);
  } else {
    let gap = need - fed;
    const fromStore = Math.min(g.store, gap); g.store -= fromStore; gap -= fromStore;
    if (fromStore > 2) say('info', kids ? 'Food you had stored helped.' : 'Stored food helped you through.');
    const fromTies = Math.min(gap, g.ties * 0.5 * g.pop);
    if (fromTies > 2) {
      g.ties = clamp(g.ties - (fromTies / g.pop) * 0.8); gap -= fromTies;
      say('good', kids ? 'Your neighbours shared food with you!' : 'Neighbours shared food with you.');
    }
    fed = need - gap;
  }
  g.ties = clamp(g.ties * 0.88 + 0.5 * share('ties'));
  const ratio = fed / need;
  let cause: string | undefined;
  if (ratio >= 1) {
    const gmax = kids ? 0.35 : 0.12 + 0.08 * len / 100;
    g.pop *= 1 + gmax * Math.min(1, (ratio - 1) / 0.35);
  } else {
    g.pop *= 1 - 0.6 * (1 - ratio);
    if (weather === 'drought' || weather === 'dry') cause = share('farm') >= 0.4 ? 'a drought hit while most of your people farmed' : 'a drought left too little food';
    else if (share('fish') >= 0.4 && o.fish < 0.35) cause = 'the water shrank while most of your people fished';
    else if (herd0 > 0 && g.herd < herd0 * 0.6) cause = 'your herd collapsed';
    else if (travel < 1) cause = 'a hard journey';
    else cause = 'there was not enough food';
  }
  const wEff = o.water + (has(g, 'camels') ? 0.2 : 0);
  if (wEff < 0.22) {
    g.pop *= 1 - Math.min(0.7, (0.22 - wEff) * 3.5);
    say('bad', kids ? 'There wasn’t enough water, so some families left.' : 'Too little water: families left to find some.');
    cause = 'there was not enough water';
  }
  if (o.wet < 0.35 && !p.river && g.pop >= 8) {
    const better = links(g).filter((id) => wetness(PLACES[id], from) > o.wet + 0.15 || PLACES[id].river);
    if (better.length) say('info', kids ? `It is getting dry here. Other families are leaving for ${better.map((id) => PLACES[id].kidName.toLowerCase()).join(' or ')}.` : `It is drying out here. Families are leaving for ${better.map((id) => PLACES[id].name.replace(/^The /, 'the ')).join(' or ')}.`);
  }
  if (g.pop > pop0 * 1.05) say('good', kids ? `Your group grew to ${Math.round(g.pop)} people!` : `Your people grew to ${Math.round(g.pop)}.`);
  else if (g.pop < pop0 * 0.95) say('bad', kids ? `${Math.round(pop0 - g.pop)} people left or died.` : `Hunger: ${Math.round(pop0 - g.pop)} people left or died.`);
  else say('info', kids ? 'Your group stayed about the same size.' : 'Your numbers held steady.');

  g.year = to;
  // history
  const events: number[] = [];
  if (!kids) {
    HISTORY.forEach((e, i) => {
      if (e.year > from && e.year <= to && !g.firedEvents.includes(i)) {
        g.firedEvents.push(i); events.push(i);
        if (e.year === 1890 && g.herd > 0) { g.herd *= 0.15; say('bad', 'Cattle plague: most of your herd died.'); cause = cause ?? 'cattle plague killed your herd'; }
        if (e.year === 1900) g.borders = true;
      }
    });
  } else {
    HISTORY.forEach((e, i) => { if ((e.year === -5300 || e.year === -3500) && e.year > from && e.year <= to) { g.firedEvents.push(i); events.push(i); } });
  }
  if (g.pop < 8) { g.over = 'lost'; g.pop = 0; }
  else if (g.year >= endYear(g.level)) g.over = 'won';

  const turn: Turn = { year: from, end: to, place: at, weather, plan, pop: pop0, popAfter: g.pop, herdAfter: g.herd, wet: o.wet, lines, cause, learned, moved: c.move, events };
  g.turns.push(turn);
  return turn;
}

// ---------- story mode cards ----------
export interface Card { id: string; kind: 'job' | 'skill' | 'move' | 'ties'; job?: JobId; skill?: SkillId; to?: PlaceId; title: string; sub: string; }

export function kidCards(g: Game): Card[] {
  const o = offer(g);
  const jobs: Card[] = [];
  const sub: Record<string, string> = {
    fish: 'Catch fish in the water nearby.', gather: 'Collect seeds of wild grasses.', hunt: 'Hunt gazelles and other animals.',
    herd: 'Take your animals to good grass.', farm: 'Plant and look after your crops.',
  };
  for (const j of ['fish', 'gather', 'hunt', 'herd', 'farm'] as JobId[]) {
    if (!canDo(g, j, o) || (j === 'herd')) continue;
    jobs.push({ id: j, kind: 'job', job: j, title: JOBS.find((x) => x.id === j)!.kid, sub: sub[j] });
  }
  const change: Card[] = [];
  for (const s of skillsOpen(g)) if (['pots', 'harpoons', 'cattle', 'sorghum', 'wells', 'goats', 'nilefarm'].includes(s)) change.push({ id: s, kind: 'skill', skill: s, title: skill(s).verb, sub: skill(s).gives });
  for (const to of links(g)) change.push({ id: 'move-' + to, kind: 'move', to, title: `Walk to ${PLACES[to].kidName.toLowerCase()}`, sub: kidWhere(to, g) });
  change.push({ id: 'ties', kind: 'ties', title: 'Visit neighbours', sub: 'Make friends who will help you in hard times.' });
  const pick = <T,>(arr: T[]) => arr.splice(Math.floor(rand(g) * arr.length), 1)[0];
  const out: Card[] = [];
  const js = [...jobs], cs = [...change];
  if (js.length) out.push(pick(js));
  // when home is drying, always offer a way out to the wettest place
  const moves = cs.filter((c) => c.kind === 'move');
  if (o.wet < 0.45 && moves.length) {
    const val = (c: Card) => wetness(PLACES[c.to!], g.year) + (c.to === 'nile' ? 0.5 : 0);
    const best = moves.sort((a, b) => val(b) - val(a))[0];
    out.push(best); cs.splice(cs.indexOf(best), 1);
  } else if (cs.length) out.push(pick(cs));
  const rest = [...js, ...cs];
  if (rest.length) out.push(pick(rest));
  return out;
}

function kidWhere(to: PlaceId, g: Game): string {
  const w = wetness(PLACES[to], g.year);
  if (to === 'nile') return 'The river never dries up. But others live there too.';
  return w > 0.7 ? 'People say it is green there.' : w > 0.35 ? 'People say there is some grass there.' : 'People say it is very dry there.';
}

export function kidChoice(g: Game, card: Card): Choice {
  const plan = emptyPlan();
  if (card.kind === 'job') {
    plan[card.job!] = 7;
    plan[card.job === 'gather' ? 'hunt' : 'gather'] = 3;
    return { plan };
  }
  plan.gather = 6; plan.hunt = 4;
  if (card.kind === 'ties') { plan.ties = 4; plan.gather = 6; plan.hunt = 0; return { plan }; }
  if (card.kind === 'move') return { plan, move: card.to };
  return { plan, learn: card.skill };
}

// ---------- the ending ----------
export interface Story { title: string; like: string; turning: { year: number; place: PlaceId; lost: number; cause: string }[]; best?: { year: number; place: PlaceId; gain: number }; shares: Record<JobId, number>; }

export function story(g: Game): Story {
  const shares = emptyPlan();
  let n = 0;
  for (const t of g.turns) { for (const j of JOBS) shares[j.id] += t.plan[j.id] / 10; n++; }
  for (const j of JOBS) shares[j.id] /= Math.max(1, n);
  const recent = g.turns.slice(-6);
  const rs = emptyPlan();
  for (const t of recent) for (const j of JOBS) rs[j.id] += t.plan[j.id];
  const top = (Object.keys(rs) as JobId[]).filter((j) => j !== 'ties').sort((a, b) => rs[b] - rs[a])[0];
  const at = g.place;
  const H = (s: SkillId) => has(g, s);
  let title = 'You found your own way', like = 'a mix of ways of life, as many real groups had';
  if (top === 'farm' && at === 'nile') { title = 'You became Nile farmers'; like = 'the farmers of the Nile valley, whose harvests fed ancient Egypt'; }
  else if (top === 'farm' && at === 'oasis') { title = 'You became oasis farmers'; like = 'the oasis farmers of the Fezzan, like the Garamantes'; }
  else if (top === 'farm') { title = 'You became farmers'; like = 'the sorghum and millet farmers of the Sahel and savanna, whose villages are still there'; }
  else if ((top === 'herd' || g.herd > 50) && H('camels')) { title = 'You became camel herders'; like = 'the camel herders of the central Sahara, such as the Tuareg'; }
  else if (top === 'herd' || g.herd > 50) { title = 'You became herders'; like = at === 'sahel' || at === 'lake' ? 'the cattle herders of the Sahel, such as the Fulani' : 'the cattle herders who spread across the Sahara before farming'; }
  else if (top === 'trade') { title = 'You became traders'; like = 'the traders of the caravan towns, such as Timbuktu'; }
  else if (top === 'fish') { title = 'You lived by the water'; like = at === 'lake' ? 'the fishing communities of Lake Chad' : 'the lakeside foragers of the Green Sahara'; }
  else if (top === 'gather' || top === 'hunt') { title = 'You stayed foragers'; like = 'the foragers of the Green Sahara, who lived from wild food'; }
  if (g.over === 'lost') title = title.replace(/^You (became|stayed|lived|found)/, (m) => m) + ', until your people scattered';
  const turning = g.turns.filter((t) => t.popAfter < t.pop * 0.88)
    .map((t) => ({ year: t.year, place: t.place, lost: 1 - t.popAfter / t.pop, cause: t.cause ?? 'hard times' }))
    .sort((a, b) => b.lost - a.lost).slice(0, 3).sort((a, b) => a.year - b.year);
  const bestT = [...g.turns].sort((a, b) => b.popAfter / b.pop - a.popAfter / a.pop)[0];
  const best = bestT && bestT.popAfter > bestT.pop * 1.15 ? { year: bestT.year, place: bestT.place, gain: bestT.popAfter / bestT.pop - 1 } : undefined;
  return { title, like, turning, best, shares };
}
