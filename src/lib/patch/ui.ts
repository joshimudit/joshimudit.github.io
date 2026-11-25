// Everything interactive on the Patch page. The widgets call the model's own functions,
// so the numbers in each "rule" are the numbers the model uses.
import { C, PFT, BASE, runPatch, lightCaught, lightUse, tempLimit, thirst, poreFactor, breathing, gammaStar, type Scen, type Result, type DayOut } from './model';
import { SITES, type Site } from './sites';

export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll(sel)] as T[];
export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const pct = (x: number) => Math.round(x * 100) + '%';
export const signed = (x: number, unit = '%') => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(Math.round(x)) + unit;
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MDAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const monthOfDay = (d: number) => { let m = 0, e = MDAYS[0]; while (d >= e && m < 11) { m++; e += MDAYS[m]; } return m; };
export const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const PLACES: Site[] = SITES;
export const place = (id: string) => SITES.find((s) => s.id === id)!;
const cache = new Map<string, Result>();
export function run(site: Site, scen: Scen = BASE, land: 'natural' | 'crop' = 'natural'): Result {
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
      { label: 'Tropical afternoon', set: { T: 33, sun: 10 }, ctx: 'A sunny day in the tropics. Now the two kinds of plant behave very differently.' },
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
export interface Player { stop(): void; running: boolean }
export function playDays(msPerDay: number, frame: (d: number) => void, done: () => void, from = 0): Player {
  let raf = 0; const p: Player = { running: true, stop() { p.running = false; cancelAnimationFrame(raf); } };
  if (reduceMotion()) { setTimeout(() => { frame(364); p.running = false; done(); }, 0); return p; }
  const t0 = performance.now() - from * msPerDay;
  const tick = (now: number) => { if (!p.running) return; const d = Math.max(0, Math.floor((now - t0) / msPerDay)); if (d >= 365) { frame(364); p.running = false; done(); return; } frame(d); raf = requestAnimationFrame(tick); };
  raf = requestAnimationFrame(tick);
  return p;
}
export function events(r: Result, crop: boolean): { day: number; text: string }[] {
  const D = r.daily, ev: { day: number; text: string }[] = [{ day: 0, text: 'The first of January.' }];
  const first = (from: number, test: (d: DayOut, i: number) => boolean) => { for (let i = from; i < 365; i++) if (test(D[i], i)) return i; return -1; };
  let dry = 0, rain = -1;
  for (let i = 0; i < 365; i++) { if (D[i].P > 5 && dry > 25) { rain = i; break; } dry = D[i].P > 1 ? 0 : dry + 1; }
  if (rain > 0) ev.push({ day: rain, text: 'The first real rain after the dry season. The top soil fills up.' });
  if (crop) {
    const sow = first(0, (d) => d.laiGrass > 0.02), grain = first(0, (d) => d.grain > 3), cut = sow >= 0 ? first(sow + 20, (d) => d.laiGrass < 0.02) : -1;
    if (sow >= 0) ev.push({ day: sow, text: 'Sowing day. The seedlings have almost no leaves, so most of the light lands on bare soil.' });
    if (sow >= 0) { const closed = first(sow, (d) => d.caught > 0.6); if (closed > 0) ev.push({ day: closed, text: 'The leaves now cover the soil. More leaves caught more light, which paid for more leaves.' }); }
    if (grain >= 0) ev.push({ day: grain, text: 'The crop has counted enough warm days to flower. From now on its sugar goes into grain.' });
    if (cut >= 0) ev.push({ day: cut, text: 'Harvest. The field is bare until the next sowing.' });
  } else {
    const c = D.map((d) => d.caught), lo = Math.min(...c), hi = Math.max(...c), range = hi - lo, peak = c.indexOf(hi), mid = lo + 0.35 * range;
    ev[0].text = D[0].T < 6 ? 'January. Too cold for leaves to work. The plants wait for spring.' : c[0] < mid ? 'January, the dry season. The soil is nearly empty and most leaves are off.' : 'January. The leaves are still on, living off water left in the soil.';
    const fill = first(1, (d, i) => d.w1 > 0.6 && Math.min(...D.slice(Math.max(0, i - 40), i).map((x) => x.w1)) < 0.25);
    if (fill > 0) ev.push({ day: fill, text: 'Rain has filled the top soil. The roots can drink again, so the plants start to grow.' });
    if (range > 0.2) {
      const lowDay = c.indexOf(lo), up = first(lowDay < peak ? lowDay : 0, (d) => d.caught > mid);
      if (up > 0 && up < peak) ev.push({ day: up, text: 'Leaves are coming out. More leaves catch more light, which pays for more leaves.' });
    }
    const deep = first(1, (d, i) => d.w2 > 0.5 && D[Math.max(0, i - 30)].w2 < 0.35);
    if (deep > 0) ev.push({ day: deep, text: 'Water has trickled down into the deep soil. Tree roots reach it. Most grass roots do not.' });
    ev.push({ day: peak, text: 'The leafiest time of the year. Hardly any light reaches the ground now.' });
    const brake = first(peak, (d) => d.brake < 0.5 && d.caught > 0.15);
    if (brake >= 0) ev.push({ day: brake, text: 'The leaves have drunk the soil dry. Thirsty plants close up and grow more slowly.' });
    const off = range > 0.2 ? first(peak, (d) => d.caught < mid) : -1;
    if (off >= 0) ev.push({ day: off, text: D[off].T < 8 ? 'Too cold to work. The leaves come off until spring.' : 'The leaves are falling. Keeping them would cost more sugar than they earn.' });
  }
  return ev.sort((a, b) => a.day - b.day);
}
export function yearStrip(svg: SVGSVGElement, r: Result) {
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

// ───────────────────────── tuning and testing ─────────────────────────
function tuning() {
  const root = $('#p-tune'); if (!root) return;
  const svg = $<SVGSVGElement>('svg.fit', root), slider = $<HTMLInputElement>('input', root), say = $('.say', root), test = $<HTMLButtonElement>('.test', root), out = $('[data-o="a"]', root);
  const monthly = (site: Site) => { const D = runPatch(site, BASE, { years: 120, average: 20 }).daily, m: number[] = []; let d = 0; for (const n of MDAYS) { let s = 0; for (let i = 0; i < n; i++) s += D[d + i].gpp; m.push(s / n); d += n; } return m; };
  const truth = C.alphaA, noise = [1.06, 0.95, 1.04, 0.93, 1.08, 0.97, 1.03, 0.94, 1.05, 0.98, 0.92, 1.07];
  const obs = new Map<string, number[]>();
  const measured = (site: Site) => { if (!obs.has(site.id)) obs.set(site.id, monthly(site).map((v, i) => v * noise[i])); return obs.get(site.id)!; };
  let site = place('seville'), tested = false;
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
  test.addEventListener('click', () => { tested = !tested; site = place(tested ? 'aarhus' : 'seville'); test.textContent = tested ? 'Back to the tuning place' : 'Test it somewhere else'; draw(); });
  new IntersectionObserver((es, ob) => { if (es[0].isIntersecting) { draw(); ob.disconnect(); } }, { rootMargin: '300px' }).observe(root);
}

export function init() {
  rules(); tuning();
}
