// Small hand-built SVG charts: a line chart and a bar chart, both with a hover readout.
// Colours come from CSS variables so the charts follow the day and night themes.

const NS = "http://www.w3.org/2000/svg";
function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, parent?: Element): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  if (parent) parent.appendChild(e);
  return e;
}

export interface Series {
  key: string;
  label: string;
  color: string;        // a CSS colour or var(...)
  dash?: string;
  width?: number;
  values: number[];     // one per x step, starting at x0
}
export interface LineOpts {
  x0: number; x1: number;
  yMax: number; yMin?: number;
  log?: boolean;
  xTicks: number[]; yTicks: number[];
  xFmt?: (v: number) => string; yFmt?: (v: number) => string;
  yTickFmt?: (v: number) => string;
  xLabel?: string; yLabel?: string;
  series: Series[];
  height?: number;
  step?: boolean;       // draw as steps (for counts)
  tip?: (x: number, vals: { s: Series; v: number }[]) => string;
  marks?: { x: number; label: string }[]; // vertical reference lines
}

export function lineChart(host: HTMLElement, o: LineOpts) {
  host.innerHTML = "";
  host.classList.add("chart");
  // one unit = one CSS pixel at the size the chart is first drawn, so text stays readable on phones
  const Wd = Math.max(300, Math.min(760, host.clientWidth || 640)), Ht = Math.round((o.height ?? 300) * (Wd < 480 ? 0.85 : 1));
  const m = { l: 36, r: Wd < 480 ? 74 : 96, t: o.yLabel ? 30 : 14, b: 42 };
  const svg = el("svg", { viewBox: `0 0 ${Wd} ${Ht}`, role: "img" }, host);
  const yMin = o.yMin ?? 0;
  const X = (v: number) => m.l + ((v - o.x0) / (o.x1 - o.x0)) * (Wd - m.l - m.r);
  const Y = (v: number) => {
    if (o.log) {
      const a = Math.log10(Math.max(v, yMin)), lo = Math.log10(yMin), hi = Math.log10(o.yMax);
      return Ht - m.b - ((a - lo) / (hi - lo)) * (Ht - m.t - m.b);
    }
    return Ht - m.b - ((v - yMin) / (o.yMax - yMin)) * (Ht - m.t - m.b);
  };
  const xf = o.xFmt ?? String, yf = o.yFmt ?? String;
  const g = el("g", { class: "axis" }, svg);
  for (const t of o.yTicks) {
    el("line", { x1: m.l, x2: Wd - m.r, y1: Y(t), y2: Y(t), class: "grid" }, g);
    el("text", { x: m.l - 8, y: Y(t) + 4, "text-anchor": "end" }, g).textContent = (o.yTickFmt ?? yf)(t);
  }
  const xt = Wd < 480 && o.xTicks.length > 4 ? o.xTicks.filter((_, i) => i % 2 === 0) : o.xTicks;
  for (const t of xt) el("text", { x: X(t), y: Ht - m.b + 18, "text-anchor": "middle" }, g).textContent = xf(t);
  if (o.xLabel) el("text", { x: (m.l + Wd - m.r) / 2, y: Ht - 5, "text-anchor": "middle", class: "lab" }, g).textContent = o.xLabel;
  if (o.yLabel) el("text", { x: 0, y: 11, class: "lab" }, g).textContent = o.yLabel;
  (o.marks ?? []).forEach((mk, k) => {
    el("line", { x1: X(mk.x), x2: X(mk.x), y1: m.t, y2: Ht - m.b, class: "mark" }, g);
    const right = X(mk.x) > (m.l + Wd - m.r) * 0.55;
    el("text", { x: X(mk.x) + (right ? -5 : 5), y: Ht - m.b - 7 - 17 * k, class: "lab", "text-anchor": right ? "end" : "start" }, g).textContent = mk.label;
  });
  const clipId = "c" + Math.random().toString(36).slice(2, 8);
  const clip = el("clipPath", { id: clipId }, svg);
  const clipRect = el("rect", { x: 0, y: 0, width: Wd, height: Ht }, clip);
  const lines = el("g", { "clip-path": `url(#${clipId})` }, svg);
  const paths = new Map<string, SVGPathElement>();
  const ends = new Map<string, SVGTextElement>();
  const d = (s: Series) => {
    let out = "";
    s.values.forEach((v, i) => {
      const x = X(o.x0 + i), y = Y(v);
      if (i === 0) out += `M${x.toFixed(1)},${y.toFixed(1)}`;
      else if (o.step) out += `H${x.toFixed(1)}V${y.toFixed(1)}`;
      else out += `L${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return out;
  };
  for (const s of o.series) {
    const p = el("path", { d: d(s), fill: "none", stroke: s.color, "stroke-width": s.width ?? 2.5, "stroke-linejoin": "round", "stroke-linecap": "round" }, lines);
    if (s.dash) p.setAttribute("stroke-dasharray", s.dash);
    paths.set(s.key, p);
    const t = el("text", { class: "end" }, svg);
    ends.set(s.key, t);
  }
  // hover layer
  const hover = el("g", { class: "hover", visibility: "hidden" }, svg);
  const cross = el("line", { y1: m.t, y2: Ht - m.b, class: "cross" }, hover);
  const dots = o.series.map((s) => el("circle", { r: 4.5, fill: s.color, class: "dot" }, hover));
  const tip = document.createElement("div");
  tip.className = "tip";
  tip.hidden = true;
  host.appendChild(tip);
  let shown = o.x1;
  const placeEnds = () => {
    const pos: { key: string; y: number }[] = [];
    for (const s of o.series) {
      const i = Math.max(0, Math.min(s.values.length - 1, Math.round(shown - o.x0)));
      pos.push({ key: s.key, y: Y(s.values[i]) });
    }
    pos.sort((a, b) => a.y - b.y);
    for (let i = 1; i < pos.length; i++) if (pos[i].y - pos[i - 1].y < 15) pos[i].y = pos[i - 1].y + 15;
    for (const s of o.series) {
      const i = Math.max(0, Math.min(s.values.length - 1, Math.round(shown - o.x0)));
      const t = ends.get(s.key)!;
      t.setAttribute("x", String(X(o.x0 + i) + 8));
      t.setAttribute("y", String(pos.find((q) => q.key === s.key)!.y + 4));
      t.textContent = s.label;
    }
  };
  const move = (ev: PointerEvent) => {
    const r = svg.getBoundingClientRect();
    const vx = ((ev.clientX - r.left) / r.width) * Wd;
    let xv = Math.round(o.x0 + ((vx - m.l) / (Wd - m.l - m.r)) * (o.x1 - o.x0));
    xv = Math.max(o.x0, Math.min(Math.floor(shown), xv));
    const i = xv - o.x0;
    hover.setAttribute("visibility", "visible");
    cross.setAttribute("x1", String(X(xv))); cross.setAttribute("x2", String(X(xv)));
    o.series.forEach((s, k) => { dots[k].setAttribute("cx", String(X(xv))); dots[k].setAttribute("cy", String(Y(s.values[Math.min(i, s.values.length - 1)]))); });
    const vals = o.series.map((s) => ({ s, v: s.values[Math.min(i, s.values.length - 1)] }));
    tip.innerHTML = o.tip ? o.tip(xv, vals) : `<b>${xf(xv)}</b>` + vals.map((q) => `<span><i style="background:${q.s.color}"></i>${q.s.label}: ${yf(q.v)}</span>`).join("");
    tip.hidden = false;
    const px = (X(xv) / Wd) * r.width;
    tip.style.left = Math.max(0, Math.min(r.width - tip.offsetWidth, px + (px > r.width * 0.6 ? -tip.offsetWidth - 10 : 10))) + "px";
  };
  svg.addEventListener("pointermove", move);
  svg.addEventListener("pointerdown", move);
  svg.addEventListener("pointerleave", () => { hover.setAttribute("visibility", "hidden"); tip.hidden = true; });
  const api = {
    /** show the lines only up to x (for drawing along with an animation) */
    reveal(x: number) { shown = x; clipRect.setAttribute("width", String(X(x) + 1)); placeEnds(); },
    set(series: Series[]) {
      for (const s of series) {
        const old = o.series.find((q) => q.key === s.key);
        if (old) { old.values = s.values; old.label = s.label; }
        paths.get(s.key)?.setAttribute("d", d(s));
      }
      placeEnds();
    },
    X, Y, svg,
  };
  api.reveal(o.x1);
  return api;
}

export interface BarOpts {
  x0: number;
  values: number[];              // signed
  yMax: number;
  xTicks: number[];
  pos: string; neg: string;      // colours for above and below zero
  tip: (x: number, v: number) => string;
  notes?: { x: number; y: number; text: string; anchor?: "start" | "middle" | "end" }[];
  height?: number;
  topLabel?: string; bottomLabel?: string;
}
export function barChart(host: HTMLElement, o: BarOpts) {
  host.innerHTML = "";
  host.classList.add("chart");
  const Wd = Math.max(300, Math.min(760, host.clientWidth || 640)), Ht = Math.round((o.height ?? 250) * (Wd < 480 ? 0.85 : 1));
  const m = { l: 8, r: 8, t: 18, b: 26 };
  const svg = el("svg", { viewBox: `0 0 ${Wd} ${Ht}`, role: "img" }, host);
  const n = o.values.length;
  const bw = (Wd - m.l - m.r) / n;
  const mid = m.t + (Ht - m.t - m.b) / 2;
  const sc = (Ht - m.t - m.b) / 2 / o.yMax;
  const g = el("g", { class: "axis" }, svg);
  if (o.topLabel) el("text", { x: m.l, y: m.t - 5, class: "lab" }, g).textContent = o.topLabel;
  if (o.bottomLabel) el("text", { x: m.l, y: Ht - m.b - 4, class: "lab" }, g).textContent = o.bottomLabel;
  for (const t of o.xTicks) {
    const x = m.l + (t - o.x0 + 0.5) * bw;
    el("line", { x1: x, x2: x, y1: Ht - m.b, y2: Ht - m.b + 4, class: "grid" }, g);
    el("text", { x, y: Ht - m.b + 18, "text-anchor": "middle" }, g).textContent = String(t);
  }
  const bars: SVGRectElement[] = [];
  o.values.forEach((v, i) => {
    const h = Math.max(1, Math.abs(v) * sc);
    bars.push(el("rect", { x: m.l + i * bw + 0.6, y: v >= 0 ? mid - h : mid, width: Math.max(1, bw - 1.2), height: h, fill: v >= 0 ? o.pos : o.neg, rx: Math.min(1.5, bw / 3) }, svg));
  });
  el("line", { x1: m.l, x2: Wd - m.r, y1: mid, y2: mid, class: "zero" }, svg);
  for (const nt of o.notes ?? []) {
    const t = el("text", { x: m.l + (nt.x - o.x0 + 0.5) * bw, y: mid - nt.y * sc, "text-anchor": nt.anchor ?? "middle", class: "note" }, svg);
    t.textContent = nt.text;
  }
  const head = el("rect", { y: m.t, width: Math.max(2, bw), height: Ht - m.t - m.b, class: "playhead", visibility: "hidden" }, svg);
  const tip = document.createElement("div");
  tip.className = "tip";
  tip.hidden = true;
  host.appendChild(tip);
  const move = (ev: PointerEvent) => {
    const r = svg.getBoundingClientRect();
    const vx = ((ev.clientX - r.left) / r.width) * Wd;
    const i = Math.max(0, Math.min(n - 1, Math.floor((vx - m.l) / bw)));
    bars.forEach((b, k) => b.setAttribute("opacity", k === i ? "1" : "0.55"));
    tip.innerHTML = o.tip(o.x0 + i, o.values[i]);
    tip.hidden = false;
    const px = ((m.l + (i + 0.5) * bw) / Wd) * r.width;
    tip.style.left = Math.max(0, Math.min(r.width - tip.offsetWidth, px - tip.offsetWidth / 2)) + "px";
  };
  svg.addEventListener("pointermove", move);
  svg.addEventListener("pointerdown", move);
  svg.addEventListener("pointerleave", () => { bars.forEach((b) => b.removeAttribute("opacity")); tip.hidden = true; });
  return {
    /** mark the year being played; pass null to hide */
    at(x: number | null) {
      if (x == null) { head.setAttribute("visibility", "hidden"); bars.forEach((b) => b.removeAttribute("opacity")); return; }
      head.setAttribute("visibility", "visible");
      head.setAttribute("x", String(m.l + (x - o.x0) * bw));
      bars.forEach((b, k) => b.setAttribute("opacity", k <= x - o.x0 ? "1" : "0.3"));
    },
  };
}
