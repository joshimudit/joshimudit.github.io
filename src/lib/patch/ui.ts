// Everything interactive on the Patch page. The widgets call the model's own functions,
// so the numbers in each "rule" are the numbers the model uses.
import { C, PFT, BASE, runPatch, lightCaught, lightUse, tempLimit, thirst, poreFactor, breathing, gammaStar, type Scen, type Result, type DayOut } from './model';
import { STATIONS, AARHUS, transect, type Site } from './sites';

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll(sel)] as T[];
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const pct = (x: number) => Math.round(x * 100) + '%';
const signed = (x: number, unit = '%') => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(Math.round(x)) + unit;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MDAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const monthOfDay = (d: number) => { let m = 0, e = MDAYS[0]; while (d >= e && m < 11) { m++; e += MDAYS[m]; } return m; };
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const CELLS = transect();
const PLACES: Site[] = [...STATIONS, AARHUS];
const cache = new Map<string, Result>();
function run(site: Site, scen: Scen = BASE, land: 'natural' | 'crop' = 'natural'): Result {
  const key = [site.id, site.lat, land, scen.dT, scen.rain, scen.co2, scen.sow ?? 0, scen.variety ?? 1, C.alphaA].join('|');
  let r = cache.get(key);
  if (!r) { r = runPatch(site, scen, { land, years: land === 'crop' ? 40 : 220, average: land === 'crop' ? 30 : 40 }); cache.set(key, r); if (cache.size > 60) cache.delete(cache.keys().next().value!); }
  return r;
}

// ───────────────────────── the picture of a patch ─────────────────────────
export interface SceneState { d: DayOut; maxTree: number; maxGrass: number; crop: boolean; label?: string }
export function drawScene(svg: SVGSVGElement, s: SceneState) {
  const d = s.d, G = 150;
  let h = `<rect class="sky" x="0" y="0" width="360" height="${G}"/>`;
  const sunR = 9 + 13 * clamp(d.par / 12);
  h += `<circle class="sun" cx="330" cy="30" r="${sunR.toFixed(1)}"/>`;
  if (d.P > 0.5) {
    h += `<g class="cloud"><ellipse cx="150" cy="34" rx="46" ry="15"/><ellipse cx="120" cy="40" rx="30" ry="12"/><ellipse cx="184" cy="41" rx="32" ry="12"/></g>`;
    const n = Math.min(14, 3 + Math.round(d.P / 3));
    for (let i = 0; i < n; i++) { const x = 96 + i * (112 / n) + (i % 2) * 5; h += `<line class="rain" x1="${x}" y1="${56 + (i % 3) * 9}" x2="${x - 5}" y2="${72 + (i % 3) * 9}"/>`; }
  }
  // soil and the water in it
  h += `<rect class="soil1" x="0" y="${G}" width="360" height="45"/><rect class="soil2" x="0" y="${G + 45}" width="360" height="55"/>`;
  const h1 = 45 * clamp(d.w1), h2 = 55 * clamp(d.w2);
  h += `<rect class="water" x="0" y="${G + 45 - h1}" width="360" height="${h1.toFixed(1)}"/><rect class="water" x="0" y="${G + 100 - h2}" width="360" height="${h2.toFixed(1)}"/>`;
  h += `<text class="lab" x="8" y="${G + 16}">top soil ${pct(clamp(d.w1))} full</text><text class="lab" x="8" y="${G + 62}">deep soil ${pct(clamp(d.w2))} full</text>`;
  if (s.crop) {
    const tall = clamp(d.laiGrass / 4), on = d.laiGrass > 0.02;
    for (let i = 0; i < 12; i++) {
      const x = 22 + i * 29, top = G - 6 - 62 * tall;
      if (!on) { h += `<line class="furrow" x1="${x - 9}" y1="${G - 2}" x2="${x + 9}" y2="${G - 2}"/>`; continue; }
      h += `<line class="stem" x1="${x}" y1="${G}" x2="${x}" y2="${top}"/><path class="leaf" d="M${x},${G - 10 - 30 * tall} q-12,-8 -15,2 M${x},${G - 16 - 40 * tall} q12,-9 15,1"/>`;
      if (d.grain > 3) h += `<ellipse class="grain" cx="${x}" cy="${top - 4}" rx="${(2 + 3 * clamp(d.grain / 200)).toFixed(1)}" ry="${(5 + 6 * clamp(d.grain / 200)).toFixed(1)}"/>`;
      h += `<line class="root" x1="${x}" y1="${G}" x2="${x - 4}" y2="${G + 14 + 22 * tall}"/>`;
    }
  } else {
    // grass first, trees in front
    const gsize = clamp(s.maxGrass * 1.3), green = s.maxGrass > 0.02 ? clamp(d.coverGrass / s.maxGrass) : 0;
    const blades = Math.round(46 * gsize);
    for (let i = 0; i < blades; i++) {
      const x = 6 + ((i * 97) % 348), ht = 5 + 16 * gsize * (0.6 + 0.4 * ((i * 37) % 10) / 10);
      h += `<line class="${green > 0.45 ? 'blade' : 'straw'}" x1="${x}" y1="${G}" x2="${x + ((i % 3) - 1) * 3}" y2="${(G - ht * (0.45 + 0.55 * green)).toFixed(1)}"/>`;
    }
    const tsize = Math.sqrt(clamp(s.maxTree)), leafy = s.maxTree > 0.02 ? clamp(d.coverTree / s.maxTree) : 0;
    if (s.maxTree > 0.04) for (const [x, k] of [[62, 1], [170, 0.86], [262, 0.94]] as const) {
      const r = (10 + 30 * tsize) * k, th = (18 + 44 * tsize) * k;
      h += `<line class="trunk" x1="${x}" y1="${G}" x2="${x}" y2="${G - th}" stroke-width="${(2 + 5 * tsize).toFixed(1)}"/>`;
      h += `<path class="root" d="M${x},${G} l-10,${30 + 40 * tsize} M${x},${G} l8,${22 + 30 * tsize}"/>`;
      const cy = G - th - r * 0.45;
      h += `<g class="crown" style="opacity:${(0.12 + 0.88 * leafy).toFixed(2)}"><circle cx="${x}" cy="${cy.toFixed(1)}" r="${(r * 0.8).toFixed(1)}"/><circle cx="${(x - r * 0.62).toFixed(1)}" cy="${(cy + r * 0.3).toFixed(1)}" r="${(r * 0.6).toFixed(1)}"/><circle cx="${(x + r * 0.62).toFixed(1)}" cy="${(cy + r * 0.3).toFixed(1)}" r="${(r * 0.6).toFixed(1)}"/></g>`;
    }
  }
  if (s.label) h += `<text class="when" x="10" y="20">${s.label}</text>`;
  svg.innerHTML = h;
}

// ───────────────────────── one rule at a time ─────────────────────────
type Vals = Record<string, number | string>;
interface Term { op?: string; v: string; l: string; k?: string[]; end?: boolean }
interface RuleCfg {
  chips?: { label: string; set: Vals; ctx: string }[];
  calc(v: Vals): { terms: Term[]; say: string };
  draw?(svg: SVGSVGElement, v: Vals): void;
  fmt?: Record<string, (x: number) => string>;
}
function rule(id: string, cfg: RuleCfg) {
  const root = $('#' + id); if (!root) return;
  const svg = $<SVGSVGElement>('svg.vis', root), eq = $('.eq', root), say = $('.say', root), ctx = $('.ctx', root);
  const v: Vals = {};
  const sliders = $$<HTMLInputElement>('input[type=range]', root);
  sliders.forEach((s) => (v[s.dataset.k!] = +s.value));
  $$<HTMLElement>('[data-opt]', root).forEach((g) => { const on = $<HTMLElement>('button.on', g); v[g.dataset.opt!] = on.dataset.v!; });
  let last = '';
  const update = () => {
    sliders.forEach((s) => { const o = $(`[data-o="${s.dataset.k}"]`, root); if (o) o.textContent = cfg.fmt?.[s.dataset.k!]?.(+s.value) ?? s.value; });
    const r = cfg.calc(v);
    eq.innerHTML = r.terms.map((t) => `<span class="tm${t.end ? ' end' : ''}${t.k?.includes(last) ? ' hot' : ''}"><b>${t.op ? `<em class="op">${t.op}</em>` : ''}${t.v}</b><i>${t.l}</i></span>`).join('');
    say.textContent = r.say;
    if (svg && cfg.draw) cfg.draw(svg, v);
  };
  sliders.forEach((s) => s.addEventListener('input', () => { v[s.dataset.k!] = +s.value; last = s.dataset.k!; if (ctx) ctx.textContent = ''; $$('.chips button', root).forEach((b) => b.classList.remove('on')); update(); }));
  $$<HTMLElement>('[data-opt]', root).forEach((g) => $$<HTMLButtonElement>('button', g).forEach((b) => b.addEventListener('click', () => {
    $$('button', g).forEach((x) => x.classList.toggle('on', x === b)); v[g.dataset.opt!] = b.dataset.v!; last = g.dataset.opt!; update();
  })));
  const chipBox = $('.chips', root);
  cfg.chips?.forEach((c) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = c.label;
    b.addEventListener('click', () => {
      Object.assign(v, c.set); last = '';
      sliders.forEach((s) => { if (s.dataset.k! in c.set) s.value = String(c.set[s.dataset.k!]); });
      $$<HTMLElement>('[data-opt]', root).forEach((g) => { if (g.dataset.opt! in c.set) $$('button', g).forEach((x) => x.classList.toggle('on', (x as HTMLElement).dataset.v === c.set[g.dataset.opt!])); });
      $$('button', chipBox).forEach((x) => x.classList.toggle('on', x === b));
      if (ctx) ctx.textContent = c.ctx;
      update();
    });
    chipBox.appendChild(b);
  });
  update();
}

function rules() {
  // Rule 1: leaves catch light
  rule('r-light', {
    fmt: { L: (x) => x.toFixed(1) },
    chips: [
      { label: 'Bare field', set: { L: 0.1 }, ctx: 'A ploughed field in early spring. Almost all the sunlight lands on bare soil and is wasted.' },
      { label: 'Mown lawn', set: { L: 2 }, ctx: 'A lawn has about two layers of leaf over every patch of ground.' },
      { label: 'Wheat field in June', set: { L: 5 }, ctx: 'A dense crop in early summer. Hardly any light reaches the ground.' },
      { label: 'Rainforest', set: { L: 6.5 }, ctx: 'So many layers of leaf that the forest floor is dark at noon.' },
    ],
    calc: (v) => {
      const L = +v.L, f = lightCaught(L);
      const say = L < 1.5 ? 'Each new layer of leaves catches a lot of extra light.' : L < 4 ? 'The top leaves now shade the ones below. A new layer adds less than the one before.' : 'Nearly all the light is caught already. More leaves would cost sugar and add almost nothing.';
      return { terms: [{ v: L.toFixed(1), l: 'layers of leaves', k: ['L'] }, { op: '→', v: pct(f), l: 'of the light is caught', k: ['L'], end: true }, { op: '', v: pct(1 - f), l: 'reaches the ground', k: ['L'] }], say };
    },
    draw: (svg, v) => {
      const L = +v.L, n = Math.max(1, Math.round(L)), G = 128;
      let h = `<rect class="soil1" x="0" y="${G}" width="360" height="22"/>`;
      for (let i = 0; i < 8; i++) {
        const x = 40 + i * 40;
        for (let k = 0; k <= n; k++) {
          const y0 = 6 + (k * (G - 6)) / (n + 1), y1 = 6 + ((k + 1) * (G - 6)) / (n + 1), rem = Math.exp((-C.k * L * k) / n);
          h += `<line class="beam" x1="${x}" y1="${y0}" x2="${x}" y2="${y1}" stroke-width="${(5 * rem + 0.4).toFixed(2)}" style="opacity:${(0.2 + 0.8 * rem).toFixed(2)}"/>`;
        }
      }
      if (L >= 0.4) for (let k = 1; k <= n; k++) h += `<rect class="layer" x="18" y="${6 + (k * (G - 6)) / (n + 1) - 4}" width="324" height="8" rx="4"/>`;
      svg.innerHTML = h;
    },
  });

  // Rule 2: light becomes sugar, if the temperature suits
  const plantOf = (v: Vals) => (v.plant === 'c4' ? PFT.c4grass : PFT.temptree);
  rule('r-sugar', {
    fmt: { sun: (x) => x.toFixed(0), T: (x) => x.toFixed(0) + ' °C' },
    chips: [
      { label: 'Frosty morning', set: { T: -3, sun: 3 }, ctx: 'A clear winter morning in Denmark. There is light, but the leaf machinery is too cold to run.' },
      { label: 'Mild spring day', set: { T: 16, sun: 7 }, ctx: 'A bright day in May. Comfortable for plants from cool places.' },
      { label: 'Tropical afternoon', set: { T: 33, sun: 10 }, ctx: 'A sunny day in the Sahel. Now the two kinds of plant behave very differently.' },
      { label: 'Heatwave', set: { T: 44, sun: 11 }, ctx: 'Hotter than most plants ever meet. Only the hot-climate grass still works well.' },
    ],
    calc: (v) => {
      const p = plantOf(v), T = +v.T, sun = +v.sun, e = lightUse(p.c4, T, C.co2ref), f = tempLimit(p.tl, T), g = sun * e * f;
      const say = f === 0 ? `Too ${T < p.tl[1] ? 'cold' : 'hot'} for this plant. It makes no sugar at all today.` : f < 1 ? `Outside this plant's comfortable range (${p.tl[1]} to ${p.tl[2]} °C), so it works at ${pct(f)} of full speed.`
        : p.c4 ? 'This grass pumps CO₂ into its leaves, so warmth does not cost it anything.' : T > 24 ? 'It is in its comfortable range, but notice the middle number falling as it gets warmer. In warm air this plant wastes more of what it makes.' : 'In its comfortable range. More light simply means more sugar.';
      return { terms: [{ v: sun.toFixed(0), l: 'units of light caught', k: ['sun'] }, { op: '×', v: e.toFixed(2), l: 'sugar per unit of light', k: ['T', 'plant'] }, { op: '×', v: f.toFixed(2), l: 'too cold or too hot?', k: ['T', 'plant'] }, { op: '=', v: g.toFixed(1), l: 'grams of sugar today', end: true }], say };
    },
    draw: (svg, v) => {
      const T = +v.T, sun = +v.sun, X = (t: number) => 34 + ((t + 5) / 55) * 316, Y = (g: number) => 126 - (g / 20) * 118;
      let h = '';
      for (const t of [0, 10, 20, 30, 40, 50]) h += `<text class="lab" x="${X(t)}" y="144" text-anchor="middle">${t}°</text>`;
      h += `<line class="axis" x1="34" y1="126" x2="350" y2="126"/>`;
      for (const [p, cls] of [[PFT.temptree, 'c3'], [PFT.c4grass, 'c4']] as const) {
        let d = '';
        for (let t = -5; t <= 50; t += 0.5) d += `${d ? 'L' : 'M'}${X(t).toFixed(1)},${Y(sun * lightUse(p.c4, t, C.co2ref) * tempLimit(p.tl, t)).toFixed(1)}`;
        const mine = plantOf(v) === p;
        h += `<path class="curve ${cls}${mine ? ' on' : ''}" d="${d}"/>`;
        if (mine) h += `<circle class="dot ${cls}" cx="${X(T)}" cy="${Y(sun * lightUse(p.c4, T, C.co2ref) * tempLimit(p.tl, T))}" r="6"/>`;
      }
      svg.innerHTML = h;
    },
  });

  // Rule 3: the soil is a bucket, and thirst is a brake
  rule('r-water', {
    fmt: { w: (x) => x.toFixed(0) + '% full', T: (x) => x.toFixed(0) + ' °C', sun: (x) => (x < 35 ? 'cloudy' : x < 70 ? 'some sun' : 'clear sky') },
    chips: [
      { label: 'Morning after a storm', set: { w: 95, T: 27, sun: 60 }, ctx: 'The soil is soaked. Roots can deliver all the water the leaves ask for.' },
      { label: 'Cool cloudy day', set: { w: 45, T: 13, sun: 20 }, ctx: 'The soil is only half full, but the air asks for very little.' },
      { label: 'Three weeks without rain', set: { w: 16, T: 36, sun: 95 }, ctx: 'Deep in the dry season. Hot, bright air pulls hard at leaves, and there is little left in the soil.' },
    ],
    calc: (v) => {
      const w = +v.w / 100, T = +v.T, sf = +v.sun / 100, Rs = (0.25 + 0.5 * sf) * 36, dem = thirst(Rs, T, sf), sup = C.emax * w, b = dem > 0 ? Math.min(1, sup / dem) : 1;
      const say = b >= 1 ? 'Roots can deliver more than the air asks for. The brake is off, and extra water would change nothing.' : `Roots cannot keep up. The plant half-closes the pores in its leaves to save water, so less CO₂ gets in and it makes only ${pct(b)} of the sugar it could.`;
      return { terms: [{ v: sup.toFixed(1), l: 'mm roots can deliver', k: ['w'] }, { op: '÷', v: dem.toFixed(1), l: 'mm the air asks for', k: ['T', 'sun'] }, { op: '=', v: b.toFixed(2), l: 'water brake (1 = off)', end: true }], say };
    },
    draw: (svg, v) => {
      const w = +v.w / 100, T = +v.T, sf = +v.sun / 100, dem = thirst((0.25 + 0.5 * sf) * 36, T, sf), sup = C.emax * w, S = (x: number) => (x / 9) * 150;
      let h = `<rect class="soil1" x="20" y="24" width="120" height="110" rx="3"/><rect class="water" x="20" y="${24 + 110 * (1 - w)}" width="120" height="${110 * w}" rx="3"/><text class="lab" x="80" y="16" text-anchor="middle">water in the soil</text>`;
      h += `<text class="lab" x="180" y="46">roots can deliver</text><rect class="barS" x="180" y="52" width="${S(sup).toFixed(1)}" height="16" rx="3"/>`;
      h += `<text class="lab" x="180" y="96">the air asks for</text><rect class="barD" x="180" y="102" width="${S(dem).toFixed(1)}" height="16" rx="3"/>`;
      svg.innerHTML = h;
    },
  });

  // Rule 4: CO2
  rule('r-co2', {
    fmt: { co2: (x) => x.toFixed(0) + ' ppm' },
    chips: [
      { label: 'Ice age', set: { co2: 190 }, ctx: 'Twenty thousand years ago the air held less than half of today\'s CO₂.' },
      { label: 'Year 1850', set: { co2: 285 }, ctx: 'Before factories and cars.' },
      { label: 'Today', set: { co2: 425 }, ctx: 'About 425 parts per million, and rising by two or three every year.' },
      { label: '2100, middle path', set: { co2: 600 }, ctx: 'Roughly where a middle-of-the-road emissions scenario ends the century.' },
      { label: '2100, high emissions', set: { co2: 870 }, ctx: 'Roughly where a high-emissions scenario ends the century.' },
    ],
    calc: (v) => {
      const c = +v.co2, T = 25, g3 = lightUse(false, T, c) / lightUse(false, T, C.co2ref) - 1, w3 = poreFactor(false, T, c) - 1, w4 = poreFactor(true, T, c) - 1;
      const ci = C.lambda * c, gs = gammaStar(T);
      const say = c > 440 ? 'Trees, wheat and rice gain sugar. Maize, millet and savanna grasses gain nothing directly, because they already pump CO₂ into their leaves. Both kinds lose a little less water.' : c < 400 ? 'With less CO₂, trees and wheat starve a little. The hot-climate grasses do not care, which is one reason they spread when CO₂ was low.' : 'This is roughly today. Slide right to see the future, left to see the past.';
      return { terms: [{ v: ci.toFixed(0), l: 'CO₂ inside the leaf', k: ['co2'] }, { op: 'vs', v: gs.toFixed(0), l: 'the level where a leaf just breaks even' }, { op: '→', v: signed(g3 * 100), l: 'sugar, trees and wheat', k: ['co2'], end: true }, { op: '', v: signed(0), l: 'sugar, maize and savanna grass' }, { op: '', v: signed(((w3 + w4) / 2) * 100), l: 'water lost by leaves', k: ['co2'] }], say };
    },
    draw: (svg, v) => {
      const c = +v.co2, X = (x: number) => 30 + ((x - 180) / 720) * 316, Y = (r: number) => 122 - (r / 1.6) * 106;
      let h = `<line class="axis" x1="30" y1="${Y(1)}" x2="350" y2="${Y(1)}"/><text class="lab" x="32" y="${Y(1) - 5}">today's level of sugar-making</text>`;
      for (const x of [200, 400, 600, 800]) h += `<text class="lab" x="${X(x)}" y="144" text-anchor="middle">${x}</text>`;
      let d3 = '';
      for (let x = 180; x <= 900; x += 10) d3 += `${d3 ? 'L' : 'M'}${X(x).toFixed(1)},${Y(lightUse(false, 25, x) / lightUse(false, 25, C.co2ref)).toFixed(1)}`;
      h += `<path class="curve c3 on" d="${d3}"/><path class="curve c4 on" d="M${X(180)},${Y(1)}L${X(900)},${Y(1)}"/>`;
      h += `<circle class="dot c3" cx="${X(c)}" cy="${Y(lightUse(false, 25, c) / lightUse(false, 25, C.co2ref))}" r="6"/><circle class="dot c4" cx="${X(c)}" cy="${Y(1)}" r="6"/>`;
      svg.innerHTML = h;
    },
  });

  // Rule 5: spending the sugar
  rule('r-spend', {
    fmt: { made: (x) => x.toFixed(1) + ' g', size: (x) => x.toFixed(0) + ' g', T: (x) => x.toFixed(0) + ' °C' },
    chips: [
      { label: 'Young plant, mild day', set: { made: 4, size: 80, T: 18 }, ctx: 'Small body, small running costs. Most of the sugar becomes new growth.' },
      { label: 'Full-grown, good day', set: { made: 9, size: 600, T: 24 }, ctx: 'A big plant earns a lot and burns a lot just staying alive.' },
      { label: 'Full-grown, hot dry month', set: { made: 1.5, size: 600, T: 36 }, ctx: 'The water brake has cut its income, and the heat has raised its running costs.' },
    ],
    calc: (v) => {
      const made = +v.made, size = +v.size, T = +v.T, rm = size * 0.0026 * breathing(T), left = made - rm, grow = left > 0 ? left * (1 - C.growthResp) : left;
      const say = left <= 0 ? 'It burns more than it makes. The plant has to use up its own leaves and roots, and it shrinks. A tree that ends a whole year like this dies back.' : rm > made * 0.6 ? 'Most of the sugar goes on staying alive. Little is left to grow.' : 'Breathing takes its share first. A quarter of the rest is burnt as the cost of building, and the remainder becomes new leaves, roots and wood.';
      return { terms: [{ v: made.toFixed(1), l: 'grams of sugar made', k: ['made'] }, { op: '−', v: rm.toFixed(1), l: 'burnt to stay alive', k: ['size', 'T'] }, { op: '−', v: (left > 0 ? left * C.growthResp : 0).toFixed(1), l: 'cost of building', k: ['made', 'size', 'T'] }, { op: '=', v: grow.toFixed(1).replace('-', '−'), l: grow < 0 ? 'the plant shrinks' : 'grams of new plant', end: true }], say };
    },
    draw: (svg, v) => {
      const made = +v.made, size = +v.size, T = +v.T, rm = size * 0.0026 * breathing(T), left = made - rm, S = (x: number) => (x / 12) * 300;
      let h = `<text class="lab" x="30" y="20">sugar made today</text><rect class="barS" x="30" y="26" width="${S(made).toFixed(1)}" height="20" rx="3"/>`;
      h += `<text class="lab" x="30" y="76">where it goes</text>`;
      const a = Math.min(rm, 12), b = left > 0 ? left * C.growthResp : 0, c = left > 0 ? left * 0.75 : 0;
      h += `<rect class="barD" x="30" y="82" width="${S(a).toFixed(1)}" height="20"/>`;
      if (left > 0) h += `<rect class="barB" x="${30 + S(a) + 2}" y="82" width="${Math.max(0, S(b) - 2).toFixed(1)}" height="20"/><rect class="barG" x="${30 + S(a + b) + 2}" y="82" width="${Math.max(0, S(c) - 2).toFixed(1)}" height="20" rx="3"/>`;
      h += `<text class="lab" x="30" y="120">breathing</text>${left > 0 ? `<text class="lab" x="${Math.min(250, 30 + S(a + b) + 4)}" y="120">growth</text>` : `<text class="lab warn" x="130" y="120">more than it made</text>`}`;
      svg.innerHTML = h;
    },
  });
}

// ───────────────────────── the living patch ─────────────────────────
interface Player { stop(): void; running: boolean }
function playDays(msPerDay: number, frame: (d: number) => void, done: () => void, from = 0): Player {
  let raf = 0; const p: Player = { running: true, stop() { p.running = false; cancelAnimationFrame(raf); } };
  if (reduceMotion()) { setTimeout(() => { frame(364); p.running = false; done(); }, 0); return p; }
  const t0 = performance.now() - from * msPerDay;
  const tick = (now: number) => { if (!p.running) return; const d = Math.max(0, Math.floor((now - t0) / msPerDay)); if (d >= 365) { frame(364); p.running = false; done(); return; } frame(d); raf = requestAnimationFrame(tick); };
  raf = requestAnimationFrame(tick);
  return p;
}
function events(r: Result, crop: boolean): { day: number; text: string }[] {
  const D = r.daily, ev: { day: number; text: string }[] = [{ day: 0, text: 'The first of January.' }];
  const first = (from: number, test: (d: DayOut, i: number) => boolean) => { for (let i = from; i < 365; i++) if (test(D[i], i)) return i; return -1; };
  let dry = 0, rain = -1;
  for (let i = 0; i < 365; i++) { if (D[i].P > 5 && dry > 25) { rain = i; break; } dry = D[i].P > 1 ? 0 : dry + 1; }
  if (rain > 0) ev.push({ day: rain, text: 'The first real rain after the dry season. The top soil fills.' });
  if (crop) {
    const sow = first(0, (d) => d.laiGrass > 0.02), grain = first(0, (d) => d.grain > 3), cut = sow >= 0 ? first(sow + 20, (d) => d.laiGrass < 0.02) : -1;
    if (sow >= 0) ev.push({ day: sow, text: 'Sowing day. The seedlings have almost no leaves, so most light is wasted on bare soil.' });
    if (sow >= 0) { const closed = first(sow, (d) => d.caught > 0.6); if (closed > 0) ev.push({ day: closed, text: 'The leaves have closed over the soil. More leaves caught more light, which made more leaves.' }); }
    if (grain >= 0) ev.push({ day: grain, text: 'The crop has had enough warm days to flower. From now on, new sugar goes into grain.' });
    if (cut >= 0) ev.push({ day: cut, text: 'Harvest. The field is bare until the next sowing.' });
  } else {
    const c = D.map((d) => d.caught), lo = Math.min(...c), hi = Math.max(...c), range = hi - lo, peak = c.indexOf(hi), mid = lo + 0.35 * range;
    ev[0].text = D[0].T < 6 ? 'January. Too cold for leaves to work. The plants wait for spring.' : c[0] < mid ? 'January, the dry season. The soil is nearly empty and most leaves are off.' : 'January. The leaves are still on, living off water left in the soil.';
    const fill = first(1, (d, i) => d.w1 > 0.6 && Math.min(...D.slice(Math.max(0, i - 40), i).map((x) => x.w1)) < 0.25);
    if (fill > 0) ev.push({ day: fill, text: 'The rains have filled the top soil. Roots can deliver water again, so the brake comes off.' });
    if (range > 0.2) {
      const lowDay = c.indexOf(lo), up = first(lowDay < peak ? lowDay : 0, (d) => d.caught > mid);
      if (up > 0 && up < peak) ev.push({ day: up, text: 'Leaves are coming out. More leaves catch more light and make more sugar for more leaves: growth feeds growth.' });
    }
    const deep = first(1, (d, i) => d.w2 > 0.5 && D[Math.max(0, i - 30)].w2 < 0.35);
    if (deep > 0) ev.push({ day: deep, text: 'Water has trickled down into the deep soil. Tree roots reach it. Most grass roots do not.' });
    ev.push({ day: peak, text: 'The leafiest time of the year. Nearly all the light is caught, so adding leaves no longer pays.' });
    const brake = first(peak, (d) => d.brake < 0.5 && d.caught > 0.15);
    if (brake >= 0) ev.push({ day: brake, text: 'The leaves have drunk the soil dry. The water brake comes on: growth slows itself down.' });
    const off = range > 0.2 ? first(peak, (d) => d.caught < mid) : -1;
    if (off >= 0) ev.push({ day: off, text: D[off].T < 8 ? 'Too cold to work. The leaves come off until spring.' : 'The leaves are falling. Holding on to them would cost more sugar than they earn.' });
  }
  return ev.sort((a, b) => a.day - b.day);
}
function yearStrip(svg: SVGSVGElement, r: Result) {
  const D = r.daily, W = 360, X = (d: number) => 4 + (d / 364) * (W - 8);
  const maxLai = Math.max(1, ...D.map((d) => d.laiTree + d.laiGrass));
  let h = '', area = `M${X(0)},74`;
  D.forEach((d, i) => { area += `L${X(i).toFixed(1)},${(74 - ((d.laiTree + d.laiGrass) / maxLai) * 40).toFixed(1)}`; });
  h += `<path class="sLeaf" d="${area}L${X(364)},74Z"/>`;
  for (let i = 0; i < 365; i += 5) { let p = 0; for (let k = i; k < Math.min(365, i + 5); k++) p += D[k].P; if (p > 0.5) h += `<rect class="sRain" x="${X(i).toFixed(1)}" y="2" width="3.4" height="${Math.min(28, p * 0.45).toFixed(1)}"/>`; }
  let dd = '';
  D.forEach((d, i) => { dd += `${i ? 'L' : 'M'}${X(i).toFixed(1)},${(74 - d.w1 * 40).toFixed(1)}`; });
  h += `<path class="sWater" d="${dd}"/><line class="axis" x1="4" y1="74" x2="${W - 4}" y2="74"/>`;
  let acc = 0; MDAYS.forEach((m, i) => { h += `<text class="lab" x="${X(acc + m / 2)}" y="88" text-anchor="middle">${MONTHS[i][0]}</text>`; acc += m; });
  h += `<line class="head" x1="0" y1="0" x2="0" y2="76"/>`;
  svg.innerHTML = h;
  const head = $('.head', svg);
  return (d: number) => { head.setAttribute('x1', String(X(d))); head.setAttribute('x2', String(X(d))); };
}

function patchViewer() {
  const root = $('#p-patch'); if (!root) return;
  const svg = $<SVGSVGElement>('svg.scene', root), strip = $<SVGSVGElement>('svg.strip', root), cap = $('.caption', root), go = $<HTMLButtonElement>('.go', root), sum = $('.sum', root);
  let site = PLACES[2], land: 'natural' | 'crop' = 'natural', res: Result, ev: ReturnType<typeof events>, head: (d: number) => void, player: Player | null = null, day = 0;
  const out = (k: string, v: string) => { const e = $(`[data-r="${k}"]`, root); if (e) e.textContent = v; };
  const smooth = (k: keyof DayOut, d: number) => { let s = 0, n = 0; for (let i = Math.max(0, d - 3); i <= Math.min(364, d + 3); i++) { s += res.daily[i][k] as number; n++; } return s / n; };
  const frame = (d: number) => {
    day = d;
    const x = res.daily[d], m = monthOfDay(d);
    drawScene(svg, { d: x, maxTree: res.mean.tree, maxGrass: land === 'crop' ? 1 : res.mean.grass, crop: land === 'crop', label: `${MONTHS[m]} · ${Math.round(x.T)} °C` });
    head(d);
    const gpp = smooth('gpp', d), resp = smooth('resp', d);
    out('caught', pct(smooth('caught', d))); out('sugar', gpp.toFixed(1) + ' g'); out('brake', smooth('brake', d).toFixed(2)); out('resp', resp.toFixed(1) + ' g'); out('grow', (gpp - resp).toFixed(1) + ' g');
    let t = ev[0].text; for (const e of ev) if (e.day <= d) t = e.text;
    cap.textContent = t;
  };
  const load = () => {
    player?.stop();
    res = run(site, BASE, land); ev = events(res, land === 'crop'); head = yearStrip(strip, res);
    const m = res.mean;
    $('.who', root).textContent = land === 'crop' ? `A field of ${res.types[0]} near ${site.name}.` : `Wild plants near ${site.name}: ${res.types[1]} and ${res.types[0]}s.`;
    sum.textContent = `A typical year here: ${Math.round(m.rain).toLocaleString('en')} mm of rain, of which the plants drink ${pct(m.transp / Math.max(1, m.rain))}. They make ${Math.round(m.gpp).toLocaleString('en')} g of sugar on every square metre, burn ${pct(1 - m.npp / Math.max(1, m.gpp))} of it, and keep the rest as growth.` + (land === 'crop' ? ` The harvest is about ${m.yield.toFixed(1)} tonnes of grain per hectare.` : '');
    go.textContent = 'Play one year';
    frame(land === 'crop' ? Math.min(364, res.sowDay + 40) : 200);
  };
  go.addEventListener('click', () => {
    if (player?.running) { player.stop(); go.textContent = 'Carry on'; return; }
    const from = go.textContent === 'Carry on' ? day : 0;
    go.textContent = 'Pause';
    player = playDays(38, frame, () => { go.textContent = 'Play it again'; }, from);
  });
  const chips = $('.places', root);
  PLACES.forEach((p) => {
    const b = document.createElement('button'); b.type = 'button'; b.innerHTML = `${p.name}<small>${p.blurb}</small>`; if (p === site) b.classList.add('on');
    b.addEventListener('click', () => { site = p; $$('button', chips).forEach((x) => x.classList.toggle('on', x === b)); load(); });
    chips.appendChild(b);
  });
  $$<HTMLButtonElement>('[data-land] button', root).forEach((b) => b.addEventListener('click', () => { land = b.dataset.v as typeof land; $$('[data-land] button', root).forEach((x) => x.classList.toggle('on', x === b)); load(); }));
  load();
  // hero: the same picture, looping quietly
  const hero = $<SVGSVGElement>('#hero-scene');
  if (hero) {
    const hr = run(PLACES[2]); let hp: Player | null = null;
    const still = () => drawScene(hero, { d: hr.daily[230], maxTree: hr.mean.tree, maxGrass: hr.mean.grass, crop: false, label: 'August · 25 °C' });
    still();
    if (!reduceMotion()) new IntersectionObserver((es) => {
      if (es[0].isIntersecting && !hp?.running) { const loop = () => { hp = playDays(30, (d) => drawScene(hero, { d: hr.daily[d], maxTree: hr.mean.tree, maxGrass: hr.mean.grass, crop: false, label: `${MONTHS[monthOfDay(d)]} · ${Math.round(hr.daily[d].T)} °C` }), loop); }; loop(); }
      else if (!es[0].isIntersecting) hp?.stop();
    }, { threshold: 0.2 }).observe(hero);
  }
}

// ───────────────────────── zoom out: a line of cells ─────────────────────────
function lineOfCells() {
  const root = $('#p-line'); if (!root) return;
  const svg = $<SVGSVGElement>('svg.cells', root), say = $('.say', root), go = $<HTMLButtonElement>('.go', root), info = $('.cellinfo', root), stage = $('.stage', root);
  const knobs = $$<HTMLInputElement>('input[type=range]', root);
  let base: Result[] = [], cur: Result[] = [], picked = 4, year = 219, bet = '', busy = false;
  const scen = (): Scen => ({ dT: +knobs.find((k) => k.dataset.k === 'dT')!.value, rain: 1 + +knobs.find((k) => k.dataset.k === 'rain')!.value / 100, co2: +knobs.find((k) => k.dataset.k === 'co2')!.value });
  const N = CELLS.length, cw = 360 / N;
  const draw = () => {
    let h = '';
    const maxRain = 1500;
    CELLS.forEach((c, i) => {
      const r = cur[i]; if (!r) return;
      const y = r.years[Math.min(year, r.years.length - 1)], full = year >= r.years.length - 1;
      const tree = full ? r.mean.tree : y.tree, grass = Math.min(1 - tree, full ? r.mean.grass : y.grass), x = i * cw, top = 44, H = 120;
      h += `<rect class="sRain" x="${x + cw * 0.3}" y="${40 - (r.mean.rain / maxRain) * 34}" width="${cw * 0.4}" height="${(r.mean.rain / maxRain) * 34}"/>`;
      h += `<rect class="cBare" x="${x + 1}" y="${top}" width="${cw - 2}" height="${H}"/>`;
      h += `<rect class="cGrass" x="${x + 1}" y="${top + H * (1 - tree - grass)}" width="${cw - 2}" height="${H * grass}"/>`;
      h += `<rect class="cTree" x="${x + 1}" y="${top + H * (1 - tree)}" width="${cw - 2}" height="${H * tree}"/>`;
      if (i === picked) h += `<rect class="pick" x="${x + 1.5}" y="${top + 0.5}" width="${cw - 3}" height="${H - 1}"/>`;
      if (c.station) h += `<text class="lab" x="${x + cw / 2}" y="${top + H + 14}" text-anchor="${i === 0 ? 'start' : i === N - 1 ? 'end' : 'middle'}">${c.name}</text>`;
    });
    h += `<text class="lab" x="2" y="10">rain in a year</text><text class="lab" x="2" y="${44 + 120 + 30}">north, the Sahara</text><text class="lab" x="358" y="${44 + 120 + 30}" text-anchor="end">south, the sea</text>`;
    svg.innerHTML = h;
  };
  const showInfo = () => {
    const c = CELLS[picked], r = cur[picked], b = base[picked]; if (!r) return;
    const m = r.mean, ch = b && b !== r ? ` Before your change: ${pct(b.mean.tree)} trees, ${pct(Math.min(1 - b.mean.tree, b.mean.grass))} grass.` : '';
    info.innerHTML = `<b>${c.station ? `${c.name}, ${c.country}` : `Near ${c.name}`}</b> ${Math.round(m.rain)} mm of rain a year. Trees shade ${pct(m.tree)} of the ground, grass ${pct(Math.min(1 - m.tree, m.grass))}, and ${pct(Math.max(0, 1 - m.tree - Math.min(1 - m.tree, m.grass)))} is bare.${ch}${c.station ? '' : ' This cell has no weather station. Its climate is blended from the stations to its north and south.'}`;
  };
  const compute = (animate: boolean, done: () => void) => {
    busy = true; const s = scen(); cur = []; let i = 0;
    const step = () => {
      cur[i] = run(CELLS[i], s); i++;
      say.textContent = `Running cell ${i} of ${N}: 220 years, one day at a time…`;
      if (i < N) { setTimeout(step, 0); return; }
      if (!animate || reduceMotion()) { year = 219; draw(); busy = false; done(); return; }
      const t0 = performance.now();
      const tick = (now: number) => { year = Math.max(0, Math.min(219, Math.floor(((now - t0) / 5000) * 220))); draw(); say.textContent = `Year ${year + 1} of 220`; if (year < 219) requestAnimationFrame(tick); else { busy = false; done(); } };
      requestAnimationFrame(tick);
    };
    setTimeout(step, 30);
  };
  const half = (rs: Result[]) => rs.findIndex((r) => r.mean.tree > 0.5);
  const where = (i: number) => (i < 0 ? 'nowhere on this line' : CELLS[i].station ? `at ${CELLS[i].name}` : `near ${CELLS[i].name}`);
  $$<HTMLButtonElement>('.choice', root).forEach((b) => b.addEventListener('click', () => {
    if (busy) return;
    bet = b.dataset.bet!; $$('.choice', root).forEach((x) => { x.classList.toggle('on', x === b); (x as HTMLButtonElement).disabled = true; });
    stage.hidden = false;
    compute(true, () => {
      base = cur.slice(); const i = half(base);
      const right = i >= 0 && i <= 4 ? 'north' : i > 4 && i < 8 ? 'between' : 'south';
      say.textContent = `Every cell started bare and followed the same five rules for 220 years. Trees shade more than half the ground first ${where(i)}. ${bet === right ? 'You called it.' : 'Not where you guessed.'} Nobody drew a border on this map. It appeared on its own. Tap any cell to look inside.`;
      $('.after', root).hidden = false; showInfo();
    });
  }));
  svg.addEventListener('click', (e) => { const r = svg.getBoundingClientRect(); picked = clamp(Math.floor(((e.clientX - r.left) / r.width) * N), 0, N - 1); draw(); showInfo(); });
  knobs.forEach((k) => k.addEventListener('input', () => { const o = $(`[data-o="${k.dataset.k}"]`, root); const v = +k.value; o.textContent = k.dataset.k === 'dT' ? (v === 0 ? 'as today' : `+${v.toFixed(1)} °C`) : k.dataset.k === 'rain' ? (v === 0 ? 'as today' : signed(v)) : v === C.co2ref ? 'as today, 420 ppm' : v + ' ppm'; go.hidden = false; }));
  knobs.forEach((k) => k.dispatchEvent(new Event('input'))); go.hidden = true;
  go.addEventListener('click', () => {
    if (busy) return;
    compute(false, () => {
      const a = half(base), b = half(cur), moved = a < 0 || b < 0 ? 0 : Math.round((CELLS[a].lat - CELLS[b].lat) * 111);
      say.textContent = b === a ? `The place where trees take over has not moved: still ${where(b)}. Tap cells to see what changed inside them.` : `The place where trees take over has moved from ${where(a)} to ${where(b)}${moved ? `, about ${Math.abs(moved)} km ${moved > 0 ? 'south' : 'north'}` : ''}.`;
      showInfo();
    });
  });
}

// ───────────────────────── ask a question ─────────────────────────
interface Q { id: string; places: string[]; land: 'natural' | 'crop'; preset: Partial<Scen>; ready(s: Scen): boolean; need: string; judge(b: Result[], x: Result[]): { pick: string; text: string }; hint: string; real: string }
const byId = (id: string) => PLACES.find((p) => p.id === id)!;
const rel = (a: number, b: number) => (a > 0 ? (b / a - 1) * 100 : 0);
const QS: Q[] = [
  { id: 'co2', places: ['niamey'], land: 'natural', preset: { co2: 600 }, need: 'Raise CO₂ and leave temperature and rain alone.',
    ready: (s) => s.co2 >= 500 && s.dT === 0 && s.rain === 1,
    judge: (b, x) => { const t = x[0].mean.tree - b[0].mean.tree, g = x[0].mean.grass - b[0].mean.grass; return { pick: t > 0.03 && t > g ? 'a' : g > 0.03 ? 'b' : 'c', text: `Trees went from ${pct(b[0].mean.tree)} to ${pct(x[0].mean.tree)} of the ground, and grass from ${pct(b[0].mean.grass)} to ${pct(x[0].mean.grass)}.` }; },
    hint: 'Change only CO₂. Then look at trees and grass separately, not only at total growth. Why would they differ? Go back to rule 4: trees gain sugar from extra CO₂, and this grass does not.',
    real: 'Many African savannas have grown denser with trees and shrubs over the last century. Rising CO₂ is one of the suspected causes, alongside less burning and heavy grazing (Bond and Midgley 2012).' },
  { id: 'warm', places: ['niamey', 'aarhus'], land: 'natural', preset: { dT: 3 }, need: 'Warm both places by the same amount and leave rain and CO₂ alone.',
    ready: (s) => s.dT >= 2 && s.co2 === C.co2ref && s.rain === 1,
    judge: (b, x) => { const hot = rel(b[0].mean.npp, x[0].mean.npp), cold = rel(b[1].mean.npp, x[1].mean.npp); return { pick: hot < -4 && cold > -4 ? 'b' : hot < -4 && cold < -4 ? 'a' : 'c', text: `Plant growth changed by ${signed(hot)} in Niamey and by ${signed(cold)} in Aarhus.` }; },
    hint: 'Run the same warming in a hot place and a cold place and compare. Then ask which rule is responsible. In Niamey, heat raises breathing costs and the air\'s thirst. In Aarhus, the same heat also lengthens the season in which leaves can work.',
    real: 'Satellites show that cold regions have become greener as they warmed (Keenan and Riley 2018), while many warm, dry regions are expected to lose growth.' },
  { id: 'dry', places: ['niamey'], land: 'natural', preset: { rain: 0.8 }, need: 'Cut rain and leave temperature and CO₂ alone.',
    ready: (s) => s.rain <= 0.9 && s.dT === 0 && s.co2 === C.co2ref,
    judge: (b, x) => { const t = rel(b[0].mean.tree, x[0].mean.tree), g = rel(b[0].mean.grass, x[0].mean.grass); return { pick: t < g - 5 ? 'a' : g < t - 5 ? 'b' : 'c', text: `Tree cover changed by ${signed(t)} and grass cover by ${signed(g)}.` }; },
    hint: 'Change only rain and compare trees with grass. Then think about rule 5. A tree carries a trunk and big roots that burn sugar every day, rain or no rain. Grass has almost nothing to keep alive in a bad year.',
    real: 'Across 854 sites in African savannas, the most tree cover a place can hold rises with rainfall up to about 650 mm a year (Sankaran and others 2005).' },
  { id: 'crop', places: ['parakou'], land: 'crop', preset: { dT: 2 }, need: 'Warm the field and leave rain, CO₂, variety and sowing day alone.',
    ready: (s) => s.dT >= 1 && s.rain === 1 && s.co2 === C.co2ref && (s.variety ?? 1) === 1 && (s.sow ?? 0) === 0,
    judge: (b, x) => { const days = x[0].mean.season - b[0].mean.season, br = x[0].mean.brake - b[0].mean.brake; return { pick: days < -3 && br > -0.08 ? 'b' : br <= -0.08 ? 'a' : 'c', text: `The harvest changed by ${signed(rel(b[0].mean.yield, x[0].mean.yield))}. The crop took ${Math.round(x[0].mean.season)} days from sowing to harvest instead of ${Math.round(b[0].mean.season)}, and its water brake barely moved (${b[0].mean.brake.toFixed(2)} to ${x[0].mean.brake.toFixed(2)}).` }; },
    hint: 'Do not look only at the harvest. Look at the number of days from sowing to harvest. A crop counts warm days to decide when to flower and ripen. In warmer air it races through its life and has fewer days to catch light. Now test a fix: keep the warming and choose a slower variety.',
    real: 'Field trials and models together suggest that each degree of warming, with nothing else changed, cuts the world\'s maize by about 7% and wheat by about 6% (Zhao and others 2017). Switching variety or sowing date wins part of it back (Challinor and others 2014).' },
];
function lab() {
  const root = $('#p-lab'); if (!root) return;
  const bench = $('.bench', root), results = $('.results', root), verdict = $('.verdict', root), hint = $('.hint', root), warn = $('.warn', root);
  const knob = (k: string) => $<HTMLInputElement>(`input[data-k="${k}"]`, bench);
  const selA = $<HTMLSelectElement>('select[data-k="a"]', bench), selB = $<HTMLSelectElement>('select[data-k="b"]', bench), selLand = $<HTMLSelectElement>('select[data-k="land"]', bench);
  PLACES.forEach((p) => { selA.add(new Option(`${p.name}, ${p.country}`, p.id)); selB.add(new Option(`${p.name}, ${p.country}`, p.id)); });
  selB.add(new Option('No second place', ''), 0);
  let q: Q | null = null, guess = '';
  const scen = (): Scen => ({ dT: +knob('dT').value, rain: 1 + +knob('rain').value / 100, co2: +knob('co2').value, variety: 1 + +knob('variety').value / 100, sow: +knob('sow').value });
  const labels = () => {
    const s = scen(), o = (k: string, t: string) => ($(`[data-o="${k}"]`, bench).textContent = t);
    o('dT', s.dT === 0 ? 'as today' : `+${s.dT.toFixed(1)} °C`); o('rain', s.rain === 1 ? 'as today' : signed((s.rain - 1) * 100)); o('co2', s.co2 === C.co2ref ? 'as today, 420 ppm' : s.co2 + ' ppm');
    o('variety', s.variety === 1 ? 'the usual one' : `${signed((s.variety! - 1) * 100)} warm days to ripen`); o('sow', s.sow === 0 ? 'the usual day' : `${Math.abs(s.sow!)} days ${s.sow! < 0 ? 'earlier' : 'later'}`);
    $$('.croponly', bench).forEach((e) => (e.hidden = selLand.value !== 'crop'));
    const changed = [s.dT !== 0, s.rain !== 1, s.co2 !== C.co2ref, selLand.value === 'crop' && s.variety !== 1, selLand.value === 'crop' && s.sow !== 0].filter(Boolean).length;
    warn.textContent = changed > 1 ? `You have changed ${changed} things at once. If the result moves, you will not know which change did it. That is fine for exploring, but a clean test changes one thing.` : changed === 0 ? 'Nothing is changed yet, so the experiment would be the same as today.' : '';
  };
  const setScen = (s: Partial<Scen>) => { knob('dT').value = String(s.dT ?? 0); knob('rain').value = String(Math.round(((s.rain ?? 1) - 1) * 100)); knob('co2').value = String(s.co2 ?? C.co2ref); knob('variety').value = String(Math.round(((s.variety ?? 1) - 1) * 100)); knob('sow').value = String(s.sow ?? 0); labels(); };
  $$<HTMLInputElement>('input[type=range]', bench).forEach((k) => k.addEventListener('input', labels));
  [selA, selB, selLand].forEach((s) => s.addEventListener('change', labels));
  const pickQ = (id: string) => {
    q = QS.find((x) => x.id === id) ?? null; guess = '';
    $$('.qcard', root).forEach((c) => c.classList.toggle('on', (c as HTMLElement).dataset.q === id));
    $$('.qbody', root).forEach((c) => ((c as HTMLElement).hidden = (c as HTMLElement).dataset.q !== id));
    $$('.qbody .choice', root).forEach((b) => { b.classList.remove('on'); });
    bench.hidden = id !== 'own'; results.innerHTML = ''; verdict.textContent = ''; hint.hidden = true;
    setScen({});
    if (q) { selA.value = q.places[0]; selB.value = q.places[1] ?? ''; selLand.value = q.land; $('.need', bench).textContent = q.need; $('.hintbtn', root).hidden = false; $('.setup', bench).hidden = false; }
    else { $('.need', bench).textContent = 'Pick one or two places, change something, and run it.'; $('.hintbtn', root).hidden = true; $('.setup', bench).hidden = true; }
    labels();
  };
  $$<HTMLButtonElement>('.qcard', root).forEach((c) => c.addEventListener('click', () => { pickQ(c.dataset.q!); ($(`.qbody[data-q="${c.dataset.q}"]`, root) ?? bench).scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }));
  $$<HTMLButtonElement>('.qbody .choice', root).forEach((b) => b.addEventListener('click', () => {
    guess = b.dataset.g!; $$('.choice', b.parentElement!).forEach((x) => x.classList.toggle('on', x === b)); bench.hidden = false;
  }));
  $('.setup', bench).addEventListener('click', () => { if (q) setScen(q.preset); });
  $('.reset', bench).addEventListener('click', () => setScen({}));
  $('.hintbtn', root).addEventListener('click', () => { if (!q) return; hint.hidden = !hint.hidden; hint.innerHTML = `<p><b>How a modeller would test it.</b> ${q.hint}</p><p><b>What real studies found.</b> ${q.real}</p>`; });
  $('.run', bench).addEventListener('click', () => {
    const s = scen(), land = selLand.value as 'natural' | 'crop', sites = [selA.value, selB.value].filter(Boolean).map(byId);
    const b = sites.map((p) => run(p, BASE, land)), x = sites.map((p) => run(p, s, land));
    const row = (name: string, a: number, c: number, unit: string, dp = 0, asPct = false) => `<tr><th scope="row">${name}</th><td>${asPct ? pct(a) : a.toFixed(dp)}</td><td>${asPct ? pct(c) : c.toFixed(dp)}${unit}</td><td class="chg">${Math.abs(rel(a, c)) < 0.5 ? 'no change' : signed(rel(a, c))}</td></tr>`;
    results.innerHTML = sites.map((p, i) => {
      const m0 = b[i].mean, m1 = x[i].mean, head = land === 'crop' ? rel(m0.yield, m1.yield) : rel(m0.npp, m1.npp);
      const rows = land === 'crop'
        ? row('Grain harvested', m0.yield, m1.yield, ' t/ha', 1) + row('Days from sowing to harvest', m0.season, m1.season, '') + row('Water brake in the season', m0.brake, m1.brake, '', 2) + row('Water drunk by the crop', m0.transp, m1.transp, ' mm')
        : row('Plant growth', m0.npp, m1.npp, ' g') + row('Ground shaded by trees', m0.tree, m1.tree, '', 0, true) + row('Ground shaded by grass', Math.min(1 - m0.tree, m0.grass), Math.min(1 - m1.tree, m1.grass), '', 0, true) + row('Carbon held in plants', m0.vegC / 1000, m1.vegC / 1000, ' kg', 1) + row('Carbon held in soil', m0.soilC / 1000, m1.soilC / 1000, ' kg', 1) + row('Water drunk by plants', m0.transp, m1.transp, ' mm');
      return `<div class="res"><p class="place">${p.name}, ${p.country}</p><p class="big">${Math.abs(head) < 0.5 ? 'no change' : signed(head)}</p><p class="bigl">${land === 'crop' ? 'grain harvested' : 'plant growth'}, compared with today</p><table><thead><tr><th></th><th>today</th><th>experiment</th><th>change</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }).join('');
    if (q) {
      if (!q.ready(s)) verdict.textContent = `This run does not test the question cleanly yet. ${q.need} Or press "Set it up for me".`;
      else { const j = q.judge(b, x); verdict.textContent = `${j.text} ${guess ? (j.pick === guess ? 'That matches your guess.' : 'That is not what you guessed.') : ''} Open the hint to see why, and what real studies found.`; }
    } else verdict.textContent = 'Both runs used the same weather, day for day. Any difference comes from what you changed.';
    results.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
  pickQ('co2'); bench.hidden = true;
}

// ───────────────────────── tuning and testing ─────────────────────────
function tuning() {
  const root = $('#p-tune'); if (!root) return;
  const svg = $<SVGSVGElement>('svg.fit', root), slider = $<HTMLInputElement>('input', root), say = $('.say', root), test = $<HTMLButtonElement>('.test', root), out = $('[data-o="a"]', root);
  const monthly = (site: Site) => { const D = runPatch(site, BASE, { years: 120, average: 20 }).daily, m: number[] = []; let d = 0; for (const n of MDAYS) { let s = 0; for (let i = 0; i < n; i++) s += D[d + i].gpp; m.push(s / n); d += n; } return m; };
  const truth = C.alphaA, noise = [1.06, 0.95, 1.04, 0.93, 1.08, 0.97, 1.03, 0.94, 1.05, 0.98, 0.92, 1.07];
  const obs = new Map<string, number[]>();
  const measured = (site: Site) => { if (!obs.has(site.id)) obs.set(site.id, monthly(site).map((v, i) => v * noise[i])); return obs.get(site.id)!; };
  let site = PLACES[2], tested = false;
  const draw = () => {
    const a = +slider.value / 100; out.textContent = a.toFixed(2);
    const o = measured(site); C.alphaA = a; const m = monthly(site); C.alphaA = truth;
    const top = Math.max(12, ...o, ...m) * 1.1, X = (i: number) => 30 + (i / 11) * 316, Y = (v: number) => 128 - (v / top) * 116;
    let h = `<line class="axis" x1="30" y1="128" x2="350" y2="128"/>`, d = '';
    MONTHS.forEach((mo, i) => { h += `<text class="lab" x="${X(i)}" y="144" text-anchor="middle">${mo[0]}</text>`; d += `${i ? 'L' : 'M'}${X(i)},${Y(m[i]).toFixed(1)}`; });
    h += `<path class="curve c3 on" d="${d}"/>`;
    o.forEach((v, i) => { h += `<circle class="obs" cx="${X(i)}" cy="${Y(v).toFixed(1)}" r="4.5"/>`; });
    h += `<text class="lab" x="32" y="12">sugar made per day, month by month, near ${site.name}</text>`;
    svg.innerHTML = h;
    const gap = (o.reduce((s, v, i) => s + Math.abs(v - m[i]), 0) / o.reduce((s, v) => s + v, 0)) * 100;
    const good = gap < 9;
    say.textContent = tested ? (good ? `In ${site.name}, a place the model never saw while you tuned it, the gap is ${gap.toFixed(0)}%. That is evaluation: the tuned model also works somewhere new, so its rules earn some trust.` : `In ${site.name} the gap is ${gap.toFixed(0)}%. The tuning does not carry over, so something is wrong. Go back and tune again.`)
      : good ? `Gap between model and measurements: ${gap.toFixed(0)}%. That is about as close as noisy measurements allow. Now test it somewhere else.` : `Gap between model and measurements: ${gap.toFixed(0)}%. Move the dial until the line runs through the dots.`;
    test.hidden = !good && !tested;
  };
  let t = 0;
  slider.addEventListener('input', () => { out.textContent = (+slider.value / 100).toFixed(2); clearTimeout(t); t = window.setTimeout(draw, 120); });
  test.addEventListener('click', () => { tested = !tested; site = tested ? AARHUS : PLACES[2]; test.textContent = tested ? 'Back to the tuning place' : 'Test it somewhere else'; draw(); });
  new IntersectionObserver((es, ob) => { if (es[0].isIntersecting) { draw(); ob.disconnect(); } }, { rootMargin: '300px' }).observe(root);
}

export function init() {
  rules(); patchViewer(); lineOfCells(); lab(); tuning();
}
