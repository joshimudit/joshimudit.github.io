// Step 3: experiments with Patch. Three ways to use a process-based model, one tab each:
// scenario analysis, hypothesis testing, understanding mechanisms.
import { experiment, C, type Scen, type YearOut, type CropId, type Run } from './model';
import { SITES, site as siteOf, type Site } from './sites';
import { blockSvg, BLOCK_VIEW, type Scene, type LandUse } from './block';
import { openCard, type CardData } from './card';

const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T;
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll(s)] as T[];
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const pct = (v: number) => Math.round(v * 100) + '%';
const signed = (v: number) => { const r = Math.round(v); return (r > 0 ? '+' : r < 0 ? '−' : '±') + Math.abs(r) + '%'; };
const rel = (a: number, b: number) => (a > 0 ? (b / a - 1) * 100 : 0);
const cap1 = (s: string) => s[0].toUpperCase() + s.slice(1);
const N = 10, CROP_REF: Record<CropId, number> = { wheat: 5, maize: 6, millet: 4 };
const grassOf = (y: YearOut) => Math.min(1 - y.tree, y.grass);
const meanOf = (rows: YearOut[], upTo: number, k: 'yield' | 'season') => { const n = Math.max(1, Math.round(upTo)); let s = 0; for (let y = 1; y <= n; y++) s += rows[y][k]; return s / n; };
const meanYield = (rows: YearOut[], upTo: number) => meanOf(rows, upTo, 'yield'), days = (rows: YearOut[], upTo = N) => Math.round(meanOf(rows, upTo, 'season'));

// ── what a person can set ──
interface UI { dT: number; rain: number; co2: number; sow: number; variety: number; irrigate: boolean }
const TODAY: UI = { dT: 0, rain: 0, co2: C.co2ref, sow: 0, variety: 0, irrigate: false };
type ProcId = 'stress' | 'deepRoots' | 'tlim' | 'evap' | 'fert' | 'wue';
const toScen = (u: UI, off: ProcId[] = []): Scen => { const s: Scen = { dT: u.dT, rain: 1 + u.rain / 100, co2: u.co2, sow: u.sow, variety: 1 + 0.2 * u.variety, irrigate: u.irrigate }; for (const k of off) s[k] = false; return s; };
const same = (a: UI, b: UI) => (Object.keys(TODAY) as (keyof UI)[]).every((k) => a[k] === b[k]);
const PROCS: { id: ProcId; name: string; what: string; off: string }[] = [
  { id: 'stress', name: 'Water stress', what: 'stomata close when the soil is dry, and photosynthesis slows', off: 'Stomata no longer close when the soil is dry, so photosynthesis never slows for lack of water. The bigger the change, the more this ecosystem is held back by water.' },
  { id: 'deepRoots', name: 'Deep tree roots', what: 'trees can take water from the deep soil layer', off: 'Trees can no longer take water from the deep soil. Where the top soil dries out for months they lose to the grass. Where it stays wet they barely notice.' },
  { id: 'tlim', name: 'Temperature limits', what: 'photosynthesis slows when it is too cold or too hot', off: 'Photosynthesis no longer slows when it is too cold or too hot for the plant. The bigger the change, the more temperature holds growth back here.' },
  { id: 'evap', name: 'Evaporation from soil', what: 'bare soil loses water to the air', off: 'No water evaporates from bare soil any more, so more is left for the plants. Where leaves already cover the ground there was little to lose.' },
  { id: 'fert', name: 'CO₂ fertilisation', what: 'more CO₂ speeds up photosynthesis', off: 'Extra CO₂ no longer speeds up photosynthesis. C3 plants, such as trees, lose that gain. C4 grasses never had it.' },
  { id: 'wue', name: 'CO₂ water saving', what: 'stomata close a little when CO₂ is high', off: 'Stomata no longer close a little when CO₂ is high, so plants lose more water and the soil dries sooner.' },
];

/** The settings that differ from today, in words. */
function changes(u: UI, crop: CropId): string[] {
  const o: string[] = [];
  if (u.dT) o.push(`temperature +${u.dT} °C`);
  if (u.rain) o.push(`precipitation ${u.rain > 0 ? '+' : '−'}${Math.abs(u.rain)}%`);
  if (u.co2 !== C.co2ref) o.push(`CO₂ ${u.co2} ppm`);
  if (u.irrigate) o.push('irrigation');
  if (u.sow) o.push(`sowing ${Math.abs(u.sow)} days ${u.sow < 0 ? 'earlier' : 'later'}`);
  if (u.variety) o.push(`a ${u.variety < 0 ? 'fast' : 'slow'}-ripening ${crop} variety`);
  return o;
}
const PRESETS: { name: string; sub: string; set: Partial<UI>; crop?: boolean }[] = [
  { name: 'Drought decade', sub: 'precipitation −30%', set: { rain: -30 } },
  { name: 'Wetter decade', sub: 'precipitation +30%', set: { rain: 30 } },
  { name: '+2 °C world', sub: '+2 °C, CO₂ 500 ppm', set: { dT: 2, co2: 500 } },
  { name: '+4 °C world', sub: '+4 °C, CO₂ 800 ppm, precipitation −10%', set: { dT: 4, rain: -10, co2: 800 } },
  { name: 'Drought, irrigated', sub: 'precipitation −30%, irrigation', set: { rain: -30, irrigate: true }, crop: true },
];

// ── what goes on the bench: two pieces of land, side by side ──
interface Panel { site: Site; land: LandUse; crop: CropId; nat?: YearOut[]; crp?: YearOut[]; cap: string; warm: number; irrigate: boolean }
type Head = [string, string];
interface Bench { A: Panel; B: Panel; graphs: string[]; heads(yi: number): Head[] }
interface Verdict { ok: boolean; found: string; why: string }

function rows(s: Site, land: LandUse, crop: CropId, sc: Scen | null) {
  const pick = (l: 'natural' | CropId) => { const r = experiment(s, sc ?? toScen(TODAY), l, N); return sc ? r.scen : r.base; };
  return { nat: land !== 'crop' ? pick('natural') : undefined, crp: land !== 'natural' ? pick(crop) : undefined };
}
const GRAPHS: Record<string, { label: string; unit: string; of: 'nat' | 'crp'; max?: number; get(y: YearOut): number; get2?(y: YearOut): number }> = {
  cover: { label: 'Tree cover and grass cover', unit: '% of the ground', of: 'nat', max: 100, get: (y) => y.tree * 100, get2: (y) => grassOf(y) * 100 },
  npp: { label: 'Plant growth (NPP)', unit: 'g of carbon per m² per year', of: 'nat', get: (y) => y.npp },
  vegc: { label: 'Carbon stored in plants', unit: 'kg of carbon per m²', of: 'nat', get: (y) => y.vegC / 1000 },
  w2: { label: 'Water in the deep soil', unit: '% full, yearly mean', of: 'nat', max: 100, get: (y) => y.w2 * 100 },
  yield: { label: 'Crop yield', unit: 'tonnes of grain per hectare', of: 'crp', get: (y) => y.yield },
  season: { label: 'From sowing to harvest', unit: 'days', of: 'crp', get: (y) => y.season },
  cw: { label: 'Water in the top soil of the field', unit: '% full, yearly mean', of: 'crp', max: 100, get: (y) => y.w1 * 100 },
  cnpp: { label: 'Crop growth (NPP)', unit: 'g of carbon per m² per year', of: 'crp', get: (y) => y.npp },
};
const GRAPH_SET: Record<LandUse, string[]> = { natural: ['cover', 'npp', 'w2', 'vegc'], crop: ['yield', 'season', 'cw', 'cnpp'], both: ['cover', 'vegc', 'yield', 'season'] };
/** The two headline numbers when the right-hand land is compared with the left. */
function headsOf(A: Panel, B: Panel, yi: number, versus: string): Head[] {
  const veg = (): Head => [signed(rel(A.nat![yi].vegC, B.nat![yi].vegC)), `carbon stored in plants, compared with ${versus}`];
  const trees = (): Head => [`${pct(A.nat![yi].tree)} → ${pct(B.nat![yi].tree)}`, 'of the ground under trees'];
  const yl = (): Head => [yi < 1 ? '±0%' : signed(rel(meanYield(A.crp!, yi), meanYield(B.crp!, yi))), `${B.crop} yield, compared with ${versus}`];
  const ripe = (): Head => [`${days(A.crp!, yi)} → ${days(B.crp!, yi)}`, 'days from sowing to harvest'];
  return B.land === 'natural' ? [veg(), trees()] : B.land === 'crop' ? [yl(), ripe()] : [veg(), yl()];
}
/** A short reading of what changed between today's climate (A) and a scenario (B) on the same land. */
function explain(A: Panel, B: Panel, ui: UI): string {
  const o: string[] = [];
  if (A.nat && B.nat) {
    const b = A.nat[N], s = B.nat[N];
    o.push(Math.abs(s.tree - b.tree) >= 0.04 ? `After ten years trees cover ${pct(s.tree)} of the ground instead of ${pct(b.tree)}, and grass ${pct(grassOf(s))} instead of ${pct(grassOf(b))}.` : 'Tree and grass cover hardly change.');
    if (Math.abs(s.brake - b.brake) > 0.04) o.push(s.brake < b.brake ? 'Plants are short of water more often, so their stomata close and photosynthesis slows.' : 'Plants are short of water less often, so photosynthesis runs for longer.');
    else if (Math.abs(s.w2 - b.w2) >= 0.04) o.push(`The deep soil is ${pct(s.w2)} full on average, instead of ${pct(b.w2)}.`);
  }
  if (A.crp && B.crp) {
    const d = days(B.crp) - days(A.crp), dy = rel(meanYield(A.crp, N), meanYield(B.crp, N));
    if (Math.abs(d) >= 3) o.push(`The ${B.crop} ripens in ${days(B.crp)} days instead of ${days(A.crp)}, which ${d < 0 ? 'leaves less' : 'gives more'} time to fill the grain.`);
    else if (Math.abs(dy) < 3) o.push(`The ${B.crop} harvest hardly changes.`);
    else if (!A.nat) o.push(dy < 0 ? `The ${B.crop} ${ui.rain < 0 ? 'runs short of water more often' : 'grows less'} during its season, so less grain is filled.` : `The ${B.crop} grows more during its season, so more grain is filled.`);
    if (ui.irrigate) o.push(`Irrigation adds about ${Math.round(B.crp.slice(1).reduce((a, r) => a + r.irrig, 0) / N)} mm of water a year.`);
  }
  return o.slice(0, 3).join(' ');
}

// ── hypotheses: each one is tested by real model runs, and judged from their numbers ──
interface Test { site: string; land: 'natural' | 'crop'; crop?: CropId; set: Partial<UI>; off?: ProcId[]; cap: string }
interface Hyp { text: string; did: string; tests: Test[]; show: [number, number]; graphs?: string[]; judge(r: Run[]): Verdict; heads?(r: Run[], yi: number): Head[] }
const SAV = 'niamey', chg = (r: Run, yi: number, k: 'vegC' | 'npp') => rel(r.base[yi][k], r.scen[yi][k]), ychg = (r: Run, yi: number) => (yi < 1 ? 0 : rel(meanYield(r.base, yi), meanYield(r.scen, yi)));
const HYPS: Hyp[] = [
  { text: 'In a drought, trees lose more ground than grass.', did: 'Cut precipitation by 30% in the dry savanna.',
    tests: [{ site: SAV, land: 'natural', set: { rain: -30 }, cap: 'Precipitation −30%' }], show: [-1, 0],
    judge: ([r]) => { const b = r.base[N], s = r.scen[N]; return { ok: s.tree - b.tree < grassOf(s) - grassOf(b), found: `Tree cover ${pct(b.tree)} → ${pct(s.tree)}. Grass cover ${pct(grassOf(b))} → ${pct(grassOf(s))}.`, why: 'With less rain, little water reaches the deep soil that trees rely on in the dry season. Grass lives off the top soil and takes the space the trees leave.' }; } },
  { text: 'A rainforest suffers from a drought as much as a dry savanna does.', did: 'Cut precipitation by 30% in the tropical rainforest and in the dry savanna.',
    tests: [{ site: 'manaus', land: 'natural', set: { rain: -30 }, cap: 'Rainforest, precipitation −30%' }, { site: SAV, land: 'natural', set: { rain: -30 }, cap: 'Dry savanna, precipitation −30%' }], show: [0, 1], graphs: ['vegc', 'cover', 'w2', 'npp'],
    heads: ([m, s], yi) => [[signed(chg(m, yi, 'vegC')), 'carbon stored in plants, rainforest'], [signed(chg(s, yi, 'vegC')), 'carbon stored in plants, dry savanna']],
    judge: ([m, s]) => { const dm = chg(m, N, 'vegC'), ds = chg(s, N, 'vegC'); return { ok: dm < -5 && dm < ds * 0.6, found: `Carbon stored in plants changed by ${signed(dm)} in the rainforest and by ${signed(ds)} in the dry savanna.`, why: 'The rainforest gets far more rain than its plants use, so with 30% less the soil is still wet. In the savanna every millimetre was already in use.' }; } },
  { text: 'Warming reduces plant growth in every ecosystem.', did: 'Warmed the dry savanna and the temperate forest by 3 °C.',
    tests: [{ site: SAV, land: 'natural', set: { dT: 3 }, cap: 'Dry savanna, +3 °C' }, { site: 'aarhus', land: 'natural', set: { dT: 3 }, cap: 'Temperate forest, +3 °C' }], show: [0, 1], graphs: ['npp', 'cover', 'w2', 'vegc'],
    heads: ([a, c], yi) => [[signed(chg(a, yi, 'npp')), 'plant growth, dry savanna'], [signed(chg(c, yi, 'npp')), 'plant growth, temperate forest']],
    judge: ([a, c]) => { const da = chg(a, N, 'npp'), dc = chg(c, N, 'npp'); return { ok: da < -1 && dc < -1, found: `Plant growth (NPP) changed by ${signed(da)} in the dry savanna and by ${signed(dc)} in the temperate forest.`, why: 'Where it is already hot, more heat raises respiration and water demand. Where cold limits growth, a longer warm season helps.' }; } },
  { text: 'Extra CO₂ helps savanna trees and savanna grass alike.', did: 'Raised CO₂ from 420 to 600 ppm in the dry savanna.',
    tests: [{ site: SAV, land: 'natural', set: { co2: 600 }, cap: 'CO₂ 600 ppm' }], show: [-1, 0],
    judge: ([r]) => { const b = r.base[N], s = r.scen[N]; return { ok: s.tree > b.tree + 0.02 && grassOf(s) > grassOf(b) + 0.02, found: `Tree cover ${pct(b.tree)} → ${pct(s.tree)}. Grass cover ${pct(grassOf(b))} → ${pct(grassOf(s))}.`, why: 'These trees are C3 plants: more CO₂ speeds up their photosynthesis. The grass is a C4 plant. It already concentrates CO₂ inside its leaves, so it gains little, and the spreading trees shade it.' }; } },
  { text: 'Extra CO₂ softens the damage of a drought.', did: 'Cut precipitation by 20% in the dry savanna, then ran it again with CO₂ at 600 ppm.',
    tests: [{ site: SAV, land: 'natural', set: { rain: -20 }, cap: 'Drought' }, { site: SAV, land: 'natural', set: { rain: -20, co2: 600 }, cap: 'Drought, CO₂ 600 ppm' }], show: [0, 1], graphs: ['vegc', 'cover', 'w2', 'npp'],
    heads: ([d, c], yi) => [[signed(chg(d, yi, 'vegC')), 'carbon stored in plants, drought alone'], [signed(chg(c, yi, 'vegC')), 'carbon stored in plants, drought with more CO₂']],
    judge: ([d, c]) => { const a = chg(d, N, 'vegC'), b = chg(c, N, 'vegC'); return { ok: b > a + 5, found: `Carbon stored in plants: ${signed(a)} in the drought alone, ${signed(b)} with more CO₂.`, why: 'With more CO₂ the stomata can close a little and still take in enough. Plants lose less water, and the soil stays wet for longer.' }; } },
  { text: 'In a dry savanna, extra CO₂ helps mainly by saving water, not by speeding up photosynthesis.', did: 'Raised CO₂ to 800 ppm three times: with both CO₂ processes, without water saving, and without CO₂ fertilisation.',
    tests: [{ site: SAV, land: 'natural', set: { co2: 800 }, cap: 'CO₂ 800 ppm' }, { site: SAV, land: 'natural', set: { co2: 800 }, off: ['wue'], cap: 'CO₂ 800 ppm, no water saving' }, { site: SAV, land: 'natural', set: { co2: 800 }, off: ['fert'], cap: 'CO₂ 800 ppm, no fertilisation' }], show: [0, 1], graphs: ['npp', 'w2', 'cover', 'vegc'],
    heads: ([f, w], yi) => [[signed(chg(f, yi, 'npp')), 'plant growth with both CO₂ processes'], [signed(chg(w, yi, 'npp')), 'plant growth without water saving']],
    judge: ([f, noW, noF]) => { const a = chg(f, N, 'npp'), w = chg(noW, N, 'npp'), p = chg(noF, N, 'npp'); return { ok: a - w > a - p, found: `Plant growth (NPP) with both processes: ${signed(a)}. Without water saving: ${signed(w)}. Without CO₂ fertilisation: ${signed(p)}.`, why: 'Switching a process off shows what it was doing. Most of the gain disappears without water saving: with more CO₂ the stomata close a little, and the soil stays wet for longer.' }; } },
  { text: 'Without deep roots, savanna trees cannot hold their ground against grass.', did: 'Switched off the deep roots of the trees in the dry savanna.',
    tests: [{ site: SAV, land: 'natural', set: {}, off: ['deepRoots'], cap: 'Trees without deep roots' }], show: [-1, 0],
    judge: ([r]) => { const b = r.base[N], s = r.scen[N]; return { ok: s.tree < b.tree * 0.5, found: `Tree cover ${pct(b.tree)} → ${pct(s.tree)}. Grass cover ${pct(grassOf(b))} → ${pct(grassOf(s))}.`, why: 'In the long dry season the top soil is empty. Trees survive on the deep layer, which grass roots barely reach. Without it they compete with grass for the same water, and lose.' }; } },
  { text: 'Irrigation can protect a harvest from drought.', did: 'Cut precipitation by 30% on a millet field, then ran it again with irrigation.',
    tests: [{ site: SAV, land: 'crop', crop: 'millet', set: { rain: -30 }, cap: 'Drought' }, { site: SAV, land: 'crop', crop: 'millet', set: { rain: -30, irrigate: true }, cap: 'Drought, irrigated' }], show: [0, 1],
    heads: ([d, i], yi) => [[signed(ychg(d, yi)), 'millet yield, drought alone'], [signed(ychg(i, yi)), 'millet yield, drought with irrigation']],
    judge: ([d, i]) => { const dd = ychg(d, N), di = ychg(i, N); return { ok: di > -5 && di > dd + 5, found: `Drought alone: yield ${signed(dd)}. Drought with irrigation: yield ${signed(di)}.`, why: 'Irrigation refills the top soil whenever the crop runs short of water, so its stomata stay open and photosynthesis continues.' }; } },
  { text: 'A slower-ripening variety can make up for the yield lost to 2 °C of warming.', did: 'Warmed a millet field by 2 °C, then ran it again with a slow-ripening variety.',
    tests: [{ site: SAV, land: 'crop', crop: 'millet', set: { dT: 2 }, cap: '+2 °C, usual variety' }, { site: SAV, land: 'crop', crop: 'millet', set: { dT: 2, variety: 1 }, cap: '+2 °C, slow variety' }], show: [0, 1],
    heads: ([w, v], yi) => [[signed(ychg(w, yi)), 'millet yield, usual variety'], [signed(ychg(v, yi)), 'millet yield, slow variety']],
    judge: ([w, v]) => { const dw = ychg(w, N), dv = ychg(v, N); return { ok: dv > -5, found: `Warming alone: yield ${signed(dw)}, and the crop ripened in ${days(w.scen)} days instead of ${days(w.base)}. With the slow variety: yield ${signed(dv)}.`, why: 'Heat makes a crop reach its growing degree days sooner, so it has fewer days to fill its grain. A variety that needs more warm days gets that time back.' }; } },
  { text: 'Sowing three weeks earlier gives a bigger harvest.', did: 'Sowed a millet field in the dry savanna 20 days earlier than usual.',
    tests: [{ site: SAV, land: 'crop', crop: 'millet', set: { sow: -20 }, cap: 'Sown 20 days earlier' }], show: [-1, 0],
    judge: ([r]) => { const d = ychg(r, N); return { ok: d > 5, found: `Yield ${signed(d)}.`, why: 'The usual date follows the rains. Sown earlier, the young crop stands in soil the rains have not filled yet, and runs short of water.' }; } },
  { text: 'More rain always means a bigger harvest.', did: 'Raised precipitation by 30% on a maize field in the tropical rainforest.',
    tests: [{ site: 'manaus', land: 'crop', crop: 'maize', set: { rain: 30 }, cap: 'Precipitation +30%' }], show: [-1, 0],
    judge: ([r]) => { const d = ychg(r, N); return { ok: d > 5, found: `Yield ${signed(d)}.`, why: 'More water only helps where water is what limits the crop. Here the soil is already wet, and light and temperature set the harvest.' }; } },
];
const MEASURES: Record<string, { label: string; of: 'natural' | 'crop'; pts?: boolean; val(r: Run): [number, number]; fmt(v: number): string }> = {
  tree: { label: 'tree cover', of: 'natural', pts: true, val: (r) => [r.base[N].tree * 100, r.scen[N].tree * 100], fmt: (v) => Math.round(v) + '%' },
  grass: { label: 'grass cover', of: 'natural', pts: true, val: (r) => [grassOf(r.base[N]) * 100, grassOf(r.scen[N]) * 100], fmt: (v) => Math.round(v) + '%' },
  npp: { label: 'plant growth (NPP)', of: 'natural', val: (r) => [r.base[N].npp, r.scen[N].npp], fmt: (v) => Math.round(v) + ' g of carbon per m² per year' },
  vegc: { label: 'carbon stored in plants', of: 'natural', val: (r) => [r.base[N].vegC / 1000, r.scen[N].vegC / 1000], fmt: (v) => v.toFixed(1) + ' kg per m²' },
  yield: { label: 'crop yield', of: 'crop', val: (r) => [meanYield(r.base, N), meanYield(r.scen, N)], fmt: (v) => v.toFixed(1) + ' t per hectare' },
  season: { label: 'the time from sowing to harvest', of: 'crop', val: (r) => [days(r.base), days(r.scen)], fmt: (v) => Math.round(v) + ' days' },
};
const DIRS: Record<string, string> = { '1': 'increase', '-1': 'decrease', '0': 'stay about the same' };
// how each ecosystem looks today, for the small pictures on the buttons
const LOOKS: Record<string, { tree: number; grass: number; size: number; w1: number; w2: number; rain: number }> = {
  niamey: { tree: 0.36, grass: 0.57, size: 0.86, w1: 0.3, w2: 0.38, rain: 555 }, hyderabad: { tree: 0.73, grass: 0.27, size: 1.1, w1: 0.4, w2: 0.44, rain: 860 },
  aarhus: { tree: 0.77, grass: 0.22, size: 1.1, w1: 0.6, w2: 0.83, rain: 674 }, manaus: { tree: 0.91, grass: 0.05, size: 1.3, w1: 0.7, w2: 0.77, rain: 2360 },
};
const thumb = (s: Site, land: LandUse, crop: CropId) => { const k = LOOKS[s.id]; return `<svg viewBox="${BLOCK_VIEW}" aria-hidden="true">${blockSvg({ style: s.id, land, tree: k.tree, tree0: k.tree, grass: k.grass, size: k.size, w1: k.w1, w2: k.w2, rainMm: k.rain, warm: 0, crop, cropH: 0.7 })}</svg>`; };

// ── sliders and switches for climate and management, used in all three tabs ──
let uid = 0;
function makeControls(host: HTMLElement, ui: () => UI, changed: () => void) {
  const id = 'k' + uid++;
  const knob = (k: keyof UI, name: string, min: number, max: number, step: number) => `<div class="knob"><label for="${id}-${k}"><span>${name}</span><output data-o="${k}"></output></label><input id="${id}-${k}" data-k="${k}" type="range" min="${min}" max="${max}" step="${step}" /></div>`;
  host.innerHTML = `<div class="cgroup"><p class="band">Climate</p>${knob('dT', 'Temperature', 0, 4, 0.5)}${knob('rain', 'Precipitation', -40, 40, 5)}${knob('co2', 'CO₂ in the air', 280, 900, 10)}</div>
    <div class="cgroup mgmt"><p class="band">Management of the cropland</p><label class="sw"><input type="checkbox" data-k="irrigate" /><span>Irrigation<small>water the crop when the soil gets dry</small></span></label>${knob('sow', 'Sowing date', -30, 30, 5)}
    <div class="row variety" role="group" aria-label="Crop variety"><button type="button" class="opt" data-v="-1">Fast-ripening</button><button type="button" class="opt" data-v="0">Usual variety</button><button type="button" class="opt" data-v="1">Slow-ripening</button></div></div>`;
  const text = (k: keyof UI, u: UI) => (k === 'dT' ? (u.dT ? `+${u.dT} °C` : 'as today') : k === 'rain' ? (u.rain ? `${u.rain > 0 ? '+' : '−'}${Math.abs(u.rain)}%` : 'as today') : k === 'co2' ? (u.co2 === C.co2ref ? '420 ppm, as today' : `${u.co2} ppm`) : u.sow ? `${Math.abs(u.sow)} days ${u.sow < 0 ? 'earlier' : 'later'}` : 'usual');
  function sync(mgmt: boolean) {
    const u = ui();
    $('.mgmt', host).hidden = !mgmt;
    $$<HTMLInputElement>('input[data-k]', host).forEach((k) => {
      const key = k.dataset.k as keyof UI;
      if (k.type === 'checkbox') { k.checked = u[key] as boolean; return; }
      k.value = String(u[key]); const fr = (v: number) => (v - +k.min) / (+k.max - +k.min);
      k.style.setProperty('--p', String(fr(TODAY[key] as number))); k.style.setProperty('--v', String(fr(+k.value)));
      $(`output[data-o="${key}"]`, host).textContent = text(key, u);
    });
    $$('.variety .opt', host).forEach((b) => b.classList.toggle('on', +b.dataset.v! === u.variety));
  }
  let timer = 0;
  host.addEventListener('input', (e) => {
    const k = e.target as HTMLInputElement; if (!k.dataset.k) return;
    (ui() as unknown as Record<string, number | boolean>)[k.dataset.k] = k.type === 'checkbox' ? k.checked : +k.value;
    sync(!$('.mgmt', host).hidden); clearTimeout(timer); timer = window.setTimeout(changed, k.type === 'checkbox' ? 0 : 140);
  });
  $('.variety', host).addEventListener('click', (e) => { const b = (e.target as Element).closest<HTMLElement>('[data-v]'); if (b) { ui().variety = +b.dataset.v!; sync(true); changed(); } });
  return { sync };
}

export function experimentPage() {
  const root = $('#exp');
  type Mode = 'scenario' | 'hypothesis' | 'mechanism';
  const QUESTION: Record<Mode, string> = { scenario: 'What happens to this land if the climate changes? Set a possible future and run it for 10 years.', hypothesis: 'Is an idea about how the land works right? Predict, run the model, and check.', mechanism: 'What does each process do? Switch one off and see what changes.' };
  let mode: Mode = 'scenario';
  const S = { site: SITES[0], land: 'both' as LandUse, crop: SITES[0].crop, ui: { ...TODAY, ...PRESETS[0].set } as UI, preset: 0 };           // preset −1: build your own
  const H = { i: 0, guess: 0, c: { site: SITES[0], land: 'natural' as 'natural' | CropId, ui: { ...TODAY }, measure: 'tree', dir: -1 } };
  const M = { site: SITES[0], ui: { ...TODAY }, off: [] as ProcId[], custom: false };
  let bench: Bench, ran = false, year = 0, raf = 0, verdict: Verdict | null = null, ready = true, note = '';
  const pane = (m: Mode) => $(`[data-pane="${m}"]`, root);
  const CUSTOM = HYPS.length;

  // ── build the choices ──
  $$('.places', root).forEach((el) => (el.innerHTML = SITES.map((s) => `<button type="button" class="tile" data-id="${s.id}">${thumb(s, 'natural', s.crop)}<b>${s.biome}</b><small>${s.name}, ${s.country}</small></button>`).join('')));
  $('.presets', root).innerHTML = PRESETS.map((p, i) => `<button type="button" class="opt" data-i="${i}">${p.name}<small>${p.sub}</small></button>`).join('') + '<button type="button" class="opt own" data-i="-1">Build your own<small>set the climate and the farming yourself</small></button>';
  $('.hyplist', root).innerHTML = HYPS.map((h, i) => { const t = h.tests[0], two = new Set(h.tests.map((x) => x.site)).size > 1; return `<button type="button" class="opt" data-i="${i}">${h.text}<small>${two ? 'two ecosystems' : siteOf(t.site).biome.toLowerCase()}, ${t.land === 'crop' ? t.crop + ' field' : 'natural vegetation'}</small></button>`; }).join('') + `<button type="button" class="opt own" data-i="${CUSTOM}">Custom<small>write and test your own hypothesis</small></button>`;
  $('.procs', root).innerHTML = PROCS.map((p) => `<label class="sw"><input type="checkbox" data-p="${p.id}" checked /><span>${p.name}<small>${p.what}</small></span></label>`).join('');
  $<HTMLSelectElement>('.cplace', root).innerHTML = SITES.map((s) => `<option value="${s.id}">${s.biome}, ${s.name}</option>`).join('');
  const ctlS = makeControls($('.ctl', pane('scenario')), () => S.ui, () => change());
  const ctlH = makeControls($('.ctl', pane('hypothesis')), () => H.c.ui, () => change());
  const ctlM = makeControls($('.ctl', pane('mechanism')), () => M.ui, () => change(M.off.length > 0));

  // ── the bench for the current tab ──
  const panel = (s: Site, land: LandUse, crop: CropId, sc: Scen | null, cap: string, ui: Partial<UI>): Panel => ({ site: s, land, crop, ...rows(s, land, crop, sc), cap, warm: ui.dT ?? 0, irrigate: !!ui.irrigate });
  function build() {
    verdict = null; ready = true; note = '';
    if (mode === 'scenario') {
      const A = panel(S.site, S.land, S.crop, null, 'Today’s climate', {}), B = panel(S.site, S.land, S.crop, toScen(S.ui), S.preset >= 0 ? PRESETS[S.preset].name : 'Your scenario', S.ui);
      bench = { A, B, graphs: GRAPH_SET[S.land], heads: (yi) => headsOf(A, B, yi, 'today’s climate') };
      if (same(S.ui, TODAY)) { ready = false; note = 'Everything is still as today. Move a control first.'; }
    } else if (mode === 'mechanism') {
      const names = M.off.map((k) => PROCS.find((p) => p.id === k)!.name.replace(/^[A-Z](?=[a-z])/, (c) => c.toLowerCase()));
      const A = panel(M.site, 'natural', M.site.crop, toScen(M.ui), 'Full model', M.ui), B = panel(M.site, 'natural', M.site.crop, toScen(M.ui, M.off), !names.length ? 'Full model' : names.length === 1 ? `Without ${names[0]}` : `${names.length} processes off`, M.ui);
      bench = { A, B, graphs: GRAPH_SET.natural, heads: (yi) => { const a = A.nat![yi], b = B.nat![yi]; return [[signed(rel(a.npp, b.npp)), 'plant growth, compared with the full model'], [`${pct(a.tree)} → ${pct(b.tree)}`, 'of the ground under trees']]; } };
      if (!M.off.length) { ready = false; note = 'All processes are on. Switch one off.'; }
    } else if (H.i === CUSTOM) {
      const c = H.c, land: LandUse = c.land === 'natural' ? 'natural' : 'crop', crop = c.land === 'natural' ? c.site.crop : c.land, m = MEASURES[c.measure];
      const A = panel(c.site, land, crop, null, 'Today’s climate', {}), B = panel(c.site, land, crop, toScen(c.ui), 'Your change', c.ui);
      bench = { A, B, graphs: GRAPH_SET[land], heads: (yi) => headsOf(A, B, yi, 'today’s climate') };
      if (same(c.ui, TODAY)) { ready = false; note = 'Change one control first.'; return; }
      const [a, b] = m.val(experiment(c.site, toScen(c.ui), c.land, N)), d = m.pts ? b - a : rel(a, b), got = d > 5 ? 1 : d < -5 ? -1 : 0;
      verdict = { ok: got === c.dir, found: `${cap1(m.label)}: ${m.fmt(a)} → ${m.fmt(b)}.`, why: explain(A, B, c.ui) };
    } else {
      const h = HYPS[H.i], runs = h.tests.map((t) => { const s = siteOf(t.site); return experiment(s, toScen({ ...TODAY, ...t.set }, t.off), t.land === 'crop' ? t.crop ?? s.crop : 'natural', N); });
      const mk = (k: number, ref: number): Panel => { const t = h.tests[k < 0 ? ref : k], s = siteOf(t.site), r = runs[k < 0 ? ref : k], rw = k < 0 ? r.base : r.scen; return { site: s, land: t.land, crop: t.crop ?? s.crop, nat: t.land === 'natural' ? rw : undefined, crp: t.land === 'crop' ? rw : undefined, cap: k < 0 ? 'Today’s climate' : t.cap, warm: k < 0 ? 0 : t.set.dT ?? 0, irrigate: k >= 0 && !!t.set.irrigate }; };
      const A = mk(h.show[0], h.show[1]), B = mk(h.show[1], h.show[1]);
      bench = { A, B, graphs: h.graphs ?? GRAPH_SET[B.land], heads: h.heads ? (yi) => h.heads!(runs, yi) : (yi) => headsOf(A, B, yi, 'today’s climate') };
      verdict = h.judge(runs);
    }
  }

  // ── drawing ──
  function scene(p: Panel, y: number, live: boolean): Scene {
    const i = Math.min(N - 1, Math.floor(y)), t = clamp(y - i), n = p.nat, c = p.crp, w = n ?? c!;
    const L = (k: keyof YearOut, r: YearOut[] = w) => lerp(r[i][k], r[i + 1][k], t);
    return { style: p.site.id, land: p.land, tree: n ? L('tree', n) : 0, tree0: n ? n[0].tree : 0, grass: n ? Math.min(1 - L('tree', n), L('grass', n)) : 0, size: n ? clamp(0.7 + 0.6 * Math.sqrt(L('vegC', n) / 20000), 0.7, 1.3) : 1,
      w1: L('w1'), w2: L('w2'), rainMm: L('rain'), warm: y > 0 ? p.warm : 0, crop: p.crop, cropH: c ? clamp((live ? c[i + 1].yield : L('yield', c)) / CROP_REF[p.crop]) : 0, irrigate: y > 0 && p.irrigate, phase: live ? y - Math.floor(y) : undefined };
  }
  function graphSvg(id: string): string {
    const g = GRAPHS[id], a = bench.A[g.of], b = bench.B[g.of];
    if (!a || !b) return '';
    const sets: [number[], string][] = [[a.map(g.get), 'a'], [b.map(g.get), 'b']];
    if (g.get2) sets.push([a.map(g.get2), 'a two'], [b.map(g.get2), 'b two']);
    const top = Math.max(1e-6, ...sets.flatMap((s) => s[0])) * 1.08, mag = Math.pow(10, Math.floor(Math.log10(top / 4))), stepV = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((v) => v * 4 >= top)!, nice = Math.min(stepV * 4, g.max ?? Infinity);
    const narrow = root.clientWidth < 560, GW = narrow ? 204 : 312, GH = narrow ? 150 : 172, x0 = narrow ? 30 : 40, x1 = GW - 8, y0 = GH - 22;
    const X = (y: number) => x0 + (y / N) * (x1 - x0), Y = (v: number) => y0 - (v / nice) * (y0 - 16);
    const dec = (st: number) => (st >= 10 ? 0 : st >= 1 ? 1 : 2), f = (v: number) => v.toFixed(Math.max(0, dec(stepV) - 1)), fv = (v: number) => v.toFixed(dec(stepV));
    const at = (v: number[], y: number) => { const i = Math.min(N - 1, Math.floor(y)); return lerp(v[i], v[i + 1], clamp(y - i)); };
    const path = (v: number[]) => { let d = ''; for (let i = 0; i <= Math.floor(year); i++) d += `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v[i]).toFixed(1)}`; if (year % 1) d += `L${X(year).toFixed(1)},${Y(at(v, year)).toFixed(1)}`; return d; };
    let h = '';
    for (let k = 0; k <= 2; k++) { const v = (nice * k) / 2; h += `<line class="gl" x1="${x0}" x2="${x1}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${x0 - 5}" y="${Y(v) + 4}" text-anchor="end">${f(v)}</text>`; }
    h += `<text x="${x0}" y="${GH - 5}">today</text><text x="${X(5)}" y="${GH - 5}" text-anchor="middle">year 5</text><text x="${x1}" y="${GH - 5}" text-anchor="end">year 10</text>`;
    for (const [v, cls] of sets) h += `<path class="${cls}" d="${path(v)}"/>`;
    for (const [v, cls] of sets) if (cls[0] === 'b') { const val = at(v, year), x = X(year), left = x > x1 - 60; h += `<circle class="dot ${cls}" cx="${x.toFixed(1)}" cy="${Y(val).toFixed(1)}" r="4.5"/><text class="val" x="${(left ? x - 8 : x + 8).toFixed(1)}" y="${(Y(val) - 7).toFixed(1)}" text-anchor="${left ? 'end' : 'start'}">${fv(val)}</text>`; }
    return `<figure><figcaption><b>${g.label}</b>${g.get2 ? ' <span class="k1">trees</span><span class="k2">grass</span>' : ''}<small>${g.unit}</small></figcaption><svg viewBox="0 0 ${GW} ${GH}" role="img" aria-label="${g.label} over ten years">${h}</svg></figure>`;
  }
  function frame(live = false) {
    const draw = (cls: string, p: Panel) => ($(cls, root).innerHTML = `<svg class="block" viewBox="${BLOCK_VIEW}" role="img" aria-label="${p.cap}: ${p.site.biome}">${blockSvg(scene(p, year, live))}</svg>`);
    draw('.blockA', bench.A); draw('.blockB', bench.B);
    const yi = Math.min(N, Math.floor(year + 1e-6));
    $('.yr', root).textContent = yi ? `Year ${yi} of ${N}` : 'Today';
    const ys = $<HTMLInputElement>('.year', root); ys.value = String(year); ys.style.setProperty('--v', String(year / N)); ys.disabled = !ran;
    if (!ran) return;
    $('.heads', root).innerHTML = bench.heads(yi).map((h, i) => `<div class="h${i}"><b>${h[0]}</b><p>${h[1]}</p></div>`).join('');
    $('.graphs', root).innerHTML = bench.graphs.map(graphSvg).join('');
  }
  function mechText(): { found: string; why: string; co2: boolean } {
    const a = bench.A.nat![N], b = bench.B.nat![N], dN = rel(a.npp, b.npp), dV = rel(a.vegC, b.vegC), small = Math.abs(dN) < 3 && Math.abs(dV) < 3 && Math.abs(a.tree - b.tree) < 0.03;
    const co2 = small && M.ui.co2 === C.co2ref && M.off.every((k) => k === 'fert' || k === 'wue');
    const found = small ? 'Almost nothing changes.' : `Plant growth (NPP) ${signed(dN)}. Tree cover ${pct(a.tree)} → ${pct(b.tree)}. Carbon stored in plants ${signed(dV)}.`;
    const why = co2 ? 'CO₂ is at today’s level, and this process only acts when CO₂ changes. Raise CO₂ and look again.' : M.off.length > 1 ? 'Several processes are off, so their effects are mixed. Switch off one at a time to see what each one does.' : PROCS.find((p) => p.id === M.off[0])!.off + (small ? ' Here that makes little difference.' : '');
    return { found, why, co2 };
  }
  /** Everything that does not move during a run. */
  function render() {
    $$('.modes .opt', root).forEach((b) => b.classList.toggle('on', b.dataset.v === mode));
    $('.modeq', root).textContent = QUESTION[mode];
    (['scenario', 'hypothesis', 'mechanism'] as Mode[]).forEach((m) => (pane(m).hidden = m !== mode));
    // scenario
    $$('.places .tile', pane('scenario')).forEach((b) => b.classList.toggle('on', b.dataset.id === S.site.id));
    $('.lands', root).innerHTML = ([['natural', 'Natural vegetation'], ['crop', 'Cropland'], ['both', 'Both']] as [LandUse, string][]).map(([v, t]) => `<button type="button" class="tile${v === S.land ? ' on' : ''}" data-v="${v}">${thumb(S.site, v, S.crop)}<b>${t}</b></button>`).join('');
    $('.cropsel', root).hidden = S.land === 'natural';
    $$('.cropsel .opt', root).forEach((b) => b.classList.toggle('on', b.dataset.v === S.crop));
    $$('.presets .opt', root).forEach((b) => { const i = +b.dataset.i!; b.classList.toggle('on', i === S.preset); b.hidden = i >= 0 && !!PRESETS[i].crop && S.land === 'natural'; });
    $('.build', pane('scenario')).hidden = S.preset >= 0; ctlS.sync(S.land !== 'natural');
    // hypothesis
    const custom = H.i === CUSTOM, c = H.c;
    $$('.hyplist .opt', root).forEach((b) => b.classList.toggle('on', +b.dataset.i! === H.i));
    $('.custom', root).hidden = !custom; $('.predict', root).hidden = custom; $('.testno', root).textContent = custom ? '2' : '3';
    $$('.guess .opt', root).forEach((b) => b.classList.toggle('on', +b.dataset.v! === H.guess));
    $$('.cdir .opt', root).forEach((b) => b.classList.toggle('on', +b.dataset.v! === c.dir));
    $<HTMLSelectElement>('.cplace', root).value = c.site.id; $<HTMLSelectElement>('.cland', root).value = c.land;
    const ms = $<HTMLSelectElement>('.cmeasure', root), of = c.land === 'natural' ? 'natural' : 'crop';
    if (MEASURES[c.measure].of !== of) c.measure = of === 'natural' ? 'tree' : 'yield';
    ms.innerHTML = Object.entries(MEASURES).filter(([, m]) => m.of === of).map(([k, m]) => `<option value="${k}">${m.label}</option>`).join(''); ms.value = c.measure;
    ctlH.sync(c.land !== 'natural');
    const ch = changes(c.ui, c.land === 'natural' ? c.site.crop : c.land);
    $('.csent', root).textContent = ch.length ? `Your hypothesis: with ${ch.join(' and ')} in the ${c.site.biome.toLowerCase()}, ${MEASURES[c.measure].label} will ${DIRS[c.dir]}.` : '';
    $('.hdid', root).textContent = custom ? 'Everything you did not change stays as today, so any difference comes from your change alone.' : HYPS[H.i].did + ' Everything else stays as today.';
    // mechanisms
    $$('.places .tile', pane('mechanism')).forEach((b) => b.classList.toggle('on', b.dataset.id === M.site.id));
    $('.customclim', root).classList.toggle('on', M.custom); $('.build', pane('mechanism')).hidden = !M.custom; ctlM.sync(false);
    $$<HTMLInputElement>('.procs input', root).forEach((k) => (k.checked = !M.off.includes(k.dataset.p as ProcId)));
    // bench
    $('.capA', root).textContent = bench.A.cap; $('.capB', root).textContent = bench.B.cap;
    $('.where', root).textContent = bench.A.site === bench.B.site ? `${bench.B.site.biome}, near ${bench.B.site.name}, ${bench.B.site.country}: ${bench.B.site.blurb}` : `${bench.A.site.biome} and ${bench.B.site.biome.toLowerCase()}`;
    $$<HTMLButtonElement>('.run', root).forEach((b) => (b.disabled = !ready));
    $$('.runnote', root).forEach((p) => (p.textContent = note));
    $('.replay', root).hidden = !ran;
    $('.idle', root).hidden = ran; $('.after', root).hidden = !ran;
    $('.key', root).innerHTML = `<span class="kb">${bench.B.cap}</span><span class="ka">${bench.A.cap}</span>`;
    history.replaceState(null, '', hash());
  }
  function outcome(done: boolean) {
    const v = $('.verdict', root), o = $('.outcome', root);
    o.classList.toggle('wait', !done);
    $('.fixco2', root).hidden = true; v.hidden = mode !== 'hypothesis'; v.className = 'verdict'; $('.yours', root).textContent = '';
    if (!done) { $('.found', root).textContent = 'Running…'; $('.why', root).textContent = ''; return; }
    if (mode === 'scenario') { $('.found', root).textContent = explain(bench.A, bench.B, S.ui); $('.why', root).textContent = ''; }
    else if (mode === 'mechanism') { const m = mechText(); $('.found', root).textContent = m.found; $('.why', root).textContent = m.why; $('.fixco2', root).hidden = !m.co2; }
    else if (verdict) {
      v.textContent = verdict.ok ? 'Supported, in this model' : 'Not supported, in this model'; v.classList.add(verdict.ok ? 'yes' : 'no');
      $('.found', root).textContent = verdict.found; $('.why', root).textContent = verdict.why;
      if (H.i !== CUSTOM && H.guess) $('.yours', root).textContent = (H.guess === 1) === verdict.ok ? 'Your prediction was right.' : 'Your prediction was wrong. That is useful: it is how ideas get corrected.';
    }
  }
  /** Something was chosen: rebuild, and show the land as it is today until the next run. */
  function change(rerun = false) {
    cancelAnimationFrame(raf); build(); ran = false; year = 0; render(); frame();
    if (rerun && ready) run(4200, false);
  }
  function run(dur = 9000, scroll = true) {
    if (!ready) return;
    cancelAnimationFrame(raf); ran = true; year = 0; render(); outcome(false); frame(true);
    if (scroll) { const res = $('.results', root), st = $('.stage', root), stacked = st.offsetWidth > root.clientWidth * 0.8; res.style.scrollMarginTop = (stacked ? st.offsetHeight + 10 : 12) + 'px'; res.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) dur = 1;
    const t0 = performance.now(); let last = 0;
    const tick = (now: number) => {
      year = clamp((now - t0) / dur) * N;
      if (year >= N) { year = N; frame(); outcome(true); return; }
      if (now - last > 45) { frame(true); last = now; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  // ── a link that reopens the experiment ──
  const KEYS: [keyof UI, string][] = [['dT', 't'], ['rain', 'r'], ['co2', 'c'], ['sow', 's'], ['variety', 'v'], ['irrigate', 'i']];
  function hash() {
    const q = new URLSearchParams(), put = (u: UI) => { for (const [k, s] of KEYS) if (u[k] !== TODAY[k]) q.set(s, String(+u[k])); };
    if (mode === 'scenario') { q.set('m', 's'); q.set('p', S.site.id); q.set('l', S.land); q.set('k', S.crop); put(S.ui); }
    else if (mode === 'mechanism') { q.set('m', 'x'); q.set('p', M.site.id); put(M.ui); if (M.off.length) q.set('o', M.off.join('.')); }
    else { q.set('m', 'h'); if (H.i !== CUSTOM) q.set('h', String(H.i)); }
    return '#' + q.toString();
  }
  function readHash(): boolean {
    const q = new URLSearchParams(location.hash.slice(1)), m = q.get('m');
    if (!m) return false;
    const get = (u: UI) => { for (const [k, s] of KEYS) if (q.has(s)) (u as unknown as Record<string, number | boolean>)[k] = typeof TODAY[k] === 'boolean' ? q.get(s) === '1' : +q.get(s)!; };
    if (m === 's') {
      S.site = siteOf(q.get('p') ?? ''); S.land = (['natural', 'crop', 'both'] as LandUse[]).find((l) => l === q.get('l')) ?? 'both'; S.crop = (q.get('k') ?? '') in CROP_REF ? (q.get('k') as CropId) : S.site.crop;
      S.ui = { ...TODAY }; get(S.ui); S.preset = PRESETS.findIndex((p) => same(S.ui, { ...TODAY, ...p.set }));
    } else if (m === 'x') { mode = 'mechanism'; M.site = siteOf(q.get('p') ?? ''); get(M.ui); M.custom = !same(M.ui, TODAY); M.off = (q.get('o') ?? '').split('.').filter((k): k is ProcId => PROCS.some((p) => p.id === k)); }
    else if (m === 'h') { mode = 'hypothesis'; H.i = clamp(+(q.get('h') ?? 0), 0, HYPS.length - 1) | 0; }
    return true;
  }

  // ── result card ──
  function cardData(): CardData {
    const A = bench.A, B = bench.B, base = { sceneA: scene(A, N, false), capA: A.cap, sceneB: scene(B, N, false), capB: B.cap, heads: bench.heads(N), url: location.href };
    const where = A.site === B.site ? `${B.site.biome}, ${B.site.name}, ${B.site.country}` : `${A.site.biome} and ${B.site.biome.toLowerCase()}`;
    if (mode === 'hypothesis' && verdict) {
      const custom = H.i === CUSTOM, c = H.c;
      return { ...base, kind: 'Hypothesis testing', where, heading: 'Hypothesis', claim: custom ? cap1($('.csent', root).textContent!.replace('Your hypothesis: ', '')) : HYPS[H.i].text, did: (custom ? `Changed: ${changes(c.ui, B.crop).join('; ')}.` : HYPS[H.i].did) + ' Kept everything else as today and ran 10 years.', found: verdict.found, why: verdict.why, conclusion: verdict.ok ? 'Hypothesis supported' : 'Hypothesis not supported' };
    }
    if (mode === 'mechanism') {
      const m = mechText(), names = M.off.map((k) => PROCS.find((p) => p.id === k)!.name), env = changes(M.ui, B.crop);
      return { ...base, kind: 'Understanding mechanisms', where, heading: 'Question', claim: `What does ${names.join(' and ').toLowerCase().replace('co₂', 'CO₂')} do in a ${B.site.biome.toLowerCase()}?`, did: `Switched off: ${names.join(', ')}${env.length ? ', with ' + env.join(', ') : ''}. Ran 10 years and compared with the full model.`, found: m.found, why: m.why, conclusion: '' };
    }
    const ch = changes(S.ui, S.crop);
    return { ...base, kind: 'Scenario analysis', where, heading: 'Question', claim: `What happens to a ${S.site.biome.toLowerCase()} in 10 years with ${ch.slice(0, 3).join(', ')}${ch.length > 3 ? ' and more' : ''}?`, did: `Changed: ${ch.join('; ')}. Ran 10 years and compared with today’s climate.`, ...(() => { const t = explain(A, B, S.ui).split(/(?<=\.) /); return { found: t[0], why: t.slice(1).join(' ') }; })(), conclusion: '' };
  }

  // ── what the buttons do ──
  const pick = (el: Element, attr: string, fn: (v: string) => void) => el.addEventListener('click', (e) => { const b = (e.target as Element).closest<HTMLElement>(`[data-${attr}]`); if (b) fn(b.dataset[attr]!); });
  pick($('.modes', root), 'v', (v) => { mode = v as Mode; change(); });
  pick($('.places', pane('scenario')), 'id', (v) => { S.site = siteOf(v); S.crop = S.site.crop; change(); });
  pick($('.lands', root), 'v', (v) => { S.land = v as LandUse; if (S.land === 'natural' && S.preset >= 0 && PRESETS[S.preset].crop) { S.preset = 0; S.ui = { ...TODAY, ...PRESETS[0].set }; } if (S.land === 'natural') Object.assign(S.ui, { sow: 0, variety: 0, irrigate: false }); change(); });
  pick($('.cropsel', root), 'v', (v) => { S.crop = v as CropId; change(); });
  pick($('.presets', root), 'i', (v) => { S.preset = +v; S.ui = { ...TODAY, ...(+v >= 0 ? PRESETS[+v].set : {}) }; change(); });
  pick($('.hyplist', root), 'i', (v) => { H.i = +v; H.guess = 0; change(); });
  pick($('.guess', root), 'v', (v) => { H.guess = +v; render(); });
  pick($('.cdir', root), 'v', (v) => { H.c.dir = +v; change(); });
  $('.cplace', root).addEventListener('change', (e) => { H.c.site = siteOf((e.target as HTMLSelectElement).value); change(); });
  $('.cland', root).addEventListener('change', (e) => { H.c.land = (e.target as HTMLSelectElement).value as 'natural' | CropId; if (H.c.land === 'natural') Object.assign(H.c.ui, { sow: 0, variety: 0, irrigate: false }); change(); });
  $('.cmeasure', root).addEventListener('change', (e) => { H.c.measure = (e.target as HTMLSelectElement).value; change(); });
  pick($('.places', pane('mechanism')), 'id', (v) => { M.site = siteOf(v); change(M.off.length > 0); });
  $('.customclim', root).addEventListener('click', () => { M.custom = !M.custom; if (!M.custom) M.ui = { ...TODAY }; change(M.off.length > 0); });
  $('.procs', root).addEventListener('change', () => { M.off = $$<HTMLInputElement>('.procs input', root).filter((k) => !k.checked).map((k) => k.dataset.p as ProcId); change(true); });
  $('.fixco2', root).addEventListener('click', () => { M.custom = true; M.ui.co2 = 700; change(true); });
  $$('.run', root).forEach((b) => b.addEventListener('click', () => run()));
  $('.replay', root).addEventListener('click', () => run(9000, false));
  $<HTMLInputElement>('.year', root).addEventListener('input', (e) => { cancelAnimationFrame(raf); year = +(e.target as HTMLInputElement).value; frame(); outcome(true); });
  $('.reset', root).addEventListener('click', () => {
    if (mode === 'scenario') Object.assign(S, { site: SITES[0], land: 'both', crop: SITES[0].crop, ui: { ...TODAY, ...PRESETS[0].set }, preset: 0 });
    else if (mode === 'mechanism') Object.assign(M, { site: SITES[0], ui: { ...TODAY }, off: [], custom: false });
    else { H.i = 0; H.guess = 0; H.c = { site: SITES[0], land: 'natural', ui: { ...TODAY }, measure: 'tree', dir: -1 }; }
    change(); root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('.mkcard', root).addEventListener('click', () => openCard(cardData()));

  const linked = readHash();
  build(); render(); frame();
  if (linked && ready && (mode as Mode) !== 'hypothesis') { ran = true; year = N; render(); frame(); outcome(true); }
}
