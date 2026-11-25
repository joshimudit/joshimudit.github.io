// The landscape drawing: one block of land, natural vegetation at the back, cropland at the front,
// two soil layers underneath. It is drawn from the model's numbers, so it changes with place, climate and year.
// The idea of showing a model as a cut-out block of land with both land uses follows the LPJmL overview figure
// of the Potsdam Institute for Climate Impact Research; this drawing is our own.
import type { CropId } from './model';

export interface Scene {
  style: string;        // site id: decides how the trees look
  tree: number;         // share of the ground under trees, 0 to 1
  grass: number;        // share under grass
  size: number;         // how big the trees are, about 0.7 to 1.3
  w1: number; w2: number; // how full the two soil layers are
  rainMm: number;       // rain in a year
  warm: number;         // warming in °C
  crop: CropId; cropH: number; // crop height and health, 0 to 1
  irrigate?: boolean;
  labels?: boolean;
}

const T = [320, 140], U = [260, 130], V = [-260, 130];                 // top corner and the two edge directions
const P = (u: number, v: number) => [T[0] + u * U[0] + v * V[0], T[1] + u * U[1] + v * V[1]];
const pts = (a: number[][]) => a.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => { const x = hex(a), y = hex(b); return '#' + x.map((c, i) => Math.round(c + (y[i] - c) * clamp(t)).toString(16).padStart(2, '0')).join(''); };
function rnd(seed: number) { let a = seed; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; }

interface TreeLook { trunk: number; rx: number; ry: number; dark: string; light: string; grass: string }
const LOOK: Record<string, TreeLook> = {
  niamey:    { trunk: 22, rx: 21, ry: 10, dark: '#4f8136', light: '#7ba650', grass: '#b9bb55' },
  alice:     { trunk: 6,  rx: 11, ry: 7,  dark: '#7d8c52', light: '#9aa86b', grass: '#c9b86a' },
  hyderabad: { trunk: 24, rx: 18, ry: 13, dark: '#3f7f3a', light: '#62a355', grass: '#a9b84f' },
  seville:   { trunk: 16, rx: 14, ry: 13, dark: '#5f8347', light: '#84a565', grass: '#a8b862' },
  aarhus:    { trunk: 20, rx: 16, ry: 18, dark: '#35803f', light: '#57a65e', grass: '#6fae4b' },
  manaus:    { trunk: 34, rx: 18, ry: 20, dark: '#1f6b3c', light: '#2f8a52', grass: '#4e9d4a' },
};

// fixed places for trees, grass tufts and crop plants, so that nothing jumps about between frames
const r1 = rnd(7), TREES: { u: number; v: number; t: number }[] = [];
for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) TREES.push({ u: 0.1 + j * 0.2 + (r1() - 0.5) * 0.1, v: 0.06 + i * 0.105 + (r1() - 0.5) * 0.05, t: 0 });
[...TREES].sort(() => r1() - 0.5).forEach((t, k) => (t.t = (k + 0.5) / TREES.length));
TREES.sort((a, b) => a.u + a.v - (b.u + b.v));
const r2 = rnd(21), TUFTS = Array.from({ length: 70 }, () => ({ u: 0.03 + r2() * 0.94, v: 0.03 + r2() * 0.44, t: r2() }));
TUFTS.sort((a, b) => a.u + a.v - (b.u + b.v));

export function blockSvg(s: Scene): string {
  const L = LOOK[s.style] ?? LOOK.niamey, D1 = 40, D2 = 110;
  const [t, r, b, l] = [P(0, 0), P(1, 0), P(1, 1), P(0, 1)], m1 = P(0, 0.5), m2 = P(1, 0.5);
  const down = (p: number[], d: number) => [p[0], p[1] + d];
  let h = '';
  // sky: sun, clouds, rain
  const sunR = 30 + clamp(s.warm / 4) * 6;
  h += `<circle cx="556" cy="70" r="${sunR + 12}" fill="#e8590c" opacity="${(clamp(s.warm / 4) * 0.35).toFixed(2)}"/><circle cx="556" cy="70" r="${sunR}" fill="${mix('#f2a900', '#ee7a12', s.warm / 4)}"/>`;
  const clouds = s.rainMm < 260 ? 0 : s.rainMm < 650 ? 1 : s.rainMm < 1300 ? 2 : 3;
  for (let c = 0; c < clouds; c++) {
    const x = 120 + c * 118, y = 78 - (c % 2) * 26;
    h += `<g fill="#c7d3db"><ellipse cx="${x}" cy="${y}" rx="46" ry="19"/><ellipse cx="${x + 34}" cy="${y - 12}" rx="34" ry="22"/><ellipse cx="${x - 30}" cy="${y - 6}" rx="26" ry="14"/></g>`;
    h += `<g stroke="#1b6ca8" stroke-width="3.5" stroke-linecap="round">${[-22, 4, 30].map((dx) => `<line x1="${x + dx}" y1="${y + 28}" x2="${x + dx - 6}" y2="${y + 43}"/>`).join('')}</g>`;
  }
  // soil faces, two layers, with the water in each
  const face = (a: number[], c: number[], top: string, deep: string, water: string) => {
    let o = `<polygon points="${pts([a, c, down(c, D2), down(a, D2)])}" fill="${deep}"/><polygon points="${pts([a, c, down(c, D1), down(a, D1)])}" fill="${top}"/>`;
    const y1 = D1 - D1 * clamp(s.w1), y2 = D2 - (D2 - D1) * clamp(s.w2);
    o += `<polygon points="${pts([down(a, y1), down(c, y1), down(c, D1), down(a, D1)])}" fill="${water}" opacity="0.82"/><polygon points="${pts([down(a, y2), down(c, y2), down(c, D2), down(a, D2)])}" fill="${water}" opacity="0.82"/>`;
    return o + `<polyline points="${pts([down(a, D1), down(c, D1)])}" fill="none" stroke="#00000055" stroke-width="1"/>`;
  };
  h += face(l, b, '#6e5035', '#94704c', '#3f8fd0') + face(r, b, '#5a402a', '#7b5a3c', '#2f75b3');
  // ground: natural vegetation at the back, cropland in front
  const cover = clamp(s.tree + s.grass);
  h += `<polygon points="${pts([t, r, m2, m1])}" fill="${mix('#dcc9a2', L.grass, 0.25 + 0.75 * cover)}"/>`;
  h += `<polygon points="${pts([m1, m2, b, l])}" fill="${s.irrigate ? '#c9ae7e' : '#dcc292'}"/>`;
  h += `<polyline points="${pts([m1, m2])}" fill="none" stroke="#00000040" stroke-width="1.5"/>`;
  // grass tufts
  const tuft = mix(L.grass, '#3d6b2a', 0.35);
  h += `<g stroke="${tuft}" stroke-width="2" stroke-linecap="round">`;
  for (const g of TUFTS) if (g.t < s.grass * 1.15) { const [x, y] = P(g.u, g.v); h += `<path d="M${x.toFixed(1)},${y.toFixed(1)}l-3,-7M${x.toFixed(1)},${y.toFixed(1)}l0,-9M${x.toFixed(1)},${y.toFixed(1)}l3,-7"/>`; }
  h += '</g>';
  // trees: each has a threshold, so they come and go one by one as tree cover changes
  const step = 1 / TREES.length;
  for (const tr of TREES) {
    const k = clamp((s.tree * 1.05 - tr.t) / step + 0.5) * clamp(s.size, 0.6, 1.4);
    if (k < 0.08) continue;
    const [x, y] = P(tr.u, tr.v), th = L.trunk * k, rx = L.rx * k, ry = L.ry * k;
    h += `<ellipse cx="${x.toFixed(1)}" cy="${(y + 1).toFixed(1)}" rx="${(rx * 0.8).toFixed(1)}" ry="${(rx * 0.3).toFixed(1)}" fill="#00000022"/>`;
    h += `<rect x="${(x - 2.2 * k).toFixed(1)}" y="${(y - th).toFixed(1)}" width="${(4.4 * k).toFixed(1)}" height="${th.toFixed(1)}" fill="#5a402a"/>`;
    h += `<ellipse cx="${x.toFixed(1)}" cy="${(y - th - ry * 0.6).toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${L.dark}"/><ellipse cx="${(x - rx * 0.3).toFixed(1)}" cy="${(y - th - ry * 0.9).toFixed(1)}" rx="${(rx * 0.5).toFixed(1)}" ry="${(ry * 0.5).toFixed(1)}" fill="${L.light}"/>`;
  }
  // crop rows
  const ch = clamp(s.cropH), stem = s.crop === 'wheat' ? '#c99a1e' : '#4f9a3a', head = s.crop === 'wheat' ? '#e2b93b' : s.crop === 'maize' ? '#f2c230' : '#8a5a2b';
  const tall = (s.crop === 'maize' ? 26 : s.crop === 'millet' ? 21 : 16) * (0.25 + 0.75 * ch);
  let stems = '', heads = '', drip = '';
  for (let i = 0; i < 6; i++) {
    const v = 0.555 + i * 0.078;
    if (s.irrigate) { const a = P(0.03, v + 0.02), c = P(0.97, v + 0.02); drip += `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${c[0].toFixed(1)}" y2="${c[1].toFixed(1)}"/>`; }
    for (let j = 0; j < 17; j++) {
      if (ch < 0.12 && (i + j) % 3) continue; // a failed crop stands thin
      const [x, y] = P(0.04 + j * 0.0575, v);
      stems += `M${x.toFixed(1)},${y.toFixed(1)}l0,${(-tall).toFixed(1)}`;
      if (ch > 0.2) heads += `<circle cx="${x.toFixed(1)}" cy="${(y - tall).toFixed(1)}" r="${(1.6 + 1.8 * ch).toFixed(1)}"/>`;
    }
  }
  if (drip) h += `<g stroke="#3f8fd0" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="1 7">${drip}</g>`;
  h += `<path d="${stems}" stroke="${mix('#b59a5a', stem, ch * 1.4)}" stroke-width="2.4" stroke-linecap="round" fill="none"/><g fill="${head}">${heads}</g>`;
  // labels lying on the figure
  if (s.labels !== false) {
    const lab = (x: number, y: number, txt: string) => `<text x="${x}" y="${y}" font-size="19" font-weight="600" text-anchor="middle" fill="#111" stroke="#fff" stroke-width="4" paint-order="stroke" stroke-linejoin="round">${txt}</text>`;
    h += lab(404, 268, 'natural vegetation') + lab(236, 344, 'cropland: ' + s.crop);
    h += `<g font-size="15" font-weight="600" fill="#fff"><text transform="translate(74,${270 + 7 + 26}) skewY(26.565)">top soil</text><text transform="translate(74,${270 + 7 + 82}) skewY(26.565)">deep soil</text></g>`;
  }
  return h;
}

export const BLOCK_VIEW = '0 0 640 520';
/** Turn one model year into a scene. */
export function sceneOf(style: string, y: { tree: number; grass: number; vegC: number; w1: number; w2: number; rain: number }, crop: CropId, cropH: number, warm: number, irrigate: boolean): Scene {
  return { style, tree: y.tree, grass: Math.min(1 - y.tree, y.grass), size: 0.7 + 0.6 * clamp(Math.sqrt(y.vegC / 12000)), w1: y.w1, w2: y.w2, rainMm: y.rain, warm, crop, cropH, irrigate };
}
