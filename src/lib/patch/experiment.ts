// Step 3: run experiments with Patch. Two modes: scenario analysis and hypothesis testing.
import { experiment, C, plantNames, type Scen, type YearOut, type CropId, type Run } from './model';
import { SITES, site as siteOf, type Site } from './sites';
import { blockSvg, sceneOf, BLOCK_VIEW } from './block';
import { openCard, type CardData } from './card';

const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T;
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll(s)] as T[];
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const pct = (v: number) => Math.round(v * 100) + '%';
const signed = (v: number) => { const r = Math.round(v); return (r > 0 ? '+' : r < 0 ? '−' : '±') + Math.abs(r) + '%'; };
const rel = (a: number, b: number) => (a > 0 ? (b / a - 1) * 100 : 0);
const N = 10, CROP_REF: Record<CropId, number> = { wheat: 5, maize: 6, millet: 4 };
const grassOf = (y: YearOut) => Math.min(1 - y.tree, y.grass);
const meanYield = (rows: YearOut[], upTo: number) => { const n = Math.max(1, Math.round(upTo)); let s = 0; for (let y = 1; y <= n; y++) s += rows[y].yield; return s / n; };

interface UI { dT: number; rain: number; co2: number; sow: number; variety: number; irrigate: boolean; fert: boolean; wue: boolean; deepRoots: boolean }
const TODAY: UI = { dT: 0, rain: 0, co2: C.co2ref, sow: 0, variety: 0, irrigate: false, fert: true, wue: true, deepRoots: true };
const toScen = (u: UI): Scen => ({ dT: u.dT, rain: 1 + u.rain / 100, co2: u.co2, sow: u.sow, variety: 1 + 0.2 * u.variety, irrigate: u.irrigate, fert: u.fert, wue: u.wue, deepRoots: u.deepRoots });
const isToday = (u: UI) => (Object.keys(TODAY) as (keyof UI)[]).every((k) => u[k] === TODAY[k]);

/** The settings that differ from today, in words. */
function changes(u: UI, crop: CropId): string[] {
  const o: string[] = [];
  if (u.dT) o.push(`temperature +${u.dT} °C`);
  if (u.rain) o.push(`precipitation ${u.rain > 0 ? '+' : '−'}${Math.abs(u.rain)}%`);
  if (u.co2 !== C.co2ref) o.push(`CO₂ ${u.co2} ppm`);
  if (u.irrigate) o.push('irrigation on');
  if (u.sow) o.push(`sowing ${Math.abs(u.sow)} days ${u.sow < 0 ? 'earlier' : 'later'}`);
  if (u.variety) o.push(`a ${u.variety < 0 ? 'fast' : 'slow'}-ripening ${crop} variety`);
  if (!u.fert) o.push('CO₂ fertilisation switched off');
  if (!u.wue) o.push('CO₂ water saving switched off');
  if (!u.deepRoots) o.push('deep tree roots switched off');
  return o;
}

// ── hypotheses: each one is tested by real model runs, and judged from their numbers ──
interface Test { site: string; land: 'natural' | 'crop'; crop?: CropId; set: Partial<UI> }
interface Verdict { ok: boolean; found: string; why: string }
interface Hyp { text: string; did: string; tests: Test[]; judge(r: Run[]): Verdict }
const y10 = (r: Run) => ({ b: r.base[N], s: r.scen[N] });
const HYPS: Hyp[] = [
  { text: 'In a drought, trees lose more ground than grass.', did: 'Cut precipitation by 30% in a tropical savanna.',
    tests: [{ site: 'niamey', land: 'natural', set: { rain: -30 } }],
    judge: ([r]) => { const { b, s } = y10(r); return { ok: s.tree - b.tree < grassOf(s) - grassOf(b), found: `Tree cover ${pct(b.tree)} → ${pct(s.tree)}. Grass cover ${pct(grassOf(b))} → ${pct(grassOf(s))}.`, why: 'With less rain, little water percolates to the deep soil layer that trees rely on in the dry season. Grass lives off the top layer and takes the space the trees leave.' }; } },
  { text: 'Extra CO₂ helps savanna trees and savanna grass alike.', did: 'Raised CO₂ from 420 to 600 ppm in a tropical savanna.',
    tests: [{ site: 'niamey', land: 'natural', set: { co2: 600 } }],
    judge: ([r]) => { const { b, s } = y10(r); return { ok: s.tree > b.tree + 0.02 && grassOf(s) > grassOf(b) + 0.02, found: `Tree cover ${pct(b.tree)} → ${pct(s.tree)}. Grass cover ${pct(grassOf(b))} → ${pct(grassOf(s))}.`, why: 'These trees are C3 plants: more CO₂ speeds up their photosynthesis. The grass is a C4 plant. It already concentrates CO₂ inside its leaves, so it gains little, and the spreading trees shade it.' }; } },
  { text: 'Warming reduces plant growth in every ecosystem.', did: 'Warmed a tropical savanna and a temperate forest by 3 °C.',
    tests: [{ site: 'niamey', land: 'natural', set: { dT: 3 } }, { site: 'aarhus', land: 'natural', set: { dT: 3 } }],
    judge: ([a, c]) => { const da = rel(a.base[N].npp, a.scen[N].npp), dc = rel(c.base[N].npp, c.scen[N].npp); return { ok: da < -1 && dc < -1, found: `Growth (NPP) changed by ${signed(da)} in the tropical savanna and by ${signed(dc)} in the temperate forest.`, why: 'Where it is already hot, more heat raises respiration and water demand. Where cold limits growth, a longer warm season helps.' }; } },
  { text: 'Irrigation can protect a harvest from drought.', did: 'Cut precipitation by 30% on a millet field, then ran it again with irrigation.',
    tests: [{ site: 'niamey', land: 'crop', crop: 'millet', set: { rain: -30 } }, { site: 'niamey', land: 'crop', crop: 'millet', set: { rain: -30, irrigate: true } }],
    judge: ([d, i]) => { const b = meanYield(d.base, N), dd = rel(b, meanYield(d.scen, N)), di = rel(b, meanYield(i.scen, N)); return { ok: di > -5 && di > dd + 5, found: `Drought alone: yield ${signed(dd)}. Drought with irrigation: yield ${signed(di)}.`, why: 'Irrigation refills the top soil whenever the crop runs short of water, so its stomata stay open and photosynthesis continues.' }; } },
  { text: 'A slower-ripening variety can make up for the yield lost to 2 °C of warming.', did: 'Warmed a millet field by 2 °C, then ran it again with a slow-ripening variety.',
    tests: [{ site: 'niamey', land: 'crop', crop: 'millet', set: { dT: 2 } }, { site: 'niamey', land: 'crop', crop: 'millet', set: { dT: 2, variety: 1 } }],
    judge: ([w, v]) => { const b = meanYield(w.base, N), dw = rel(b, meanYield(w.scen, N)), dv = rel(b, meanYield(v.scen, N)); return { ok: dv > -5, found: `Warming alone: yield ${signed(dw)}, and the crop ripened in ${Math.round(w.scen[5].season)} days instead of ${Math.round(w.base[5].season)}. With the slow variety: yield ${signed(dv)}.`, why: 'Heat makes a crop reach its growing degree days sooner, so it has fewer days to fill its grain. A variety that needs more warm days gets that time back.' }; } },
  { text: 'In a dry savanna, extra CO₂ helps mainly by saving water, not by speeding up photosynthesis.', did: 'Raised CO₂ to 800 ppm three times: with both CO₂ processes, without water saving, and without CO₂ fertilisation.',
    tests: [{ site: 'niamey', land: 'natural', set: { co2: 800 } }, { site: 'niamey', land: 'natural', set: { co2: 800, wue: false } }, { site: 'niamey', land: 'natural', set: { co2: 800, fert: false } }],
    judge: ([f, noW, noF]) => { const g = (r: Run) => rel(r.base[N].npp, r.scen[N].npp), a = g(f), w = g(noW), p = g(noF); return { ok: a - w > a - p, found: `Growth (NPP) with both processes: ${signed(a)}. Without water saving: ${signed(w)}. Without CO₂ fertilisation: ${signed(p)}.`, why: 'Switching a process off shows what it was doing. Here most of the gain disappears without water saving: with more CO₂ the stomata can close a little, and the soil stays wet for longer.' }; } },
];

const GRAPHS: { id: string; label: string; unit: string; land: 'natural' | 'crop'; get(y: YearOut): number; get2?(y: YearOut): number; names?: [string, string] }[] = [
  { id: 'vegc', label: 'Vegetation carbon', unit: 'kg of carbon per m²', land: 'natural', get: (y) => y.vegC / 1000 },
  { id: 'cover', label: 'Tree cover and grass cover', unit: '% of the ground', land: 'natural', get: (y) => y.tree * 100, get2: (y) => grassOf(y) * 100, names: ['trees', 'grass'] },
  { id: 'npp', label: 'Growth (net primary production)', unit: 'g of carbon per m² per year', land: 'natural', get: (y) => y.npp },
  { id: 'yield', label: 'Crop yield', unit: 'tonnes of grain per hectare', land: 'crop', get: (y) => y.yield },
  { id: 'water', label: 'Water in the deep soil', unit: '% full, yearly mean', land: 'natural', get: (y) => y.w2 * 100 },
];

export function experimentPage() {
  const root = $('#exp');
  let mode: 'scenario' | 'hypothesis' = 'scenario', site: Site = SITES[0], crop: CropId = site.crop, ui: UI = { ...TODAY };
  let year = 0, nat: Run, crp: Run, graph = 'vegc', view: 'scen' | 'base' = 'scen', raf = 0;
  let hyp = 0, guess = 0, verdict: Verdict | null = null;

  // ── build the choice buttons ──
  const places = $('.places', root), presets = $('.presets', root), hypList = $('.hyplist', root), gsel = $<HTMLSelectElement>('.gsel', root);
  places.innerHTML = SITES.map((s) => `<button type="button" class="opt" data-id="${s.id}">${s.biome}<small>${s.name}, ${s.country}</small></button>`).join('');
  const PRESETS: [string, Partial<UI>][] = [['Today’s climate', {}], ['Drought decade', { rain: -30 }], ['+2 °C world', { dT: 2, co2: 500 }], ['+4 °C world, high CO₂', { dT: 4, rain: -10, co2: 800 }], ['Drought, with irrigation', { rain: -30, irrigate: true }]];
  presets.innerHTML = PRESETS.map((p, i) => `<button type="button" class="opt" data-i="${i}">${p[0]}</button>`).join('');
  hypList.innerHTML = HYPS.map((h, i) => `<button type="button" class="opt" data-i="${i}">${h.text}</button>`).join('');
  gsel.innerHTML = GRAPHS.map((g) => `<option value="${g.id}">${g.label}</option>`).join('');

  // ── drawing ──
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  function sceneAt(y: number, which: 'scen' | 'base') {
    const rows = which === 'scen' ? nat.scen : nat.base, crows = which === 'scen' ? crp.scen : crp.base;
    const i = Math.min(N - 1, Math.floor(y)), t = clamp(y - i), a = rows[i], b = rows[i + 1];
    const mid = { tree: lerp(a.tree, b.tree, t), grass: lerp(a.grass, b.grass, t), vegC: lerp(a.vegC, b.vegC, t), w1: lerp(a.w1, b.w1, t), w2: lerp(a.w2, b.w2, t), rain: lerp(a.rain, b.rain, t) };
    const ya = crows[Math.max(1, i)].yield, yb = crows[Math.max(1, i + 1)].yield;
    const on = which === 'scen' && y > 0;
    return sceneOf(site.id, mid, crop, clamp(lerp(ya, yb, t) / CROP_REF[crop]), on ? ui.dT : 0, on && ui.irrigate);
  }
  function drawGraph() {
    const g = GRAPHS.find((x) => x.id === graph)!, run = g.land === 'crop' ? crp : nat, from = g.land === 'crop' ? 1 : 0;
    const A = run.base.map(g.get), B = run.scen.map(g.get), A2 = g.get2 ? run.base.map(g.get2) : [], B2 = g.get2 ? run.scen.map(g.get2) : [];
    const top = Math.max(1e-6, ...A.slice(from), ...B.slice(from), ...A2, ...B2) * 1.08, mag = Math.pow(10, Math.floor(Math.log10(top / 4))), stepV = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((v) => v * 4 >= top)!, nice = stepV * 4;
    const X = (y: number) => 46 + (y / N) * 372, Y = (v: number) => 176 - (v / nice) * 156, f = (v: number) => (stepV >= 1 ? v.toFixed(0) : stepV >= 0.1 ? v.toFixed(1) : v.toFixed(2));
    const path = (v: number[]) => v.map((p, i) => (i < from ? '' : `${i === from ? 'M' : 'L'}${X(i).toFixed(1)},${Y(p).toFixed(1)}`)).join('');
    let h = '';
    for (let k = 0; k <= 4; k++) { const v = (nice * k) / 4; h += `<line class="gl" x1="46" x2="418" y1="${Y(v)}" y2="${Y(v)}"/><text x="40" y="${Y(v) + 4}" text-anchor="end">${f(v)}</text>`; }
    for (let y = 0; y <= N; y += 2) h += `<text x="${X(y)}" y="194" text-anchor="middle">${y}</text>`;
    h += `<text x="232" y="210" text-anchor="middle">year</text><line class="now" x1="${X(year)}" x2="${X(year)}" y1="20" y2="176"/>`;
    h += `<path class="b" d="${path(A)}"/><path class="s" d="${path(B)}"/>` + (g.get2 ? `<path class="b2" d="${path(A2)}"/><path class="s2" d="${path(B2)}"/>` : '');
    const yi = Math.round(year);
    if (yi >= from) h += `<circle cx="${X(yi)}" cy="${Y(B[yi])}" r="5" fill="#111"/>` + (g.get2 ? `<circle cx="${X(yi)}" cy="${Y(B2[yi])}" r="5" fill="#b5480b"/>` : '');
    $('.graph', root).innerHTML = `<svg viewBox="0 0 430 214" role="img" aria-label="${g.label} over ten years, under today’s climate and in your experiment">${h}</svg>`;
    $('.gunit', root).textContent = g.unit;
    $('.key', root).innerHTML = g.names ? `<span>${g.names[0]}</span><span class="k2">${g.names[1]}</span><span class="kb">dashed: today’s climate</span>` : `<span>your experiment</span><span class="kb">today’s climate</span>`;
  }
  function explain(): string {
    if (isToday(ui)) return 'Nothing is changed yet. Pick a scenario, or move a control, and the land will respond.';
    const b = nat.base[N], s = nat.scen[N], cb = crp.base, cs = crp.scen, o: string[] = [];
    const dTree = (s.tree - b.tree) * 100, dW = (s.w2 - b.w2) * 100, dSeason = cs[5].season - cb[5].season;
    if (Math.abs(dTree) >= 4) o.push(`After ten years trees cover ${pct(s.tree)} of the ground instead of ${pct(b.tree)}, and grass ${pct(grassOf(s))} instead of ${pct(grassOf(b))}.`);
    else o.push('Tree and grass cover hardly change.');
    if (Math.abs(dW) >= 4) o.push(`The deep soil is ${pct(s.w2)} full on average, instead of ${pct(b.w2)}.`);
    if (Math.abs(s.brake - b.brake) > 0.04) o.push(s.brake < b.brake ? 'Plants are short of water more often, so their stomata close and photosynthesis slows.' : 'Plants are short of water less often, so photosynthesis can run for longer.');
    if (Math.abs(dSeason) >= 3) o.push(`The ${crop} ripens in ${Math.round(cs[5].season)} days instead of ${Math.round(cb[5].season)}, which ${dSeason < 0 ? 'leaves less' : 'gives more'} time to fill the grain.`);
    if (ui.irrigate) o.push(`Irrigation adds about ${Math.round(meanYieldLike(cs, 'irrig'))} mm of water a year.`);
    return o.join(' ');
  }
  const meanYieldLike = (rows: YearOut[], k: 'irrig') => rows.slice(1).reduce((a, r) => a + r[k], 0) / N;

  function frame() {
    $('.blockwrap', root).innerHTML = `<svg class="block" viewBox="${BLOCK_VIEW}" role="img" aria-label="The block of land in year ${Math.round(year)}">${blockSvg(sceneAt(year, view))}</svg>`;
    const yi = Math.round(year);
    $('.yr', root).textContent = `Year ${yi} of ${N}`;
    const ys = $<HTMLInputElement>('.year', root); ys.value = String(year); ys.style.setProperty('--v', String(year / N));
    const veg = rel(nat.base[yi].vegC, nat.scen[yi].vegC), yl = yi < 1 ? 0 : rel(meanYield(crp.base, yi), meanYield(crp.scen, yi));
    $('.heads .v b', root).textContent = signed(veg);
    $('.heads .y b', root).textContent = signed(yl);
    $('.heads .y p', root).textContent = `Cropland: ${crop} yield, mean of years 1 to ${Math.max(1, yi)}, compared with today’s climate`;
    drawGraph();
  }
  function compute() { const sc = toScen(ui); nat = experiment(site, sc, 'natural', N); crp = experiment(site, sc, crop, N); }
  function update(jumpToEnd = true) {
    cancelAnimationFrame(raf);
    compute();
    if (jumpToEnd) year = isToday(ui) ? 0 : N;
    $$('.places .opt', root).forEach((b) => b.classList.toggle('on', b.dataset.id === site.id));
    $$('.crops .opt', root).forEach((b) => b.classList.toggle('on', b.dataset.v === crop));
    $$('.variety .opt', root).forEach((b) => b.classList.toggle('on', +b.dataset.v! === ui.variety));
    $$('.modes .opt', root).forEach((b) => b.classList.toggle('on', b.dataset.v === mode));
    $$('.view .opt', root).forEach((b) => b.classList.toggle('on', b.dataset.v === view));
    $$<HTMLInputElement>('input[data-k]', root).forEach((k) => {
      const key = k.dataset.k as keyof UI;
      if (k.type === 'checkbox') k.checked = ui[key] as boolean;
      else { k.value = String(ui[key]); const fr = (v: number) => (v - +k.min) / (+k.max - +k.min); k.style.setProperty('--p', String(fr(TODAY[key] as number))); k.style.setProperty('--v', String(fr(+k.value))); }
    });
    const o = (k: string, t: string) => ($(`output[data-o="${k}"]`, root).textContent = t);
    o('dT', ui.dT ? `+${ui.dT} °C` : 'as today'); o('rain', ui.rain ? `${ui.rain > 0 ? '+' : '−'}${Math.abs(ui.rain)}%` : 'as today'); o('co2', ui.co2 === C.co2ref ? '420 ppm, as today' : `${ui.co2} ppm`);
    o('sow', ui.sow ? `${Math.abs(ui.sow)} days ${ui.sow < 0 ? 'earlier' : 'later'}` : 'usual');
    const names = plantNames(site, 'natural');
    $('.where', root).innerHTML = `${site.biome}, near ${site.name}, ${site.country} <span>${site.blurb}. Natural vegetation in Patch: ${names[0]}s and ${names[1]}.</span>`;
    $('.scenario-only', root).hidden = mode !== 'scenario'; $('.hyp', root).hidden = mode !== 'hypothesis';
    $('.explain', root).textContent = explain();
    $<HTMLButtonElement>('.tools .mkcard', root).disabled = isToday(ui); $('.tools', root).hidden = mode !== 'scenario';
    $$('.presets .opt', root).forEach((b, i) => b.classList.toggle('on', (Object.keys(TODAY) as (keyof UI)[]).every((k) => ui[k] === ({ ...TODAY, ...PRESETS[i][1] } as UI)[k])));
    $$('.hyplist .opt', root).forEach((b, i) => b.classList.toggle('on', i === hyp));
    $$('.guess .opt', root).forEach((b) => b.classList.toggle('on', +b.dataset.v! === guess));
    $('.hdid', root).textContent = HYPS[hyp].did;
    $('.hres', root).hidden = !verdict; $('.hwait', root).hidden = !!verdict;
    if (verdict) {
      $('.verdict', root).textContent = verdict.ok ? 'Hypothesis supported, in this model.' : 'Hypothesis not supported, in this model.';
      $('.hfound', root).textContent = verdict.found; $('.hwhy', root).textContent = verdict.why;
      $('.hyours', root).textContent = guess === 0 ? '' : (guess === 1) === verdict.ok ? 'Your prediction was right.' : 'Your prediction was wrong. That is useful: it is how ideas get corrected.';
    }
    history.replaceState(null, '', hash());
    frame();
  }
  function play() {
    cancelAnimationFrame(raf);
    const t0 = performance.now(), dur = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 5200;
    const tick = (now: number) => { year = clamp((now - t0) / dur) * N; frame(); if (year < N) raf = requestAnimationFrame(tick); };
    view = 'scen'; $$('.view .opt', root).forEach((b) => b.classList.toggle('on', b.dataset.v === view));
    raf = requestAnimationFrame(tick);
  }

  // ── shareable link ──
  const KEYS: [keyof UI, string][] = [['dT', 't'], ['rain', 'r'], ['co2', 'c'], ['sow', 's'], ['variety', 'v'], ['irrigate', 'i'], ['fert', 'f'], ['wue', 'w'], ['deepRoots', 'd']];
  function hash() {
    const q = new URLSearchParams();
    if (site.id !== SITES[0].id) q.set('p', site.id);
    if (crop !== site.crop) q.set('k', crop);
    for (const [k, s] of KEYS) if (ui[k] !== TODAY[k]) q.set(s, String(+ui[k]));
    const t = q.toString(); return t ? '#' + t : location.pathname;
  }
  function readHash() {
    const q = new URLSearchParams(location.hash.slice(1));
    if (q.get('p')) { site = siteOf(q.get('p')!); crop = site.crop; }
    if (q.get('k') && q.get('k')! in CROP_REF) crop = q.get('k') as CropId;
    for (const [k, s] of KEYS) if (q.has(s)) (ui as unknown as Record<string, number | boolean>)[k] = typeof TODAY[k] === 'boolean' ? q.get(s) === '1' : +q.get(s)!;
  }

  // ── result card ──
  function cardData(): CardData {
    const where = `${site.biome}, ${site.name}, ${site.country}`;
    if (mode === 'hypothesis' && verdict) {
      const h = HYPS[hyp];
      return { kind: 'Hypothesis testing', where, heading: 'Hypothesis', claim: h.text, did: h.did + ' Kept everything else as today. Ran the model for 10 years.', found: verdict.found, why: verdict.why, conclusion: verdict.ok ? 'Hypothesis supported' : 'Hypothesis not supported', scene: sceneAt(N, 'scen'), url: location.href };
    }
    const b = nat.base[N], s = nat.scen[N], ch = changes(ui, crop);
    return { kind: 'Scenario analysis', where, heading: 'Question', claim: `What happens to this land in 10 years with ${ch.slice(0, 3).join(', ')}${ch.length > 3 ? ' and more' : ''}?`, did: `Changed: ${ch.join('; ')}. Ran the model for 10 years and compared it with today’s climate.`,
      found: `Vegetation carbon ${signed(rel(b.vegC, s.vegC))}. Tree cover ${pct(b.tree)} → ${pct(s.tree)}. ${crop[0].toUpperCase() + crop.slice(1)} yield ${signed(rel(meanYield(crp.base, N), meanYield(crp.scen, N)))}.`, why: explain().split('. ').slice(1, 3).join('. ').replace(/\.?$/, '.'), conclusion: '', scene: sceneAt(N, 'scen'), url: location.href };
  }

  // ── controls ──
  let timer = 0;
  $$<HTMLInputElement>('input[data-k]', root).forEach((k) => {
    const set = () => { (ui as unknown as Record<string, number | boolean>)[k.dataset.k!] = k.type === 'checkbox' ? k.checked : +k.value; };
    k.addEventListener('input', () => { set(); clearTimeout(timer); timer = window.setTimeout(() => update(), 90); });
    k.addEventListener('change', () => { set(); clearTimeout(timer); update(); });
  });
  places.addEventListener('click', (e) => { const b = (e.target as Element).closest<HTMLElement>('[data-id]'); if (b) { site = siteOf(b.dataset.id!); crop = site.crop; update(); } });
  $('.crops', root).addEventListener('click', (e) => { const b = (e.target as Element).closest<HTMLElement>('[data-v]'); if (b) { crop = b.dataset.v as CropId; update(); } });
  $('.variety', root).addEventListener('click', (e) => { const b = (e.target as Element).closest<HTMLElement>('[data-v]'); if (b) { ui.variety = +b.dataset.v!; update(); } });
  $('.view', root).addEventListener('click', (e) => { const b = (e.target as Element).closest<HTMLElement>('[data-v]'); if (b) { view = b.dataset.v as 'scen' | 'base'; update(false); } });
  presets.addEventListener('click', (e) => { const b = (e.target as Element).closest<HTMLElement>('[data-i]'); if (b) { ui = { ...TODAY, ...PRESETS[+b.dataset.i!][1] }; update(false); play(); } });
  $('.modes', root).addEventListener('click', (e) => { const b = (e.target as Element).closest<HTMLElement>('[data-v]'); if (!b) return; mode = b.dataset.v as typeof mode; if (mode === 'hypothesis') { ui = { ...TODAY }; verdict = null; } update(); });
  gsel.addEventListener('change', () => { graph = gsel.value; frame(); });
  $<HTMLInputElement>('.year', root).addEventListener('input', (e) => { cancelAnimationFrame(raf); year = +(e.target as HTMLInputElement).value; frame(); });
  $('.run', root).addEventListener('click', () => { update(false); play(); });
  $('.reset', root).addEventListener('click', () => { ui = { ...TODAY }; verdict = null; update(); });
  hypList.addEventListener('click', (e) => { const b = (e.target as Element).closest<HTMLElement>('[data-i]'); if (b) { hyp = +b.dataset.i!; guess = 0; verdict = null; ui = { ...TODAY }; update(); } });
  $('.guess', root).addEventListener('click', (e) => { const b = (e.target as Element).closest<HTMLElement>('[data-v]'); if (b) { guess = +b.dataset.v!; update(false); } });
  $('.runtest', root).addEventListener('click', () => {
    const h = HYPS[hyp];
    const runs = h.tests.map((t) => { const s = siteOf(t.site); return experiment(s, toScen({ ...TODAY, ...t.set }), t.land === 'crop' ? t.crop ?? s.crop : 'natural', N); });
    verdict = h.judge(runs);
    const last = h.tests[h.tests.length > 2 ? 0 : h.tests.length - 1]; // show the most telling run on the land
    site = siteOf(last.site); crop = last.crop ?? site.crop; ui = { ...TODAY, ...last.set };
    graph = last.land === 'crop' ? 'yield' : h.tests.length > 1 ? 'npp' : 'cover'; gsel.value = graph;
    update(false); play();
  });
  $$('.mkcard', root).forEach((b) => b.addEventListener('click', () => openCard(cardData())));

  readHash();
  update();
}
