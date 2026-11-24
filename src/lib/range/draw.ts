// Canvas drawing for the rangeland map. One function draws one frame from a plain description,
// so every widget on the page shares the same look.
import { W, H, N, K, type Strategy, type Snap } from "./model";

type RGB = [number, number, number];
interface Pal {
  ramp: RGB[];        // bare ground → thick grass
  gap: string;        // lines between squares (page background)
  rain: RGB;
  stay: string; move: string;
  ink: string; muted: string; surface: string;
  field: string; furrow: string;
}

const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

export function pal(): Pal {
  const night = document.documentElement.dataset.theme === "night";
  const css = getComputedStyle(document.documentElement);
  const v = (n: string, d: string) => css.getPropertyValue(n).trim() || d;
  return night
    ? {
        ramp: [hex("#2b2a24"), hex("#4a4a2c"), hex("#5f7a3c"), hex("#a9cf7c")],
        gap: v("--bg", "#121a15"), rain: hex("#8fb4e8"),
        stay: "#c98427", move: "#2a9cba",
        ink: v("--ink", "#e6ece4"), muted: v("--muted", "#a9b6aa"), surface: v("--surface", "#18231c"),
        field: "#3a3020", furrow: "#7d6a3f",
      }
    : {
        ramp: [hex("#e6dfd0"), hex("#d3cf9c"), hex("#8fae5c"), hex("#3c7a3e")],
        gap: v("--bg", "#f1f4f3"), rain: hex("#3f6fb0"),
        stay: "#a85a06", move: "#00789a",
        ink: v("--ink", "#11252b"), muted: v("--muted", "#4b5d63"), surface: v("--surface", "#ffffff"),
        field: "#cdb98a", furrow: "#8a6f33",
      };
}

function rampColor(p: Pal, t: number): string {
  const x = Math.max(0, Math.min(1, t)) * (p.ramp.length - 1);
  const i = Math.min(p.ramp.length - 2, Math.floor(x)), f = x - i;
  const a = p.ramp[i], b = p.ramp[i + 1];
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * f)},${Math.round(a[1] + (b[1] - a[1]) * f)},${Math.round(a[2] + (b[2] - a[2]) * f)})`;
}

/** Grass amount → 0..1 for colour. */
export const shade = (g: number) => Math.pow(Math.max(0, Math.min(1, g / (K.grassA * 2.1))), 0.7);

export interface Herd {
  x: number; y: number;      // in squares, may be fractional while walking
  herd: number;
  strategy: Strategy;
  out?: boolean;
  you?: boolean;
  id: number;
}
export interface Scene {
  grass: ArrayLike<number>;
  rain?: ArrayLike<number> | null;
  rainAlpha?: number;
  closed?: ArrayLike<number> | null;
  owned?: ArrayLike<number> | null;
  herds?: Herd[];
  ring?: Set<number> | null;     // if set, squares outside it are dimmed
  cleared?: Set<number> | null;  // squares cleared as corridors (puzzle)
  cursor?: number | null;        // square under the pointer
  homes?: boolean;               // draw wells at the centre of every home range
}

/** On a narrow (phone) screen the map is turned on its side, 9 squares wide and 15 tall,
 *  so every square is bigger and easier to tap. The land itself is the same. */
export const tall = () => window.matchMedia("(max-width: 560px)").matches;

export interface Geo { cell: number; cols: number; rows: number; tall: boolean; sx(x: number, y: number): number; sy(x: number, y: number): number }

/** Size the canvas for the screen and say where each square goes on it. */
export function geo(c: HTMLCanvasElement): Geo {
  const t = tall();
  const cols = t ? H : W, rows = t ? W : H;
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const w = c.clientWidth || 300;
  const cell = w / cols;
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(cell * rows * dpr)) {
    c.width = Math.round(w * dpr);
    c.height = Math.round(cell * rows * dpr);
  }
  c.getContext("2d")!.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { cell, cols, rows, tall: t, sx: (x, y) => (t ? y : x) * cell, sy: (x, y) => (t ? x : y) * cell };
}
export function fit(c: HTMLCanvasElement): number { return geo(c).cell; }

const rainBuf: Record<string, HTMLCanvasElement> = {};

export function draw(c: HTMLCanvasElement, s: Scene) {
  const g = geo(c), cell = g.cell;
  const ctx = c.getContext("2d")!;
  const p = pal();
  const gap = Math.max(1, cell * 0.05);
  ctx.fillStyle = p.gap;
  ctx.fillRect(0, 0, cell * g.cols, cell * g.rows);

  // ground
  for (let i = 0; i < N; i++) {
    const x = g.sx(i % W, Math.floor(i / W)), y = g.sy(i % W, Math.floor(i / W));
    if (s.closed && s.closed[i]) {
      ctx.fillStyle = p.field;
      ctx.fillRect(x + gap / 2, y + gap / 2, cell - gap, cell - gap);
      ctx.strokeStyle = p.furrow;
      ctx.lineWidth = Math.max(1, cell * 0.06);
      ctx.beginPath();
      for (let k = 1; k <= 3; k++) {
        const yy = y + (cell * k) / 4;
        ctx.moveTo(x + cell * 0.18, yy);
        ctx.lineTo(x + cell * 0.82, yy);
      }
      ctx.stroke();
    } else {
      ctx.fillStyle = rampColor(p, shade(s.grass[i]));
      ctx.fillRect(x + gap / 2, y + gap / 2, cell - gap, cell - gap);
      if (s.cleared && s.cleared.has(i)) {
        ctx.fillStyle = p.ink;
        ctx.globalAlpha = 0.55;
        for (const [dx, dy] of [[0.3, 0.3], [0.7, 0.45], [0.35, 0.7]]) {
          ctx.beginPath();
          ctx.arc(x + cell * dx, y + cell * dy, Math.max(1, cell * 0.06), 0, 7);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }
  }

  // home ranges: a line around the squares a staying family holds
  if (s.owned) {
    ctx.strokeStyle = p.stay;
    ctx.lineWidth = Math.max(1.5, cell * 0.07);
    ctx.beginPath();
    // the model neighbour that sits one step across (dc) or down (dr) on the screen
    const other = (cx: number, cy: number, dc: number, dr: number, o: number) => {
      const nx = cx + (g.tall ? dr : dc), ny = cy + (g.tall ? dc : dr);
      return nx < 0 || nx >= W || ny < 0 || ny >= H || s.owned![ny * W + nx] !== o;
    };
    for (let i = 0; i < N; i++) {
      const o = s.owned[i];
      if (o < 0) continue;
      const cx = i % W, cy = Math.floor(i / W);
      const x = g.sx(cx, cy), y = g.sy(cx, cy), inset = gap;
      if (other(cx, cy, 0, -1, o)) { ctx.moveTo(x + inset, y + inset); ctx.lineTo(x + cell - inset, y + inset); }
      if (other(cx, cy, 0, 1, o)) { ctx.moveTo(x + inset, y + cell - inset); ctx.lineTo(x + cell - inset, y + cell - inset); }
      if (other(cx, cy, -1, 0, o)) { ctx.moveTo(x + inset, y + inset); ctx.lineTo(x + inset, y + cell - inset); }
      if (other(cx, cy, 1, 0, o)) { ctx.moveTo(x + cell - inset, y + inset); ctx.lineTo(x + cell - inset, y + cell - inset); }
    }
    ctx.globalAlpha = 0.55;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // rain: a tiny image scaled up, so storms look like soft blobs rather than squares
  if (s.rain && (s.rainAlpha ?? 0) > 0.01) {
    const key = g.cols + "x" + g.rows;
    if (!rainBuf[key]) { rainBuf[key] = document.createElement("canvas"); rainBuf[key].width = g.cols; rainBuf[key].height = g.rows; }
    const rc = rainBuf[key].getContext("2d")!;
    const img = rc.createImageData(g.cols, g.rows);
    for (let i = 0; i < N; i++) {
      const col = g.tall ? Math.floor(i / W) : i % W, row = g.tall ? i % W : Math.floor(i / W);
      const k = (row * g.cols + col) * 4;
      img.data[k] = p.rain[0]; img.data[k + 1] = p.rain[1]; img.data[k + 2] = p.rain[2];
      img.data[k + 3] = Math.round(255 * Math.min(0.7, s.rain[i] * 0.34) * (s.rainAlpha ?? 1));
    }
    rc.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(rainBuf[key], 0, 0, cell * g.cols, cell * g.rows);
    ctx.strokeStyle = `rgba(${p.rain[0]},${p.rain[1]},${p.rain[2]},${0.75 * (s.rainAlpha ?? 1)})`;
    ctx.lineWidth = Math.max(1, cell * 0.045);
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      if (s.rain[i] < 0.9) continue;
      const x = g.sx(i % W, Math.floor(i / W)), y = g.sy(i % W, Math.floor(i / W));
      const n = s.rain[i] > 1.6 ? 3 : 2;
      for (let k = 0; k < n; k++) {
        const sx = x + cell * (0.25 + 0.27 * k), sy = y + cell * (0.25 + 0.18 * ((i + k) % 3));
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - cell * 0.1, sy + cell * 0.28);
      }
    }
    ctx.stroke();
  }

  // dim what is out of reach
  if (s.ring) {
    ctx.fillStyle = p.gap;
    ctx.globalAlpha = 0.62;
    for (let i = 0; i < N; i++) {
      if (s.ring.has(i)) continue;
      ctx.fillRect(g.sx(i % W, Math.floor(i / W)), g.sy(i % W, Math.floor(i / W)), cell, cell);
    }
    ctx.globalAlpha = 1;
  }
  if (s.cursor != null && s.cursor >= 0) {
    const cx = s.cursor % W, cy = Math.floor(s.cursor / W);
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(g.sx(cx - 1, cy - 1) + 2, g.sy(cx - 1, cy - 1) + 2, cell * 3 - 4, cell * 3 - 4);
    ctx.setLineDash([]);
  }

  // herds: cattle first, then the family marker on top.
  // Families camped on the same square are fanned out a little so each one stays visible.
  const raw = s.herds ?? [];
  const here = new Map<string, number[]>();
  raw.forEach((h, k) => { const key = Math.round(h.x * 2) + "," + Math.round(h.y * 2); (here.get(key) ?? here.set(key, []).get(key)!).push(k); });
  const herds = raw.map((h) => ({ ...h, px: g.sx(h.x + 0.5, h.y + 0.5), py: g.sy(h.x + 0.5, h.y + 0.5) }));
  for (const ks of here.values()) {
    if (ks.length < 2) continue;
    const r = Math.min(0.95, 0.42 + 0.09 * ks.length) * cell;
    ks.forEach((k, j) => { const a = (j / ks.length) * Math.PI * 2 - Math.PI / 2; herds[k].px += Math.cos(a) * r; herds[k].py += Math.sin(a) * r * 0.8; });
  }
  for (const h of herds) {
    if (h.out) continue;
    const col = h.strategy === "stay" ? p.stay : p.move;
    const n = Math.max(1, Math.min(9, Math.round(h.herd / 9)));
    const size = Math.max(5.5, cell * 0.34);
    for (let k = 0; k < n; k++) {
      const o = SPOTS[(k + h.id * 3) % SPOTS.length];
      cow(ctx, h.px + o[0] * cell, h.py + o[1] * cell, size, col, p.surface, (k + h.id) % 2 === 0);
    }
  }
  for (const h of herds) {
    const col = h.strategy === "stay" ? p.stay : p.move;
    const size = Math.max(9, cell * 0.52);
    if (h.strategy === "stay") hut(ctx, h.px, h.py, size, col, p, !!h.out);
    else tent(ctx, h.px, h.py, size, col, p, !!h.out);
    if (h.you) {
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(h.px, h.py, size * 0.95, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

// where the cattle of one herd stand around their camp, in squares
const SPOTS: [number, number][] = [
  [-0.72, -0.55], [0.7, 0.6], [0.66, -0.62], [-0.7, 0.62], [0, -0.85], [0, 0.88], [-0.95, 0.05], [0.95, 0], [-0.35, 0.3], [0.4, -0.25],
];

function cow(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, col: string, edge: string, flip: boolean) {
  const d = flip ? -1 : 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(d, 1);
  ctx.fillStyle = col;
  ctx.strokeStyle = edge;
  ctx.lineWidth = Math.max(0.8, s * 0.12);
  ctx.beginPath();
  // body with a zebu hump, seen from the side
  ctx.moveTo(-s * 0.5, -s * 0.1);
  ctx.quadraticCurveTo(-s * 0.5, -s * 0.34, -s * 0.2, -s * 0.3);
  ctx.quadraticCurveTo(s * 0.08, -s * 0.56, s * 0.22, -s * 0.3); // hump
  ctx.lineTo(s * 0.5, -s * 0.36);                                  // neck to head
  ctx.lineTo(s * 0.66, -s * 0.12);
  ctx.lineTo(s * 0.44, -s * 0.02);
  ctx.lineTo(s * 0.36, s * 0.14);
  ctx.lineTo(s * 0.34, s * 0.42);  // front leg
  ctx.lineTo(s * 0.2, s * 0.42);
  ctx.lineTo(s * 0.18, s * 0.18);
  ctx.lineTo(-s * 0.26, s * 0.18);
  ctx.lineTo(-s * 0.28, s * 0.42); // hind leg
  ctx.lineTo(-s * 0.42, s * 0.42);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
  // horn
  ctx.strokeStyle = col;
  ctx.lineWidth = Math.max(0.8, s * 0.09);
  ctx.beginPath();
  ctx.moveTo(s * 0.48, -s * 0.36);
  ctx.quadraticCurveTo(s * 0.5, -s * 0.62, s * 0.66, -s * 0.6);
  ctx.stroke();
  ctx.restore();
}

function hut(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, col: string, p: Pal, out: boolean) {
  ctx.lineWidth = Math.max(1.2, s * 0.12);
  ctx.lineJoin = "round";
  ctx.strokeStyle = out ? p.muted : p.surface;
  ctx.fillStyle = out ? p.gap : col;
  ctx.globalAlpha = out ? 0.75 : 1;
  ctx.beginPath(); // round hut: wall and conical roof
  ctx.rect(x - s * 0.34, y - s * 0.02, s * 0.68, s * 0.44);
  ctx.moveTo(x - s * 0.56, y + s * 0.02);
  ctx.lineTo(x, y - s * 0.56);
  ctx.lineTo(x + s * 0.56, y + s * 0.02);
  ctx.closePath();
  if (out) { ctx.setLineDash([2, 2]); ctx.fill(); ctx.stroke(); ctx.setLineDash([]); }
  else { ctx.stroke(); ctx.fill(); }
  ctx.globalAlpha = 1;
}

function tent(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, col: string, p: Pal, out: boolean) {
  ctx.lineWidth = Math.max(1.2, s * 0.12);
  ctx.lineJoin = "round";
  ctx.strokeStyle = out ? p.muted : p.surface;
  ctx.fillStyle = out ? p.gap : col;
  ctx.globalAlpha = out ? 0.75 : 1;
  ctx.beginPath(); // low tent: a wide triangle with its poles crossing at the top
  ctx.moveTo(x - s * 0.6, y + s * 0.42);
  ctx.lineTo(x, y - s * 0.46);
  ctx.lineTo(x + s * 0.6, y + s * 0.42);
  ctx.closePath();
  if (out) { ctx.setLineDash([2, 2]); ctx.fill(); ctx.stroke(); ctx.setLineDash([]); }
  else { ctx.stroke(); ctx.fill(); }
  if (!out) {
    ctx.fillStyle = p.surface;
    ctx.beginPath(); // doorway
    ctx.moveTo(x - s * 0.14, y + s * 0.42);
    ctx.lineTo(x, y + s * 0.02);
    ctx.lineTo(x + s * 0.14, y + s * 0.42);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Which square is under a pointer event. */
export function squareAt(c: HTMLCanvasElement, e: { clientX: number; clientY: number }): number {
  const r = c.getBoundingClientRect();
  const t = tall();
  const col = Math.floor(((e.clientX - r.left) / r.width) * (t ? H : W)), row = Math.floor(((e.clientY - r.top) / r.height) * (t ? W : H));
  const x = t ? row : col, y = t ? col : row;
  if (x < 0 || x >= W || y < 0 || y >= H) return -1;
  return y * W + x;
}

// ---------- animating a recorded run ----------

const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t));
const ease = (t: number) => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };

/** The scene for year t (1-based), a fraction p of the way through it. */
export function sceneAt(snaps: Snap[], t: number, p: number, extra: Partial<Scene> = {}): Scene {
  const cur = snaps[Math.min(t, snaps.length - 1)], prev = snaps[Math.max(0, Math.min(t, snaps.length - 1) - 1)];
  const grass = new Float64Array(N);
  const a = ease((p - 0.1) / 0.3), b = ease((p - 0.62) / 0.38);
  for (let i = 0; i < N; i++) grass[i] = b > 0 ? lerp(cur.grass[i], cur.left[i], b) : lerp(prev.left[i], cur.grass[i], a);
  const rainAlpha = p < 0.12 ? p / 0.12 : p < 0.34 ? 1 : Math.max(0, 1 - (p - 0.34) / 0.2);
  const herds: Herd[] = cur.fams.map((f, k) => {
    const pf = prev.fams[k];
    const startPos = pf.camps[pf.camps.length - 1] ?? f.camps[0];
    const stops = [startPos, ...f.camps];
    let x = startPos.x, y = startPos.y;
    if (f.camps.length) {
      const m = ease((p - 0.3) / 0.45) * (stops.length - 1);
      const i = Math.min(stops.length - 2, Math.floor(m)), fr = m - i;
      x = lerp(stops[i].x, stops[i + 1].x, fr);
      y = lerp(stops[i].y, stops[i + 1].y, fr);
    }
    const g = ease((p - 0.7) / 0.3);
    return { id: f.id, strategy: f.strategy, x, y, herd: lerp(pf.herd, f.herd, g), out: pf.out || (f.out && p > 0.9) };
  });
  return { grass, rain: cur.rain, rainAlpha, herds, ...extra };
}

/** A still frame at the end of year t. */
export function sceneEnd(snaps: Snap[], t: number, extra: Partial<Scene> = {}): Scene {
  const cur = snaps[Math.min(t, snaps.length - 1)];
  return {
    grass: t === 0 ? cur.grass : cur.left,
    herds: cur.fams.map((f) => { const c = f.camps[f.camps.length - 1]; return { id: f.id, strategy: f.strategy, x: c.x, y: c.y, herd: f.herd, out: f.out }; }),
    ...extra,
  };
}

export interface Clock { stop(): void; finish(): void; running: boolean }
/** Call frame(t, p) for years 1..years at msPerYear each, then done(). */
export function playYears(years: number, msPerYear: number, frame: (t: number, p: number) => void, done: () => void): Clock {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let raf = 0, stopped = false;
  const clock: Clock = {
    running: true,
    stop() { stopped = true; clock.running = false; cancelAnimationFrame(raf); },
    finish() { if (stopped) return; clock.stop(); frame(years, 1); done(); },
  };
  if (reduce) { setTimeout(() => clock.finish(), 0); return clock; }
  const t0 = performance.now();
  const tick = (now: number) => {
    if (stopped) return;
    const e = (now - t0) / msPerYear;
    if (e >= years) { clock.finish(); return; }
    frame(Math.floor(e) + 1, e - Math.floor(e));
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return clock;
}
