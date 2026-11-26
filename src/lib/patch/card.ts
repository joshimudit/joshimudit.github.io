// The result card: a record of one experiment, drawn on a canvas so it can be saved as an image and shared.
import { blockSvg, BLOCK_VIEW, type Scene } from './block';

export interface CardData {
  kind: string; where: string; heading: string; claim: string; did: string; found: string; why: string; conclusion: string;
  sceneA: Scene; capA: string; sceneB: Scene; capB: string; heads: [string, string][]; url: string;
}

// Two shapes, both 3:2: landscape on a laptop, portrait on a phone, so the text stays readable where the card is made.
const SANS = '"IBM Plex Sans", system-ui, sans-serif', COND = '"IBM Plex Sans Condensed", "IBM Plex Sans", system-ui, sans-serif';
const SIZE = { land: [2400, 1600], port: [1600, 2400] } as const;
export const wantsPortrait = () => window.matchMedia('(max-width: 760px), (orientation: portrait) and (max-width: 1100px)').matches;
const img = (src: string) => new Promise<HTMLImageElement | null>((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
const land = (s: Scene) => img('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${BLOCK_VIEW}" width="1280" height="1040">${blockSvg(s)}</svg>`));

function lines(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const out: string[] = []; let cur = '';
  for (const w of text.split(/\s+/)) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; }
  if (cur) out.push(cur);
  return out;
}
/** Shrink a font until the text fits the width. */
function fit(ctx: CanvasRenderingContext2D, text: string, weight: number, px: number, min: number, maxW: number, fam = SANS) {
  ctx.font = `${weight} ${px}px ${fam}`;
  while (ctx.measureText(text).width > maxW && px > min) ctx.font = `${weight} ${--px}px ${fam}`;
  return px;
}

type Row = [string, string, boolean];              // label, text, bold
interface Sizes { first: number; bold: number; plain: number; lab: number; gap: number }
interface Laid { label: string; bold: boolean; px: number; ls: string[] }
function layRows(ctx: CanvasRenderingContext2D, rows: Row[], z: Sizes, maxW: number, firstBig: boolean) {
  let h = 0;
  const out: Laid[] = rows.map(([label, text, bold], i) => {
    const px = i === 0 && firstBig ? z.first : bold ? z.bold : z.plain;
    ctx.font = `${bold ? 600 : 400} ${px}px ${SANS}`;
    const ls = lines(ctx, text, maxW);
    h += z.lab * 1.4 + ls.length * px * 1.24 + z.gap;
    return { label, bold, px, ls };
  });
  return { rows: out, h };
}
function drawRows(ctx: CanvasRenderingContext2D, laid: Laid[], z: Sizes, x: number, y: number) {
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  for (const r of laid) {
    ctx.font = `600 ${z.lab}px ${COND}`; ctx.fillStyle = '#555'; y += z.lab * 1.4; ctx.fillText(r.label, x, y - z.lab * 0.35);
    ctx.font = `${r.bold ? 600 : 400} ${r.px}px ${SANS}`; ctx.fillStyle = '#111';
    for (const l of r.ls) { y += r.px * 1.24; ctx.fillText(l, x, y - r.px * 0.26); }
    y += z.gap;
  }
  return y;
}
const conclusionH = (z: Sizes) => z.bold * 1.75 + z.gap;
function drawConclusion(ctx: CanvasRenderingContext2D, text: string, z: Sizes, x: number, y: number) {
  ctx.font = `600 ${z.bold}px ${SANS}`; const tw = ctx.measureText(text).width, h = z.bold * 1.75;
  ctx.fillStyle = '#111'; ctx.fillRect(x, y, tw + 56, h);
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.fillText(text, x + 28, y + h / 2 + 2);
  ctx.fillStyle = '#111'; ctx.font = `400 ${z.plain}px ${SANS}`; ctx.fillText('in this model', x + tw + 80, y + h / 2 + 2); ctx.textBaseline = 'alphabetic';
}

/** The two pieces of land with their captions and the two headline numbers. Returns the height used. */
interface LandSizes { cap: number; bar: number; num: number; desc: number; descLines: number }
const landsH = (bw: number, z: LandSizes) => z.bar + bw * 520 / 640 + 24 + z.num * 1.05 + z.desc * 1.3 * z.descLines;
function drawLands(ctx: CanvasRenderingContext2D, ims: (HTMLImageElement | null)[], d: CardData, x: number, y: number, w: number, bw: number, z: LandSizes) {
  const gap = 32, cw = (w - gap) / 2, bh = (bw * 520) / 640;
  [[ims[0], d.capA, false], [ims[1], d.capB, true]].forEach(([im, cap, dark], i) => {
    const cx = x + i * (cw + gap);
    ctx.fillStyle = dark ? '#111' : '#e6e6e6'; ctx.fillRect(cx, y, cw, z.bar);
    ctx.fillStyle = dark ? '#fff' : '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fit(ctx, cap as string, 600, z.cap, 24, cw - 24, COND); ctx.fillText(cap as string, cx + cw / 2, y + z.bar / 2 + 2);
    if (im) ctx.drawImage(im as HTMLImageElement, cx + (cw - bw) / 2, y + z.bar, bw, bh);
    const h = d.heads[i]; if (!h) return;
    let yy = y + z.bar + bh + 24 + z.num * 0.85; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#111';
    fit(ctx, h[0], 600, z.num, 50, cw - 10); ctx.fillText(h[0], cx + cw / 2, yy);
    ctx.font = `400 ${z.desc}px ${SANS}`; ctx.fillStyle = '#333';
    lines(ctx, h[1], cw - 16).slice(0, z.descLines).forEach((l) => { yy += z.desc * 1.3; ctx.fillText(l, cx + cw / 2, yy); });
  });
  return landsH(bw, z);
}

async function draw(canvas: HTMLCanvasElement, d: CardData, name: string, port: boolean) {
  const [W, H] = SIZE[port ? 'port' : 'land'];
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  await Promise.all(['600 48px "IBM Plex Sans"', '400 40px "IBM Plex Sans"', '600 36px "IBM Plex Sans Condensed"'].map((f) => document.fonts.load(f).catch(() => null)));
  const [a, b, agri, eu, ukri] = await Promise.all([land(d.sceneA), land(d.sceneB), img('/patch/agri-dry.png'), img('/patch/eu-funded.png'), img('/patch/ukri-epsrc.png')]);
  const M = 80, who = name.trim(), date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const rows = ([[d.heading, d.claim, true], ['What I did', d.did, false], ['What I found', d.found, true], ['Why', d.why, false]] as Row[]).filter((r) => r[1].trim());
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);

  // header: what this card is
  const HEAD = port ? 236 : 200;
  ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, HEAD); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  if (port) {
    fit(ctx, 'I ran a model experiment with Patch', 600, 80, 56, W - 2 * M); ctx.fillText('I ran a model experiment with Patch', M, 118);
    ctx.font = `600 44px ${COND}`; ctx.fillText(d.kind, M, 188); const kw = ctx.measureText(d.kind).width + 30;
    fit(ctx, d.where, 500, 42, 28, W - 2 * M - kw, COND); ctx.fillText(d.where, M + kw, 188);
  } else {
    ctx.textBaseline = 'middle'; ctx.font = `600 80px ${SANS}`; ctx.fillText('I ran a model experiment with Patch', M, HEAD / 2 + 2);
    ctx.textAlign = 'right'; ctx.font = `600 46px ${COND}`; ctx.fillText(d.kind, W - M, HEAD / 2 - 28);
    fit(ctx, d.where, 500, 40, 28, 760, COND); ctx.fillText(d.where, W - M, HEAD / 2 + 30);
  }

  // footer: who made it possible, who did the experiment
  const FOOT = port ? 30 + 176 + 36 + (who ? 92 : 0) + 64 + 56 + 50 : 380;
  const fy = H - FOOT;
  ctx.fillStyle = '#111'; ctx.fillRect(M, fy, W - 2 * M, 6);
  const logos = (x: number, mid: number, ha: number, he: number) => {
    if (agri) { const w = (agri.width / agri.height) * ha; ctx.drawImage(agri, x, mid - ha / 2, w, ha); x += w + 60; }
    for (const lg of [eu, ukri]) if (lg) { const w = (lg.width / lg.height) * he; ctx.drawImage(lg, x, mid - he / 2, w, he); x += w + 56; }
    return x;
  };
  ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#111';
  if (port) {
    logos(M, fy + 36 + 88, 176, 104);
    let y = fy + 36 + 176 + 36;
    ctx.textAlign = 'left';
    if (who) { fit(ctx, who, 600, 76, 44, W - 2 * M); y += 76; ctx.fillText(who, M, y); y += 16; }
    ctx.font = `500 46px ${SANS}`; y += 52; ctx.fillText(date, M, y);
    ctx.textAlign = 'right'; ctx.font = `600 44px ${SANS}`; ctx.fillText('joshimudit.github.io/studio/patch', W - M, y);
    ctx.textAlign = 'left'; ctx.font = `400 40px ${SANS}`; ctx.fillStyle = '#333'; y += 58; ctx.fillText('Patch is a teaching aid from the AGRI-DRY network', M, y);
  } else {
    const mid = fy + FOOT / 2, x = logos(M, mid, 250, 132), right = W - M, room = right - x - 40;
    ctx.textAlign = 'right';
    let y = mid - (who ? 92 : 44);
    if (who) { fit(ctx, who, 600, 72, 32, room); ctx.fillText(who, right, y + 24); y += 84; }
    fit(ctx, date, 500, 44, 28, room); ctx.fillText(date, right, y + 16); y += 62;
    ctx.fillStyle = '#333'; fit(ctx, 'Patch is a teaching aid from the AGRI-DRY network', 400, 38, 26, room); ctx.fillText('Patch is a teaching aid from the AGRI-DRY network', right, y + 12); y += 54;
    ctx.fillStyle = '#111'; fit(ctx, 'joshimudit.github.io/studio/patch', 600, 40, 26, room); ctx.fillText('joshimudit.github.io/studio/patch', right, y + 12);
  }

  // body: the record and the two pieces of land. Use the largest type that fits.
  const top = HEAD + 60, bottom = fy - 50, ims = [a, b];
  if (port) {
    const maxW = W - 2 * M, lz: LandSizes = { cap: 46, bar: 76, num: 124, desc: 40, descLines: 2 };
    for (const k of [1.1, 1.05, 1, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7]) {
      const z: Sizes = { first: Math.round(78 * k), bold: Math.round(62 * k), plain: Math.round(58 * k), lab: Math.round(42 * k), gap: 30 * k };
      const q = layRows(ctx, rows.slice(0, 1), z, maxW, true), rest = layRows(ctx, rows.slice(1), z, maxW, false);
      const text = q.h + rest.h + (d.conclusion ? conclusionH(z) : 0), room = bottom - top - text - 40;
      const bw = Math.min(600, (room - landsH(0, lz)) / (520 / 640));
      if (bw < 400 && k > 0.7) continue;
      let y = drawRows(ctx, q.rows, z, M, top) + 10;
      y += drawLands(ctx, ims, d, M, y, maxW, Math.max(300, bw), lz) + 40;
      y = drawRows(ctx, rest.rows, z, M, y);
      if (d.conclusion) drawConclusion(ctx, d.conclusion, z, M, y);
      break;
    }
  } else {
    const RX = 1300, RW = W - M - RX, bw = (RW - 32) / 2, maxW = RX - 80 - M;
    drawLands(ctx, ims, d, RX, top, RW, bw, { cap: 40, bar: 66, num: 112, desc: 36, descLines: 3 });
    for (const k of [1.3, 1.2, 1.1, 1, 0.92, 0.85, 0.78, 0.72]) {
      const z: Sizes = { first: Math.round(62 * k), bold: Math.round(48 * k), plain: Math.round(44 * k), lab: Math.round(34 * k), gap: 30 * k };
      const r = layRows(ctx, rows, z, maxW, true);
      if (r.h + (d.conclusion ? conclusionH(z) : 0) > bottom - top && k > 0.72) continue;
      const y = drawRows(ctx, r.rows, z, M, top);
      if (d.conclusion) drawConclusion(ctx, d.conclusion, z, M, y);
      break;
    }
  }
  ctx.lineWidth = 8; ctx.strokeStyle = '#111'; ctx.strokeRect(4, 4, W - 8, H - 8);
}

export function openCard(d: CardData) {
  const dlg = document.querySelector<HTMLDialogElement>('dialog.card')!, canvas = dlg.querySelector('canvas')!, nameIn = dlg.querySelector<HTMLInputElement>('input[type=text]')!, said = dlg.querySelector<HTMLElement>('.said')!;
  const q = (s: string) => dlg.querySelector<HTMLButtonElement>(s)!;
  const port = wantsPortrait();
  dlg.classList.toggle('port', port);
  try { nameIn.value = localStorage.getItem('patch-name') ?? ''; } catch { /* storage may be off */ }
  const redraw = () => draw(canvas, d, nameIn.value, port);
  const blob = () => new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  const text = `I ran a model experiment with Patch, a teaching aid for process-based ecosystem models. ${d.heading}: ${d.claim} ${d.found}`;
  said.textContent = '';
  nameIn.oninput = () => { try { localStorage.setItem('patch-name', nameIn.value); } catch { /* ignore */ } redraw(); };
  q('.dl').onclick = async () => { const b = await blob(); if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'patch-experiment.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); said.textContent = 'Image saved.'; };
  const share = q('.sh');
  share.hidden = !navigator.canShare;
  share.onclick = async () => {
    const b = await blob(); if (!b) return;
    const file = new File([b], 'patch-experiment.png', { type: 'image/png' });
    try { await navigator.share(navigator.canShare?.({ files: [file] }) ? { files: [file], title: 'Patch experiment', text, url: d.url } : { title: 'Patch experiment', text, url: d.url }); } catch { /* closed by the person */ }
  };
  q('.li').onclick = () => { window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(d.url), '_blank', 'noopener'); said.textContent = 'LinkedIn opens with the link to your experiment. Save the image and add it to the post.'; };
  q('.cp').onclick = async () => { try { await navigator.clipboard.writeText(d.url); said.textContent = 'Link copied. It reopens this experiment.'; } catch { said.textContent = d.url; } };
  q('.close').onclick = () => dlg.close();
  redraw();
  if (!dlg.open) dlg.showModal();
}
