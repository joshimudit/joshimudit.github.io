// The landscape drawing: one block of land with natural vegetation, cropland, or both, and two soil layers underneath.
// It is drawn from the model's numbers, so it changes with place, climate, year and season.
// The idea of showing a model as a cut-out block of land with both land uses follows the LPJmL overview figure
// of the Potsdam Institute for Climate Impact Research; this drawing is our own.
import type { CropId } from './model';

export type LandUse = 'natural' | 'crop' | 'both';
export interface Scene {
  style: string;          // site id: decides how the trees look and when they are in leaf
  land: LandUse;
  tree: number;           // share of the natural ground under trees, 0 to 1
  tree0: number;          // the same at the start: trees lost since then are drawn as bare trunks
  grass: number;          // share under grass
  size: number;           // how big the trees are, about 0.7 to 1.3
  w1: number; w2: number; // how full the two soil layers are
  rainMm: number;         // rain in a year
  warm: number;           // warming in °C
  crop: CropId; cropH: number; // crop height and health at harvest time, 0 to 1
  irrigate?: boolean;
  phase?: number;         // time of year, 0 to 1 from the start of the rains; leave out for a still picture
  labels?: boolean;
}

const T = [320, 140], U = [260, 130], V = [-260, 130];                 // top corner and the two edge directions
const P = (u: number, v: number) => [T[0] + u * U[0] + v * V[0], T[1] + u * U[1] + v * V[1]];
const pts = (a: number[][]) => a.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => { const x = hex(a), y = hex(b); return '#' + x.map((c, i) => Math.round(c + (y[i] - c) * clamp(t)).toString(16).padStart(2, '0')).join(''); };
function rnd(seed: number) { let a = seed; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; }

interface TreeLook { trunk: number; rx: number; ry: number; dark: string; light: string; grass: string; leafOn: [number, number] }
const LOOK: Record<string, TreeLook> = {
  niamey:    { trunk: 22, rx: 21, ry: 10, dark: '#4f8136', light: '#7ba650', grass: '#b9bb55', leafOn: [0.08, 0.72] },
  hyderabad: { trunk: 24, rx: 18, ry: 13, dark: '#3f7f3a', light: '#62a355', grass: '#a9b84f', leafOn: [0.06, 0.8] },
  aarhus:    { trunk: 20, rx: 16, ry: 18, dark: '#35803f', light: '#57a65e', grass: '#6fae4b', leafOn: [0.1, 0.78] },
  manaus:    { trunk: 34, rx: 18, ry: 20, dark: '#1f6b3c', light: '#2f8a52', grass: '#4e9d4a', leafOn: [0, 1] },
};

// fixed places for trees and grass tufts, so that nothing jumps about between frames (w runs across the natural part)
interface Spot { u: number; w: number; t: number }
function spots(rows: number, seed: number): Spot[] {
  const r = rnd(seed), a: Spot[] = [];
  for (let i = 0; i < rows; i++) for (let j = 0; j < 5; j++) a.push({ u: 0.1 + j * 0.2 + (r() - 0.5) * 0.1, w: (i + 0.55 + (r() - 0.5) * 0.5) / rows, t: 0 });
  [...a].sort(() => r() - 0.5).forEach((s, k) => (s.t = (k + 0.5) / a.length));
  return a.sort((x, y) => x.u + x.w - (y.u + y.w));
}
const TREES = { half: spots(4, 7), full: spots(8, 9) };
const r2 = rnd(21), TUFTS = Array.from({ length: 130 }, () => ({ u: 0.03 + r2() * 0.94, w: 0.04 + r2() * 0.92, t: r2() })).sort((a, b) => a.u + a.w - (b.u + b.w));

export function blockSvg(s: Scene): string {
  const L = LOOK[s.style] ?? LOOK.niamey, D1 = 40, D2 = 110, live = s.phase !== undefined, ph = s.phase ?? 0.7;
  const nat: [number, number] | null = s.land === 'crop' ? null : [0, s.land === 'both' ? 0.5 : 1], crp: [number, number] | null = s.land === 'natural' ? null : [s.land === 'both' ? 0.5 : 0, 1];
  const [t, r, b, l] = [P(0, 0), P(1, 0), P(1, 1), P(0, 1)];
  const down = (p: number[], d: number) => [p[0], p[1] + d];
  const raining = live && ph > 0.1 && ph < 0.5, leaf = !live || (ph >= L.leafOn[0] && ph <= L.leafOn[1]) ? 1 : 0.25;
  let h = '';
  // sky: sun, clouds, rain
  const sunR = 30 + clamp(s.warm / 4) * 6;
  h += `<circle cx="556" cy="70" r="${sunR + 12}" fill="#e8590c" opacity="${(clamp(s.warm / 4) * 0.35).toFixed(2)}"/><circle cx="556" cy="70" r="${sunR}" fill="${mix('#f2a900', '#ee7a12', s.warm / 4)}"/>`;
  const wet = s.rainMm < 260 ? 0 : s.rainMm < 650 ? 1 : s.rainMm < 1300 ? 2 : 3, clouds = live ? (raining ? wet : Math.max(0, wet - 2)) : wet;
  for (let c = 0; c < clouds; c++) {
    const x = 120 + c * 118, y = 78 - (c % 2) * 26, fall = live ? ((ph * 38 + c * 0.37) % 1) * 16 : 0;
    h += `<g fill="#c7d3db"><ellipse cx="${x}" cy="${y}" rx="46" ry="19"/><ellipse cx="${x + 34}" cy="${y - 12}" rx="34" ry="22"/><ellipse cx="${x - 30}" cy="${y - 6}" rx="26" ry="14"/></g>`;
    if (!live || raining) h += `<g stroke="#1b6ca8" stroke-width="3.5" stroke-linecap="round">${[-22, 4, 30].map((dx, i) => { const f = (fall + i * 6) % 30; return `<line x1="${x + dx - f * 0.4}" y1="${y + 26 + f}" x2="${x + dx - 6 - f * 0.4}" y2="${y + 41 + f}"/>`; }).join('')}</g>`;
  }
  // soil faces, two layers, with the water in each
  const w1 = clamp(s.w1 * (!live ? 1 : raining ? 1.5 : 0.65));
  const face = (a: number[], c: number[], top: string, deep: string, water: string) => {
    let o = `<polygon points="${pts([a, c, down(c, D2), down(a, D2)])}" fill="${deep}"/><polygon points="${pts([a, c, down(c, D1), down(a, D1)])}" fill="${top}"/>`;
    const y1 = D1 - D1 * w1, y2 = D2 - (D2 - D1) * clamp(s.w2);
    o += `<polygon points="${pts([down(a, y1), down(c, y1), down(c, D1), down(a, D1)])}" fill="${water}" opacity="0.82"/><polygon points="${pts([down(a, y2), down(c, y2), down(c, D2), down(a, D2)])}" fill="${water}" opacity="0.82"/>`;
    return o + `<polyline points="${pts([down(a, D1), down(c, D1)])}" fill="none" stroke="#00000055" stroke-width="1"/>`;
  };
  h += face(l, b, '#6e5035', '#94704c', '#3f8fd0') + face(r, b, '#5a402a', '#7b5a3c', '#2f75b3');
  // natural vegetation
  if (nat) {
    const cover = clamp(s.tree + s.grass), ground = mix(mix('#dcc9a2', L.grass, 0.25 + 0.75 * cover), '#d8c890', (1 - leaf) * 0.55);
    h += `<polygon points="${pts([P(0, nat[0]), P(1, nat[0]), P(1, nat[1]), P(0, nat[1])])}" fill="${ground}"/>`;
    const v = (w: number) => nat[0] + w * (nat[1] - nat[0]), tuft = mix(mix(L.grass, '#3d6b2a', 0.35), '#b9a25a', (1 - leaf) * 0.7);
    h += `<g stroke="${tuft}" stroke-width="2" stroke-linecap="round">`;
    const nT = nat[1] - nat[0] > 0.6 ? TUFTS.length : TUFTS.length / 2;
    for (let i = 0; i < nT; i++) { const g = TUFTS[i]; if (g.t < s.grass * 1.15) { const [x, y] = P(g.u, v(g.w)); h += `<path d="M${x.toFixed(1)},${y.toFixed(1)}l-3,-7M${x.toFixed(1)},${y.toFixed(1)}l0,-9M${x.toFixed(1)},${y.toFixed(1)}l3,-7"/>`; } }
    h += '</g>';
    // trees: each has a threshold, so they come and go one by one as tree cover changes
    const set = nat[1] - nat[0] > 0.6 ? TREES.full : TREES.half, step = 1 / set.length, sz = clamp(s.size, 0.6, 1.4);
    for (const tr of set) {
      const k = clamp((s.tree * 1.05 - tr.t) / step + 0.5) * sz, k0 = clamp((s.tree0 * 1.05 - tr.t) / step + 0.5) * sz;
      const [x, y] = P(tr.u, v(tr.w));
      if (k < 0.12) { // a tree that stood here at the start and is gone: a bare trunk
        if (k0 > 0.3) { const th = L.trunk * k0 * 0.8; h += `<path d="M${x.toFixed(1)},${y.toFixed(1)}l0,${(-th).toFixed(1)}m0,${(th * 0.35).toFixed(1)}l${(th * 0.3).toFixed(1)},${(-th * 0.3).toFixed(1)}m${(-th * 0.3).toFixed(1)},${(th * 0.5).toFixed(1)}l${(-th * 0.28).toFixed(1)},${(-th * 0.25).toFixed(1)}" stroke="#8a8378" stroke-width="2.6" stroke-linecap="round" fill="none"/>`; }
        continue;
      }
      const th = L.trunk * k, rx = L.rx * k, ry = L.ry * k;
      h += `<ellipse cx="${x.toFixed(1)}" cy="${(y + 1).toFixed(1)}" rx="${(rx * 0.8).toFixed(1)}" ry="${(rx * 0.3).toFixed(1)}" fill="#00000022"/>`;
      h += `<rect x="${(x - 2.2 * k).toFixed(1)}" y="${(y - th).toFixed(1)}" width="${(4.4 * k).toFixed(1)}" height="${th.toFixed(1)}" fill="#5a402a"/>`;
      h += `<g opacity="${leaf < 1 ? 0.38 : 1}"><ellipse cx="${x.toFixed(1)}" cy="${(y - th - ry * 0.6).toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${L.dark}"/><ellipse cx="${(x - rx * 0.3).toFixed(1)}" cy="${(y - th - ry * 0.9).toFixed(1)}" rx="${(rx * 0.5).toFixed(1)}" ry="${(ry * 0.5).toFixed(1)}" fill="${L.light}"/></g>`;
    }
  }
  // cropland: rows that grow through the season and are cut at harvest
  if (crp) {
    h += `<polygon points="${pts([P(0, crp[0]), P(1, crp[0]), P(1, crp[1]), P(0, crp[1])])}" fill="${s.irrigate ? '#c9ae7e' : '#dcc292'}"/>`;
    const grow = !live ? 1 : ph < 0.12 ? 0.06 : ph < 0.68 ? 0.06 + (0.94 * (ph - 0.12)) / 0.56 : ph < 0.86 ? 1 : 0.14, ripe = !live ? 0.6 : clamp((ph - 0.55) / 0.25);
    const ch = clamp(s.cropH), green = s.crop === 'wheat' ? '#7fae45' : '#4f9a3a', gold = s.crop === 'wheat' ? '#c99a1e' : s.crop === 'maize' ? '#9a9a3a' : '#8f8a3e';
    const head = s.crop === 'wheat' ? '#e2b93b' : s.crop === 'maize' ? '#f2c230' : '#8a5a2b';
    const tall = (s.crop === 'maize' ? 26 : s.crop === 'millet' ? 21 : 16) * (0.25 + 0.75 * ch) * grow;
    const rows = crp[1] - crp[0] > 0.6 ? 12 : 6, gap = (crp[1] - crp[0] - 0.06) / rows;
    let stems = '', heads = '', drip = '';
    for (let i = 0; i < rows; i++) {
      const v = crp[0] + 0.055 + i * gap;
      if (s.irrigate) { const a = P(0.03, v + 0.02), c = P(0.97, v + 0.02); drip += `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${c[0].toFixed(1)}" y2="${c[1].toFixed(1)}"/>`; }
      for (let j = 0; j < 17; j++) {
        if (ch < 0.12 && (i + j) % 3) continue; // a failed crop stands thin
        const [x, y] = P(0.04 + j * 0.0575, v);
        stems += `M${x.toFixed(1)},${y.toFixed(1)}l0,${(-tall).toFixed(1)}`;
        if (ch > 0.2 && grow > 0.8) heads += `<circle cx="${x.toFixed(1)}" cy="${(y - tall).toFixed(1)}" r="${(1.6 + 1.8 * ch).toFixed(1)}"/>`;
      }
    }
    if (drip) h += `<g stroke="#3f8fd0" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="1 7">${drip}</g>`;
    h += `<path d="${stems}" stroke="${mix('#b59a5a', mix(green, gold, ripe), ch * 1.4)}" stroke-width="2.4" stroke-linecap="round" fill="none"/><g fill="${head}">${heads}</g>`;
  }
  if (nat && crp) h += `<polyline points="${pts([P(0, 0.5), P(1, 0.5)])}" fill="none" stroke="#00000040" stroke-width="1.5"/>`;
  void t;
  // labels lying on the figure
  if (s.labels) {
    const lab = (x: number, y: number, txt: string) => `<text x="${x}" y="${y}" font-size="19" font-weight="600" text-anchor="middle" fill="#111" stroke="#fff" stroke-width="4" paint-order="stroke" stroke-linejoin="round">${txt}</text>`;
    if (nat) h += lab(nat[1] > 0.6 ? 320 : 404, nat[1] > 0.6 ? 300 : 268, 'natural vegetation');
    if (crp) h += lab(crp[0] < 0.4 ? 320 : 236, crp[0] < 0.4 ? 300 : 344, 'cropland: ' + s.crop);
    h += `<g font-size="15" font-weight="600" fill="#fff"><text transform="translate(74,303) skewY(26.565)">top soil</text><text transform="translate(74,359) skewY(26.565)">deep soil</text></g>`;
  }
  return h;
}

export const BLOCK_VIEW = '0 0 640 520';
