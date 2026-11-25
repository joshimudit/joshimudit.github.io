// Patch: a small process-based vegetation model for teaching.
// It is written from scratch from published equations. It is inspired by the LPJ family of
// models (Sitch et al. 2003; Bondeau et al. 2007; Schaphoff et al. 2018) but shares no code
// with them, is far simpler, and is not a research model.
//
// One patch of land, one step per day:
//   light capture (Monsi & Saeki 1953) -> photosynthesis (Farquhar et al. 1980; Collatz et al. 1992,
//   in the light-use form of Haxeltine & Prentice 1996) -> water supply against demand (Sitch et al. 2003,
//   demand from Priestley & Taylor 1972) -> respiration (Lloyd & Taylor 1994) -> growth, leaf fall, death.
import type { Site } from './sites';

// ---------- plant types ----------
export type PftId = 'c4grass' | 'c3grass' | 'troptree' | 'temptree' | 'c4crop' | 'c3crop';
export interface Pft {
  id: PftId; name: string; c4: boolean; tree: boolean; crop: boolean;
  tl: [number, number, number, number]; // temperature limits for photosynthesis, °C (after Sitch et al. 2003, Table 2)
  roots: [number, number];              // share of roots in the top and the deep soil layer
  sla: number;                          // leaf area per gram of leaf carbon, m2/gC
  alloc: [number, number, number];      // share of new growth to leaves, roots, wood
  turn: [number, number, number];       // share of leaves, roots, wood lost per year
  resp: number;                         // maintenance respiration of leaves and roots at 10 °C, per day
  respWood: number;
  cold: boolean;                        // sheds leaves when cold (true) or only when dry (false)
}
export const PFT: Record<PftId, Pft> = {
  c4grass:  { id: 'c4grass',  name: 'savanna grass', c4: true,  tree: false, crop: false, tl: [6, 20, 45, 55],  roots: [0.9, 0.1], sla: 0.030, alloc: [0.4, 0.6, 0],     turn: [2, 1, 0],      resp: 0.0011, respWood: 0, cold: false },
  c3grass:  { id: 'c3grass',  name: 'cool-season grass', c4: false, tree: false, crop: false, tl: [-4, 10, 30, 45], roots: [0.9, 0.1], sla: 0.030, alloc: [0.4, 0.6, 0],     turn: [2, 1, 0],      resp: 0.0026, respWood: 0, cold: true },
  troptree: { id: 'troptree', name: 'tropical tree', c4: false, tree: true,  crop: false, tl: [2, 25, 30, 55],  roots: [0.6, 0.4], sla: 0.020, alloc: [0.35, 0.25, 0.4], turn: [2, 1, 0.025],  resp: 0.0016, respWood: 0.000013, cold: false },
  temptree: { id: 'temptree', name: 'broadleaf tree', c4: false, tree: true,  crop: false, tl: [-4, 20, 25, 38], roots: [0.7, 0.3], sla: 0.020, alloc: [0.35, 0.25, 0.4], turn: [2, 1, 0.025],  resp: 0.0026, respWood: 0.000018, cold: true },
  c4crop:   { id: 'c4crop',   name: 'millet',  c4: true,  tree: false, crop: true, tl: [6, 20, 45, 55],  roots: [0.9, 0.1], sla: 0.030, alloc: [0.6, 0.4, 0], turn: [0, 0, 0], resp: 0.00045, respWood: 0, cold: false },
  c3crop:   { id: 'c3crop',   name: 'wheat',   c4: false, tree: false, crop: true, tl: [-4, 10, 30, 45], roots: [0.9, 0.1], sla: 0.030, alloc: [0.6, 0.4, 0], turn: [0, 0, 0], resp: 0.0011, respWood: 0, cold: false },
};

// ---------- constants (all from the cited papers unless marked "toy") ----------
export const C = {
  k: 0.5,            // light extinction coefficient (Monsi & Saeki 1953; value used in LPJ)
  alphaC3: 0.08,     // mol CO2 fixed per mol light, C3 plants (Sitch et al. 2003)
  alphaC4: 0.053,    // same for C4 plants (Sitch et al. 2003)
  alphaA: 0.5,       // leaf-to-canopy scaling (Haxeltine & Prentice 1996)
  lambda: 0.8,       // CO2 inside the leaf as a share of CO2 in the air, C3 (Sitch et al. 2003)
  molPerMJ: 4.6,     // mol of light per MJ of photosynthetically active radiation
  emax: 5,           // most water roots can deliver, mm per day (Sitch et al. 2003)
  alphaPT: 1.32,     // Priestley-Taylor coefficient as used for demand (toy: single value)
  couple: 0.3,       // how strongly leaf pores control water loss (toy; idea from Jarvis & McNaughton 1986)
  growthResp: 0.25,  // share of new carbon burnt to build tissue (Sitch et al. 2003)
  cap: [60, 120],    // plant-available water each soil layer can hold, mm (toy: one sandy-loam soil everywhere)
  co2ref: 420,       // CO2 in the air in recent years, ppm
  kSoil10: 1 / (25 * 365), // soil carbon decay at 10 °C in moist soil, per day (toy: one pool)
  quitNpp: 0,        // a tree type with a negative yearly carbon balance loses part of its biomass
};

// ---------- the rules, as small functions the page can show one at a time ----------
/** Rule 1. Share of light caught by L layers of leaves (Beer's law; Monsi & Saeki 1953). */
export const lightCaught = (L: number) => 1 - Math.exp(-C.k * L);

/** CO2 level at which photosynthesis only just balances photorespiration, ppm (Bernacchi et al. 2001). */
export const gammaStar = (T: number) => 42.75 * Math.exp((37830 * (T - 25)) / (298.15 * 8.314 * (T + 273.15)));

/** Rule 2 and 4. Sugar made per unit of light caught, gC per MJ, before temperature limits and water. */
export function lightUse(c4: boolean, T: number, co2: number) {
  const base = C.alphaA * C.molPerMJ * 12;
  if (c4) return base * C.alphaC4; // C4 plants pump CO2 into the leaf, so they neither gain from more CO2 nor lose to heat
  const ci = C.lambda * co2, g = gammaStar(T);
  return base * C.alphaC3 * Math.max(0, (ci - g) / (ci + 2 * g));
}

/** Rule 2. Too cold or too hot: 0 outside the limits, 1 in the comfortable range. */
export function tempLimit(tl: [number, number, number, number], T: number) {
  if (T <= tl[0] || T >= tl[3]) return 0;
  if (T < tl[1]) return (T - tl[0]) / (tl[1] - tl[0]);
  if (T > tl[2]) return (tl[3] - T) / (tl[3] - tl[2]);
  return 1;
}

/** Rule 3. How much water the air asks for, mm per day (Priestley & Taylor 1972; radiation after Prentice et al. 1993). */
export function thirst(Rs: number, T: number, sunFrac: number) {
  const netLong = (0.2 + 0.8 * sunFrac) * (107 - T) * 0.0864;
  const Rn = Math.max(0, 0.83 * Rs - netLong);
  const es = 0.6108 * Math.exp((17.27 * T) / (T + 237.3));
  const slope = (4098 * es) / Math.pow(T + 237.3, 2);
  return (C.alphaPT * (slope / (slope + 0.066)) * Rn) / 2.45;
}

/** Rule 4. How much less water a leaf loses when there is more CO2 in the air (1 = today). */
export function poreFactor(c4: boolean, T: number, co2: number) {
  const gain = c4 ? 1 : lightUse(false, T, co2) / lightUse(false, T, C.co2ref);
  return 1 - C.couple + C.couple * gain * (C.co2ref / co2);
}

/** Rule 5. How much faster living tissue burns sugar when warm (1 at 10 °C; Lloyd & Taylor 1994). */
export const breathing = (T: number) => (T <= -40 ? 0 : Math.exp(308.56 * (1 / 56.02 - 1 / (T + 46.02))));

// ---------- weather ----------
const MD = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MID: number[] = []; { let d = 0; for (const m of MD) { MID.push(d + m / 2); d += m; } }
function interp(a: number[], doy: number) {
  let m = 0;
  while (m < 12 && MID[m] < doy) m++;
  const i0 = (m + 11) % 12, i1 = m % 12;
  const d0 = m === 0 ? MID[11] - 365 : MID[i0], d1 = m === 12 ? MID[0] + 365 : MID[i1];
  return a[i0] + ((a[i1] - a[i0]) * (doy - d0)) / (d1 - d0);
}
export function monthOf(doy: number) { let m = 0, d = MD[0]; while (doy >= d && m < 11) { m++; d += MD[m]; } return m; }

export function rng(seed: number) {
  let a = seed >>> 0 || 1;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Sunshine at the top of the air and day length, from latitude and day of year (Allen et al. 1998, FAO-56). */
export function sunGeometry(lat: number, doy: number) {
  const phi = (lat * Math.PI) / 180, J = doy + 1;
  const dr = 1 + 0.033 * Math.cos((2 * Math.PI * J) / 365), dec = 0.409 * Math.sin((2 * Math.PI * J) / 365 - 1.39);
  const ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(dec))));
  const Ra = ((24 * 60) / Math.PI) * 0.082 * dr * (ws * Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.sin(ws));
  return { Ra: Math.max(0, Ra), dayLength: (24 / Math.PI) * ws };
}

export interface Scen { dT: number; rain: number; co2: number; sow?: number; variety?: number }
export const BASE: Scen = { dT: 0, rain: 1, co2: C.co2ref, sow: 0, variety: 1 };

export interface Day { T: number; P: number; par: number; pet: number }
/** One year of daily weather. The same seed and year give the same rainy days in every scenario. */
export function weatherYear(site: Site, scen: Scen, seed: number, year: number): Day[] {
  const r = rng(seed * 1000 + year * 7 + 3), out: Day[] = [];
  for (let d = 0; d < 365; d++) {
    const m = monthOf(d), Pm = site.P[m];
    const size = 7 + 0.03 * Pm, pWet = Math.min(0.85, Pm / (size * MD[m]));
    const u1 = r(), u2 = r(), u3 = r(), u4 = r();
    const wet = u1 < pWet;
    const P = wet ? -Math.log(1 - u2 * 0.999) * (Pm / (pWet * MD[m])) * scen.rain : 0;
    const T = interp(site.T, d) + scen.dT + 1.6 * Math.sqrt(-2 * Math.log(u3 + 1e-9)) * Math.cos(2 * Math.PI * u4);
    const { Ra, dayLength } = sunGeometry(site.lat, d);
    const sunFrac = Math.max(0.05, Math.min(1, interp(site.sun, d) / 30.4 / Math.max(dayLength, 1)));
    const cloud = wet ? 0.8 : (1 - 0.8 * pWet) / (1 - pWet);
    const Rs = (0.25 + 0.5 * sunFrac) * Ra * cloud; // Angström formula (Allen et al. 1998)
    out.push({ T, P, par: 0.5 * Rs, pet: thirst(Rs, T, sunFrac) });
  }
  return out;
}

// ---------- the patch ----------
export interface Plant { pft: Pft; leaf: number; root: number; wood: number; phen: number; grain: number; phu: number; days: number; growing: boolean }
export interface YearOut {
  gpp: number; npp: number; rain: number; transp: number; evap: number; runoff: number;
  tree: number; grass: number;         // share of the ground shaded at the leafiest time of year
  lai: number; vegC: number; litter: number; decay: number;
  yield: number; season: number;       // crop: tonnes of grain per hectare, days from sowing to harvest
  brake: number;                       // growing-season mean of the water brake (1 = never thirsty)
}
export interface DayOut { T: number; P: number; par: number; pet: number; w1: number; w2: number; gpp: number; resp: number; transp: number; evap: number; brake: number; laiTree: number; laiGrass: number; coverTree: number; coverGrass: number; grain: number; caught: number }
export interface Result { years: YearOut[]; daily: DayOut[]; mean: YearOut & { soilC: number }; types: string[]; tropical: boolean; sowDay: number }

export interface Opts { years?: number; seed?: number; land?: 'natural' | 'crop'; average?: number }

function seedling(pft: Pft): Plant { return { pft, leaf: pft.tree ? 3 : 4, root: pft.tree ? 3 : 6, wood: pft.tree ? 5 : 0, phen: 0, grain: 0, phu: 0, days: 0, growing: !pft.crop }; }

/** Warm places get tropical plant types, cool places temperate ones (the 15.5 °C rule of Sitch et al. 2003). */
export const isTropical = (site: Site, dT = 0) => Math.min(...site.T) + dT >= 15.5;

/** When farmers sow: at the start of the four months that are wettest while still warm enough to grow. */
export function sowingDay(site: Site) {
  let best = 0, bestScore = -1;
  for (let m = 0; m < 12; m++) {
    let sc = 0;
    for (let k = 0; k < 4; k++) { const i = (m + k) % 12; sc += Math.min(site.P[i], 100) * Math.max(0, Math.min(1, (site.T[i] - 5) / 10)); }
    if (sc > bestScore + 1e-9) { bestScore = sc; best = m; }
  }
  let d = 0; for (let i = 0; i < best; i++) d += MD[i];
  return d + 5;
}

export function runPatch(site: Site, scen: Scen = BASE, opts: Opts = {}): Result {
  const years = opts.years ?? 220, seed = opts.seed ?? 11, land = opts.land ?? 'natural', avgN = Math.min(opts.average ?? 40, years);
  const tropical = isTropical(site, scen.dT);
  const plants: Plant[] = land === 'crop'
    ? [seedling(PFT[isTropical(site) ? 'c4crop' : 'c3crop'])]
    : [seedling(PFT[tropical ? 'troptree' : 'temptree']), seedling(PFT[tropical ? 'c4grass' : 'c3grass'])];
  // crop calendar: the variety is chosen to ripen about 105 days after sowing in today's climate
  const crop = land === 'crop' ? plants[0] : null;
  const tBase = crop && crop.pft.c4 ? 10 : 0;
  const sowDay = (sowingDay(site) + (scen.sow ?? 0) + 365) % 365;
  let phuReq = 0;
  if (crop) { const s0 = sowingDay(site); for (let d = s0; d < s0 + 105; d++) phuReq += Math.max(0, interp(site.T, d % 365) - tBase); phuReq *= scen.variety ?? 1; }
  let w1 = C.cap[0] * 0.3, w2 = C.cap[1] * 0.3, tWarm = 10;
  const out: YearOut[] = []; let daily: DayOut[] = [];
  for (let y = 0; y < years; y++) {
    const wx = weatherYear(site, scen, seed, y);
    const keep = y === years - 1;
    if (keep) daily = [];
    const Y: YearOut = { gpp: 0, npp: 0, rain: 0, transp: 0, evap: 0, runoff: 0, tree: 0, grass: 0, lai: 0, vegC: 0, litter: 0, decay: 0, yield: 0, season: 0, brake: 0 };
    const nppOf = plants.map(() => 0);
    let brakeSum = 0, brakeW = 0;
    for (let d = 0; d < 365; d++) {
      const { T, P, par, pet } = wx[d];
      tWarm += (T - tWarm) / 10;
      // water in
      w1 += P; Y.rain += P;
      if (w1 > C.cap[0]) { w2 += w1 - C.cap[0]; w1 = C.cap[0]; }
      if (w2 > C.cap[1]) { Y.runoff += w2 - C.cap[1]; w2 = C.cap[1]; }
      const s1 = w1 / C.cap[0], s2 = w2 / C.cap[1];
      // crop calendar
      if (crop) {
        if (d === sowDay) { crop.growing = true; crop.leaf = 10; crop.root = 6; crop.grain = 0; crop.phu = 0; crop.days = 0; crop.phen = 1; }
        if (crop.growing) {
          crop.phu += Math.max(0, T - tBase);
          crop.days++;
          if (crop.phu >= phuReq || crop.days > 240) { // harvest
            Y.yield = crop.grain / 0.45 / 100; Y.season = crop.days; Y.litter += crop.leaf + crop.root;
            crop.growing = false; crop.leaf = 0; crop.root = 0; crop.grain = 0; crop.phen = 0;
          }
        }
      }
      // leaves out or not
      for (const p of plants) {
        if (p.pft.crop) continue;
        const wr = p.pft.roots[0] * s1 + p.pft.roots[1] * s2;
        const want = wr > 0.2 && (!p.pft.cold || tWarm > 5) ? 1 : wr < 0.08 || (p.pft.cold && tWarm < 4) ? 0 : p.phen > 0.5 ? 1 : 0;
        p.phen += want > p.phen ? Math.min(1 / 10, want - p.phen) : -Math.min(1 / 20, p.phen - want);
      }
      // light: trees stand above grass
      let above = 0, gppDay = 0, respDay = 0, trDay = 0, caughtDay = 0, brakeDay = 1, covT = 0, covG = 0, laiT = 0, laiG = 0;
      const take1: number[] = [], take2: number[] = [];
      for (let i = 0; i < plants.length; i++) {
        const p = plants[i], f = p.pft;
        const lai = p.leaf * f.sla * p.phen;
        const share = (1 - above) * lightCaught(lai);
        if (f.tree) { covT = share; laiT = lai; above = share; } else { covG = share; laiG = lai; }
        caughtDay += share;
        let gpp = 0, tr = 0, fW = 1;
        if (share > 0.001 && (p.growing || !f.crop)) {
          const wr = f.roots[0] * s1 + f.roots[1] * s2;
          const supply = C.emax * wr * share;
          const demand = pet * share * poreFactor(f.c4, T, scen.co2);
          fW = demand > 0 ? Math.min(1, supply / demand) : 1;
          tr = Math.min(supply, demand);
          gpp = par * share * lightUse(f.c4, T, scen.co2) * tempLimit(f.tl, T) * fW;
          const tot = f.roots[0] * s1 + f.roots[1] * s2 || 1;
          take1[i] = (tr * f.roots[0] * s1) / tot; take2[i] = (tr * f.roots[1] * s2) / tot;
          brakeSum += fW * share; brakeW += share; brakeDay = Math.min(brakeDay, fW);
        } else { take1[i] = 0; take2[i] = 0; }
        // breathing, then growth
        const g = breathing(T);
        const rm = ((p.leaf * p.phen + p.root) * f.resp + p.wood * f.respWood) * g;
        let net = gpp - rm;
        if (net > 0) {
          net *= 1 - C.growthResp;
          if (f.crop) {
            const stage = phuReq > 0 ? p.phu / phuReq : 1;
            if (stage < 0.4) { p.leaf += net * 0.65; p.root += net * 0.35; }
            else { p.grain += net * 0.45; p.leaf += net * 0.1; p.root += net * 0.1; Y.litter += net * 0.35; } // the rest builds stem and husk
            if (stage > 0.75) { const fall = p.leaf * 0.03; p.leaf -= fall; Y.litter += fall; }
          } else { p.leaf += net * f.alloc[0]; p.root += net * f.alloc[1]; p.wood += net * f.alloc[2]; }
        } else if (p.leaf + p.root > 0) { // starving: tissue is used up
          const k = Math.max(0, 1 + net / (p.leaf + p.root)); p.leaf *= k; p.root *= k;
        }
        nppOf[i] += net; Y.gpp += gpp; Y.npp += net; gppDay += gpp; respDay += rm + (net > 0 ? (net / (1 - C.growthResp)) * C.growthResp : 0); trDay += tr;
        // leaf fall and death
        if (!f.crop) {
          const l = (p.leaf * f.turn[0]) / 365, r = (p.root * f.turn[1]) / 365, w = (p.wood * f.turn[2]) / 365;
          p.leaf -= l; p.root -= r; p.wood -= w; Y.litter += l + r + w;
        }
      }
      // water out
      let t1 = take1.reduce((a, b) => a + b, 0), t2 = take2.reduce((a, b) => a + b, 0);
      t1 = Math.min(t1, w1); t2 = Math.min(t2, w2); w1 -= t1; w2 -= t2;
      const ev = Math.min(w1, pet * (1 - caughtDay) * s1 * s1);
      w1 -= ev; Y.transp += t1 + t2; Y.evap += ev;
      Y.decay += C.kSoil10 * breathing(T) * (0.25 + 0.75 * s1);
      Y.tree = Math.max(Y.tree, covT); Y.grass = Math.max(Y.grass, covG); Y.lai = Math.max(Y.lai, laiT + laiG);
      if (keep) daily.push({ T, P, par, pet, w1: w1 / C.cap[0], w2: w2 / C.cap[1], gpp: gppDay, resp: respDay, transp: trDay, evap: ev, brake: brakeDay, laiTree: laiT, laiGrass: laiG, coverTree: covT, coverGrass: covG, grain: crop ? crop.grain : 0, caught: caughtDay });
    }
    // once a year: trees that lost carbon die back; new seedlings arrive if there was any rain
    plants.forEach((p, i) => {
      if (p.pft.crop) return;
      if (p.pft.tree && nppOf[i] <= C.quitNpp) { const lost = 0.2; Y.litter += (p.leaf + p.root + p.wood) * lost; p.leaf *= 1 - lost; p.root *= 1 - lost; p.wood *= 1 - lost; }
      if (Y.rain > 100) { const s = seedling(p.pft); p.leaf += s.leaf * 0.5; p.root += s.root * 0.5; p.wood += s.wood * 0.5; }
    });
    Y.vegC = plants.reduce((a, p) => a + p.leaf + p.root + p.wood, 0);
    Y.brake = brakeW > 0 ? brakeSum / brakeW : 1;
    out.push(Y);
  }
  const last = out.slice(-avgN), mean = { ...last[0] } as YearOut & { soilC: number };
  for (const k of Object.keys(last[0]) as (keyof YearOut)[]) mean[k] = last.reduce((a, r) => a + r[k], 0) / last.length;
  mean.soilC = mean.decay > 0 ? mean.litter / mean.decay : 0; // soil carbon in balance: what falls in equals what rots away
  return { years: out, daily, mean, types: plants.map((p) => p.pft.name), tropical, sowDay };
}
