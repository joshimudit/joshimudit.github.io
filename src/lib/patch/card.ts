// The result card: a record of one experiment, drawn on a canvas so it can be saved as an image and shared.
import { blockSvg, BLOCK_VIEW, type Scene } from './block';

export interface CardData {
  kind: string; where: string; heading: string; claim: string; did: string; found: string; why: string; conclusion: string;
  sceneA: Scene; capA: string; sceneB: Scene; capB: string; heads: [string, string][]; url: string;
}

const W = 2400, H = 1350, SANS = '"IBM Plex Sans", system-ui, sans-serif', COND = '"IBM Plex Sans Condensed", "IBM Plex Sans", system-ui, sans-serif';
const img = (src: string) => new Promise<HTMLImageElement | null>((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
const land = (s: Scene) => img('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${BLOCK_VIEW}" width="1280" height="1040">${blockSvg(s)}</svg>`));

function lines(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const out: string[] = []; let cur = '';
  for (const w of text.split(/\s+/)) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; }
  if (cur) out.push(cur);
  return out;
}

async function draw(canvas: HTMLCanvasElement, d: CardData, name: string) {
  const ctx = canvas.getContext('2d')!;
  await Promise.all(['600 48px "IBM Plex Sans"', '400 40px "IBM Plex Sans"', '600 36px "IBM Plex Sans Condensed"'].map((f) => document.fonts.load(f).catch(() => null)));
  const [a, b, agri, eu, ukri] = await Promise.all([land(d.sceneA), land(d.sceneB), img('/patch/agri-dry.png'), img('/patch/eu-funded.png'), img('/patch/ukri-epsrc.png')]);
  const M = 72, HEAD = 176, FOOT = 316, BODY0 = HEAD + 54, BODY1 = H - FOOT - 40;

  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  // header: what this card is
  ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, HEAD);
  ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.font = `600 72px ${SANS}`; ctx.fillText('I ran a model experiment with Patch', M, HEAD / 2 + 2);
  ctx.textAlign = 'right'; ctx.font = `600 42px ${COND}`; ctx.fillText(d.kind, W - M, HEAD / 2 - 26);
  ctx.font = `500 36px ${COND}`; ctx.fillText(d.where, W - M, HEAD / 2 + 28);

  // right: the two pieces of land, and the two headline numbers under them
  const RX = 1330, RW = W - M - RX, bw = (RW - 28) / 2, bh = (bw * 520) / 640;
  ([[a, d.capA, false], [b, d.capB, true]] as [HTMLImageElement | null, string, boolean][]).forEach(([im, cap, dark], i) => {
    const x = RX + i * (bw + 28);
    ctx.fillStyle = dark ? '#111' : '#e6e6e6'; ctx.fillRect(x, BODY0, bw, 62);
    ctx.fillStyle = dark ? '#fff' : '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let px = 36; ctx.font = `600 ${px}px ${COND}`; while (ctx.measureText(cap).width > bw - 24 && px > 24) ctx.font = `600 ${--px}px ${COND}`;
    ctx.fillText(cap, x + bw / 2, BODY0 + 32);
    if (im) ctx.drawImage(im, x, BODY0 + 62, bw, bh);
    const h = d.heads[i]; if (!h) return;
    const hy = BODY0 + 62 + bh + 26; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#111';
    px = 104; ctx.font = `600 ${px}px ${SANS}`; while (ctx.measureText(h[0]).width > bw - 10 && px > 60) ctx.font = `600 ${--px}px ${SANS}`;
    ctx.fillText(h[0], x + bw / 2, hy + 96);
    ctx.font = `400 33px ${SANS}`; ctx.fillStyle = '#333';
    lines(ctx, h[1], bw - 20).slice(0, 3).forEach((l, k) => ctx.fillText(l, x + bw / 2, hy + 150 + k * 42));
  });

  // left: the record. Use the largest type that fits.
  const rows = ([[d.heading, d.claim, true], ['What I did', d.did, false], ['What I found', d.found, true], ['Why', d.why, false]] as [string, string, boolean][]).filter((r) => r[1].trim());
  const X0 = M, maxW = RX - 70 - X0;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  for (const k of [1.2, 1.1, 1, 0.92, 0.85, 0.78, 0.72, 0.66]) {
    const size = (bold: boolean, first: boolean) => Math.round((first ? 60 : bold ? 46 : 42) * k), lab = Math.round(34 * k), gap = 30 * k;
    const lay = rows.map(([label, text, bold], i) => { const px = size(bold, i === 0); ctx.font = `${bold ? 600 : 400} ${px}px ${SANS}`; return { label, bold, px, ls: lines(ctx, text, maxW) }; });
    const total = lay.reduce((s, r) => s + lab * 1.35 + r.ls.length * r.px * 1.24 + gap, 0) + (d.conclusion ? 92 * k : -gap);
    if (total > BODY1 - BODY0 && k > 0.66) continue;
    let y = BODY0;
    for (const r of lay) {
      ctx.font = `600 ${lab}px ${COND}`; ctx.fillStyle = '#555'; y += lab * 1.35; ctx.fillText(r.label, X0, y - lab * 0.35);
      ctx.font = `${r.bold ? 600 : 400} ${r.px}px ${SANS}`; ctx.fillStyle = '#111';
      for (const l of r.ls) { y += r.px * 1.24; ctx.fillText(l, X0, y - r.px * 0.26); }
      y += gap;
    }
    if (d.conclusion) {
      const px = Math.round(46 * k); ctx.font = `600 ${px}px ${SANS}`; const tw = ctx.measureText(d.conclusion).width, bhh = px * 1.75;
      ctx.fillStyle = '#111'; ctx.fillRect(X0, y, tw + 56, bhh);
      ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(d.conclusion, X0 + 28, y + bhh / 2 + 2);
      ctx.fillStyle = '#111'; ctx.font = `400 ${Math.round(40 * k)}px ${SANS}`; ctx.fillText('in this model', X0 + tw + 80, y + bhh / 2 + 2); ctx.textBaseline = 'alphabetic';
    }
    break;
  }

  // footer: who made it possible, who did the experiment
  const fy = H - FOOT;
  ctx.fillStyle = '#111'; ctx.fillRect(M, fy, W - 2 * M, 5);
  let x = M; const mid = fy + FOOT / 2 - 2;
  if (agri) { const h = 248, w = (agri.width / agri.height) * h; ctx.drawImage(agri, x, mid - h / 2, w, h); x += w + 56; }
  for (const lg of [eu, ukri]) if (lg) { const h = 138, w = (lg.width / lg.height) * h; ctx.drawImage(lg, x, mid - h / 2, w, h); x += w + 52; }
  ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#111';
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), who = name.trim();
  const right = W - M, room = right - x - 20;
  let y = mid - (who ? 78 : 40);
  if (who) { let px = 68; ctx.font = `600 ${px}px ${SANS}`; while (ctx.measureText(who).width > room && px > 40) ctx.font = `600 ${--px}px ${SANS}`; ctx.fillText(who, right, y + 20); y += 76; }
  ctx.font = `500 40px ${SANS}`; ctx.fillText(date, right, y + 14); y += 58;
  ctx.font = `400 34px ${SANS}`; ctx.fillStyle = '#333'; ctx.fillText('Patch is a teaching aid from the AGRI-DRY network', right, y + 12); y += 50;
  ctx.font = `600 36px ${SANS}`; ctx.fillStyle = '#111'; ctx.fillText('joshimudit.github.io/studio/patch', right, y + 12);
  ctx.lineWidth = 8; ctx.strokeStyle = '#111'; ctx.strokeRect(4, 4, W - 8, H - 8);
}

export function openCard(d: CardData) {
  const dlg = document.querySelector<HTMLDialogElement>('dialog.card')!, canvas = dlg.querySelector('canvas')!, nameIn = dlg.querySelector<HTMLInputElement>('input[type=text]')!, said = dlg.querySelector<HTMLElement>('.said')!;
  const q = (s: string) => dlg.querySelector<HTMLButtonElement>(s)!;
  canvas.width = W; canvas.height = H;
  try { nameIn.value = localStorage.getItem('patch-name') ?? ''; } catch { /* storage may be off */ }
  const redraw = () => draw(canvas, d, nameIn.value);
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
