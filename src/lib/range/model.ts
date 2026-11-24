// A toy Sahel rangeland. Pure functions, seeded, no DOM.
//
// One rule drives everything: each year a herd grows when it eats well and shrinks when it goes hungry.
// Families either stay at a well (no walking, a little extra feed) or follow the rain (they walk,
// which costs them, but they can choose where to graze).

export const W = 15; // map columns (west → east)
export const H = 9;  // map rows (north at the top, south at the bottom)
export const N = W * H;
export const TILES = 15; // the map is 15 home ranges of 3×3 squares: one per family

// ---------- random numbers ----------
export function rng(seed: number) {
  let a = seed >>> 0 || 1;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const normal = () => {
    let u = 0;
    while (u === 0) u = next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next());
  };
  const poisson = (lam: number) => {
    const L = Math.exp(-lam);
    let k = 0, p = 1;
    do { k++; p *= next(); } while (p > L);
    return k - 1;
  };
  return { next, normal, poisson };
}
export type Rng = ReturnType<typeof rng>;

// ---------- tunable constants ----------
export const K = {
  storms: 14,       // storms in an average year (each one a blob ~2 squares wide)
  stormR: 2.2,      // storm radius in squares
  r0: 0.15,         // rain below this grows no grass
  grassA: 6,        // grass per square per unit of rain above r0, in animal-years of food
  carry: 0.2,       // share of uneaten grass that is still there next year
  birth: 0.16,      // herd growth in a year with enough food
  death: 0.75,      // herd loss in a year with no food at all
  walk: 0.06,       // yearly cost of walking for movers (lost calves, weak animals, labour)
  wellBonus: 1.25,   // stayers' extra feed (water on hand, crop stubble, a market nearby)
  reach: 7,         // how far movers can walk between camps (squares)
  stops: 3,         // camps a moving family makes in a year
  quit: 8,          // below this many animals a family can no longer live from herding
  start: 40,        // animals each family starts with
  stress: 0.8,      // grazing more than this share of a square's grass wears the land
  wear: 0.12,
  heal: 0.08,
  healthMin: 0.5,
  lendNeed: 13,     // a family below this asks for a loan of animals
  lendSpare: 28,    // a family above this can lend
  lendMax: 6,       // animals per loan
  lendBack: 30,     // a borrower above this starts handing animals back
  grad: 0.3,        // how much wetter the south is than the north
};

// North–south rainfall gradient: the north (top) is drier, like the real Sahel.
export function gradient(y: number) {
  return 1 - K.grad / 2 + K.grad * (y / (H - 1)); // drier north (top), wetter south
}

/** One dial for "how unpredictable is the rain": 0 = steady, 1 = wild.
 *  It sets both the year-to-year swing (cv) and how patchy the storms are. */
export function climate(u: number) {
  return { cv: 0.06 + 0.54 * u, storms: Math.round(6 + 40 * (1 - u) ** 1.5) };
}

// ---------- rain ----------
/** Yearly regional rain as a multiple of normal, mean 1, with coefficient of variation cv. */
export function rainSeries(years: number, cv: number, seed: number, persist = 0): number[] {
  const r = rng(seed * 7919 + 13);
  const s2 = Math.log(1 + cv * cv), s = Math.sqrt(s2);
  const out: number[] = [];
  let z = r.normal();
  for (let t = 0; t < years; t++) {
    if (t > 0) z = persist * z + Math.sqrt(1 - persist * persist) * r.normal();
    out.push(Math.exp(s * z - s2 / 2));
  }
  return out;
}

/** Turn a standardised real index (z) into rain multiples with a given cv. */
export function rainFromZ(z: number[], cv = 0.35): number[] {
  const s2 = Math.log(1 + cv * cv), s = Math.sqrt(s2);
  return z.map((v) => Math.exp(s * v - s2 / 2));
}

/** Spread one year's regional rain over the map as storms. Fewer storms in dry years → patchier. */
export function stormField(R: number, r: Rng, storms = K.storms): Float64Array {
  const f = new Float64Array(N);
  const n = Math.max(1, r.poisson(storms * Math.max(R, 0.05)));
  for (let k = 0; k < n; k++) {
    const cx = r.next() * W, cy = r.next() * H;
    const rad = K.stormR * (0.7 + 0.6 * r.next());
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const d2 = (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2;
        f[y * W + x] += Math.exp(-d2 / (2 * rad * rad));
      }
  }
  let m = 0;
  for (let i = 0; i < N; i++) m += f[i];
  m /= N;
  for (let i = 0; i < N; i++) f[i] = (R * gradient(Math.floor(i / W)) * f[i]) / m;
  return f;
}

// ---------- world ----------
export type Strategy = "stay" | "move";
export interface Family {
  id: number;
  strategy: Strategy;
  herd: number;
  x: number; y: number;        // current camp (movers) or well (stayers)
  tile: number;                // home range (stayers own it; movers only start there)
  camps: { x: number; y: number }[]; // this year's camps, for drawing
  fed: number;                 // last year's food ratio 0..1
  debt: number;                // animals on loan from another family
  lender: number;
  out: boolean;                // stopped herding
  outYear: number;
  history: number[];
}
export interface World {
  year: number;
  rain: Float64Array;
  grass: Float64Array;   // grass grown + carried over, before this year's grazing
  left: Float64Array;    // left after grazing
  health: Float64Array;  // 0.5..1 — land worn by heavy grazing grows less
  closed: Uint8Array;    // 1 = fields, fences or borders: no grazing, no passing
  owned: Int16Array;     // family id that holds this square as its home range, or -1 (open range)
  families: Family[];
  r: Rng;
  rr: Rng;               // separate stream for storms, so worlds with the same seed get the same rain
  lend: boolean;
  lent: number;          // animals passed on by lending this year
  lentTotal: number;
  loans: { from: number; to: number; n: number }[]; // this year's loans, for drawing
  regional: number;      // this year's regional rain (1 = normal)
}

export interface Setup {
  seed: number;
  /** strategy for each of the 15 home ranges, or one for all */
  strategies: Strategy[] | Strategy;
  lend?: boolean;
  closed?: Uint8Array;
  start?: number;
}

export const tileXY = (t: number) => ({ x: (t % 5) * 3 + 1, y: Math.floor(t / 5) * 3 + 1 });

/** Fields spreading up from the wetter south, leaving ragged gaps. share = 0..1 of the map. */
export function closedMask(share: number, seed: number): Uint8Array {
  const m = new Uint8Array(N);
  if (share <= 0) return m;
  const r = rng(seed * 31 + 7);
  const score: { i: number; s: number }[] = [];
  for (let i = 0; i < N; i++) {
    const y = Math.floor(i / W), x = i % W;
    score.push({ i, s: y / H + 0.12 * Math.sin(x * 0.9 + seed) + 0.3 * r.next() });
  }
  score.sort((a, b) => b.s - a.s);
  const k = Math.round(share * N);
  for (let j = 0; j < k; j++) m[score[j].i] = 1;
  return m;
}

export function makeWorld(s: Setup): World {
  const r = rng(s.seed);
  const closed = s.closed ? Uint8Array.from(s.closed) : new Uint8Array(N);
  const owned = new Int16Array(N).fill(-1);
  const families: Family[] = [];
  for (let t = 0; t < TILES; t++) {
    const strategy = typeof s.strategies === "string" ? s.strategies : s.strategies[t];
    const { x, y } = tileXY(t);
    families.push({ id: t, strategy, herd: s.start ?? K.start, x, y, tile: t, camps: [{ x, y }], fed: 1, debt: 0, lender: -1, out: false, outYear: 0, history: [s.start ?? K.start] });
    if (strategy === "stay")
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) owned[(y + dy) * W + x + dx] = t;
  }
  return {
    year: 0, rain: new Float64Array(N), grass: new Float64Array(N), left: new Float64Array(N),
    health: new Float64Array(N).fill(1), closed, owned, families, r, rr: rng(s.seed * 101 + 5),
    lend: !!s.lend, lent: 0, lentTotal: 0, loans: [], regional: 1,
  };
}

/** The 3×3 block around (x,y) that family `id` may graze: open land, or its own home range. */
function zoneCells(x: number, y: number, w: World, id: number): number[] {
  const out: number[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || xx >= W || yy < 0 || yy >= H) continue;
      const i = yy * W + xx;
      if (w.closed[i]) continue;
      if (w.owned[i] >= 0 && w.owned[i] !== id) continue;
      out.push(i);
    }
  return out;
}

/** Squares a mover can reach from (x,y) between camps. Fields and fences block the way;
 *  other families' home ranges can be crossed but not grazed. */
export function reachable(x: number, y: number, closed: Uint8Array, reach = K.reach): number[] {
  const dist = new Int16Array(N).fill(-1);
  const q: number[] = [y * W + x];
  dist[y * W + x] = 0;
  const out: number[] = [];
  for (let h = 0; h < q.length; h++) {
    const i = q[h];
    out.push(i);
    if (dist[i] >= reach) continue;
    const cx = i % W, cy = Math.floor(i / W);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
      const j = ny * W + nx;
      if (dist[j] >= 0 || closed[j]) continue;
      dist[j] = dist[i] + 1;
      q.push(j);
    }
  }
  return out;
}

/** The one rule: how a herd changes in a year, from how well it ate (f = 0..1). */
export function growth(f: number) {
  const ff = Math.max(0, Math.min(1, f));
  return 1 + K.birth * ff - K.death * (1 - ff) * (1 - 0.35 * ff);
}

/** Grow this year's grass from regional rain R (1 = normal). */
export function rainYear(w: World, R: number, storms = K.storms) {
  w.year++;
  w.regional = R;
  w.rain = stormField(R, w.rr, storms);
  for (let i = 0; i < N; i++) {
    const g = w.closed[i] ? 0 : K.grassA * Math.max(0, w.rain[i] - K.r0) * w.health[i];
    w.grass[i] = g + (w.closed[i] ? 0 : K.carry * w.left[i]);
    w.left[i] = w.grass[i];
  }
}

/** Graze the year. `choose` lets a person steer one family: it returns that family's camps. */
export function grazeYear(w: World, choose?: (f: Family, stop: number) => { x: number; y: number } | null) {
  const active = w.families.filter((f) => !f.out);
  const ate = new Map<number, number>();
  const from = new Map<number, number>();
  for (const f of active) { ate.set(f.id, 0); f.camps = []; from.set(f.id, f.y * W + f.x); }
  const before = Float64Array.from(w.left);
  for (let stop = 0; stop < K.stops; stop++) {
    const demand = new Float64Array(N);
    const cells = new Map<number, number[]>();
    for (const f of active)
      if (f.strategy === "stay") {
        const t = tileXY(f.tile);
        const z = zoneCells(t.x, t.y, w, f.id);
        if (stop === 0) f.camps.push({ x: t.x, y: t.y });
        cells.set(f.id, z);
        for (const i of z) demand[i] += f.herd / K.stops / z.length;
      }
    const movers = active.filter((f) => f.strategy === "move");
    for (let k = movers.length - 1; k > 0; k--) {
      const j = Math.floor(w.r.next() * (k + 1));
      [movers[k], movers[j]] = [movers[j], movers[k]];
    }
    for (const f of movers) {
      const want = f.herd / K.stops;
      let bx = f.x, by = f.y;
      const picked = choose ? choose(f, stop) : null;
      if (picked) { bx = picked.x; by = picked.y; }
      else {
        let best = -1;
        for (const i of reachable(f.x, f.y, w.closed)) {
          const x = i % W, y = Math.floor(i / W);
          const z = zoneCells(x, y, w, f.id);
          if (!z.length) continue;
          let g = 0, d = 0;
          for (const c of z) { g += w.left[c]; d += demand[c]; }
          const score = Math.min(2.5, g / (d + want)); // grass per mouth, counting who is already there
          if (score > best + 1e-9) { best = score; bx = x; by = y; }
        }
      }
      f.x = bx; f.y = by;
      f.camps.push({ x: bx, y: by });
      const z = zoneCells(bx, by, w, f.id);
      cells.set(f.id, z);
      for (const i of z) demand[i] += want / z.length;
    }
    for (const f of active) {
      const z = cells.get(f.id)!;
      if (!z.length) continue;
      const want = f.herd / K.stops / z.length;
      let food = 0;
      for (const i of z) food += demand[i] > w.left[i] ? (w.left[i] * want) / demand[i] : want;
      ate.set(f.id, ate.get(f.id)! + food);
    }
    for (let i = 0; i < N; i++) w.left[i] = Math.max(0, w.left[i] - demand[i]);
  }
  for (let i = 0; i < N; i++) {
    if (w.closed[i]) continue;
    const used = before[i] > 0 ? (before[i] - w.left[i]) / before[i] : 0;
    if (used > K.stress) w.health[i] = Math.max(K.healthMin, w.health[i] - K.wear * (used - K.stress) / (1 - K.stress));
    else w.health[i] = Math.min(1, w.health[i] + K.heal);
  }
  for (const f of active) {
    let food = ate.get(f.id)!;
    if (f.strategy === "stay") food *= K.wellBonus;
    f.fed = f.herd > 0 ? Math.min(1, food / f.herd) : 0;
    f.herd *= growth(f.fed);
    // walking costs: only in a year the family actually moved camp
    if (f.strategy === "move" && f.camps.some((c) => c.y * W + c.x !== from.get(f.id))) f.herd *= 1 - K.walk;
  }
  // lending (habbanayé): a family with animals to spare lends breeding stock to one about to drop
  // out. The borrower keeps the calves and hands the animals back once its herd has recovered.
  w.lent = 0;
  w.loans = [];
  if (w.lend) {
    for (const f of active)
      if (f.debt > 0 && f.herd > K.lendBack) {
        const back = Math.min(f.debt, f.herd - K.lendBack);
        const to = w.families[f.lender];
        f.herd -= back; f.debt -= back;
        if (to && !to.out) to.herd += back;
      }
    const needy = active.filter((f) => f.herd < K.lendNeed).sort((a, b) => a.herd - b.herd);
    const gave = new Set<number>();
    for (const n of needy) {
      const giver = active.filter((g) => g.herd > K.lendSpare && !gave.has(g.id)).sort((a, b) => b.herd - a.herd)[0];
      if (!giver) break;
      const gift = Math.min(K.lendNeed - n.herd + 1, giver.herd - K.lendSpare, K.lendMax);
      if (gift <= 0) continue;
      giver.herd -= gift; gave.add(giver.id);
      n.herd += gift; n.debt += gift; n.lender = giver.id;
      w.lent += gift;
      w.loans.push({ from: giver.id, to: n.id, n: gift });
    }
    w.lentTotal += w.lent;
  }
  for (const f of active)
    if (f.herd < K.quit) { f.out = true; f.outYear = w.year; f.herd = 0; }
  for (const f of w.families) f.history.push(f.out ? 0 : f.herd);
}

export function step(w: World, R: number, storms = K.storms) {
  rainYear(w, R, storms);
  grazeYear(w);
}

export function run(s: Setup, rain: number[], storms = K.storms) {
  const w = makeWorld(s);
  for (const R of rain) step(w, R, storms);
  return w;
}

export function tally(w: World, strategy?: Strategy) {
  const fs = strategy ? w.families.filter((f) => f.strategy === strategy) : w.families;
  return {
    families: fs.length,
    herding: fs.filter((f) => !f.out).length,
    animals: fs.reduce((a, f) => a + f.herd, 0),
  };
}

/** Total animals per year for a set of families. */
export function totals(w: World, strategy?: Strategy): number[] {
  const fs = strategy ? w.families.filter((f) => f.strategy === strategy) : w.families;
  const n = w.families[0].history.length;
  const out: number[] = [];
  for (let t = 0; t < n; t++) out.push(fs.reduce((a, f) => a + f.history[t], 0));
  return out;
}

// ---------- recording a run, for drawing ----------
export interface Snap {
  year: number;
  R: number;
  rain: Float64Array;
  grass: Float64Array;
  left: Float64Array;
  fams: { id: number; strategy: Strategy; herd: number; out: boolean; fed: number; camps: { x: number; y: number }[] }[];
  herding: number;
  animals: number;
  lent: number;
  loans: { from: number; to: number; n: number }[];
}
export function record(w: World): Snap {
  return {
    year: w.year, R: w.regional,
    rain: Float64Array.from(w.rain), grass: Float64Array.from(w.grass), left: Float64Array.from(w.left),
    fams: w.families.map((f) => ({ id: f.id, strategy: f.strategy, herd: f.herd, out: f.out, fed: f.fed, camps: f.camps.map((c) => ({ ...c })) })),
    herding: w.families.filter((f) => !f.out).length,
    animals: w.families.reduce((a, f) => a + f.herd, 0),
    lent: w.lent,
    loans: w.loans.map((l) => ({ ...l })),
  };
}
/** Run a whole history and keep every year. snaps[0] is the start, before any rain. */
export function simulate(s: Setup, rain: number[], storms = K.storms): { snaps: Snap[]; world: World } {
  const w = makeWorld(s);
  const snaps = [record(w)];
  for (const R of rain) { step(w, R, storms); snaps.push(record(w)); }
  return { snaps, world: w };
}

/** How many separate pieces the open land is cut into (ignoring single stranded squares). */
export function pieces(closed: Uint8Array): number {
  const seen = new Uint8Array(N);
  let n = 0;
  for (let i = 0; i < N; i++) {
    if (closed[i] || seen[i]) continue;
    let size = 0;
    const q = [i];
    seen[i] = 1;
    for (let h = 0; h < q.length; h++) {
      const c = q[h]; size++;
      const cx = c % W, cy = Math.floor(c / W);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
        const j = ny * W + nx;
        if (closed[j] || seen[j]) continue;
        seen[j] = 1; q.push(j);
      }
    }
    if (size >= 4) n++;
  }
  return n;
}
