// The result card: a record of one experiment, drawn on a canvas so it can be saved as an image and shared.
import { blockSvg, BLOCK_VIEW, type Scene } from './block';

export interface CardData { kind: string; where: string; heading: string; claim: string; did: string; found: string; why: string; conclusion: string; scene: Scene; url: string }

const W = 2400, H = 1254, SANS = '"IBM Plex Sans", system-ui, sans-serif', COND = '"IBM Plex Sans Condensed", "IBM Plex Sans", system-ui, sans-serif';
const img = (src: string) => new Promise<HTMLImageElement | null>((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });

function lines(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const out: string[] = []; let cur = '';
  for (const w of text.split(/\s+/)) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; }
  if (cur) out.push(cur);
  return out;
}

async function draw(canvas: HTMLCanvasElement, d: CardData, name: string) {
  const ctx = canvas.getContext('2d')!;
  await Promise.all(['600 48px "IBM Plex Sans"', '400 40px "IBM Plex Sans"', '600 36px "IBM Plex Sans Condensed"'].map((f) => document.fonts.load(f).catch(() => null)));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${BLOCK_VIEW}" width="1280" height="1040"><style>text{font-family:Arial,Helvetica,sans-serif}</style>${blockSvg(d.scene)}</svg>`;
  const [scene, agri, eu, ukri] = await Promise.all([img('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)), img('/patch/agri-dry.png'), img('/patch/eu-funded.png'), img('/patch/ukri-epsrc.png')]);

  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  // header
  ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, 124);
  ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle';
  ctx.font = `600 50px ${SANS}`; ctx.textAlign = 'left'; ctx.fillText('I ran a model experiment with Patch', 64, 64);
  ctx.font = `600 36px ${COND}`; ctx.textAlign = 'right'; ctx.fillText(`${d.kind} · ${d.where}`, W - 64, 64);
  // the landscape
  const bx = 1690, bw = 660, bh = (bw * 520) / 640;
  if (scene) ctx.drawImage(scene, bx, 200, bw, bh);
  // the record: label on the left, text on the right; shrink the type until it fits
  const rows: [string, string, boolean][] = [[d.heading, d.claim, true], ['What I did', d.did, false], ['What I found', d.found, true], ['Why', d.why, false]];
  const X0 = 64, X1 = 370, maxW = bx - X1 - 50, top = 186, bottom = H - 236;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  for (const k of [1, 0.92, 0.85, 0.78, 0.72]) {
    const size = (big: boolean, first: boolean) => Math.round((first ? 54 : big ? 42 : 40) * k);
    const lay = rows.map(([lab, text, bold], i) => { ctx.font = `${bold ? 600 : 400} ${size(bold, i === 0)}px ${SANS}`; return { lab, bold, px: size(bold, i === 0), ls: lines(ctx, text, maxW) }; });
    const gap = 34 * k, total = lay.reduce((a, r) => a + r.ls.length * r.px * 1.28 + gap, 0) + (d.conclusion ? 84 * k : 0);
    if (total > bottom - top && k > 0.72) continue;
    let y = top;
    for (const r of lay) {
      ctx.font = `600 ${Math.round(36 * k)}px ${COND}`; ctx.fillStyle = '#4a4a4a'; ctx.fillText(r.lab, X0, y + r.px);
      ctx.font = `${r.bold ? 600 : 400} ${r.px}px ${SANS}`; ctx.fillStyle = '#111';
      for (const l of r.ls) { y += r.px * 1.28; ctx.fillText(l, X1, y - r.px * 0.28); }
      y += gap;
    }
    if (d.conclusion) {
      ctx.font = `600 ${Math.round(36 * k)}px ${COND}`; ctx.fillStyle = '#4a4a4a'; ctx.fillText('Conclusion', X0, y + 46 * k);
      ctx.font = `600 ${Math.round(42 * k)}px ${SANS}`; const tw = ctx.measureText(d.conclusion).width;
      ctx.lineWidth = 4; ctx.strokeStyle = '#111'; ctx.strokeRect(X1, y, tw + 44, 70 * k);
      ctx.fillStyle = '#111'; ctx.fillText(d.conclusion, X1 + 22, y + 49 * k);
      ctx.font = `400 ${Math.round(40 * k)}px ${SANS}`; ctx.fillText('in this model', X1 + tw + 66, y + 49 * k);
    }
    break;
  }
  // footer: who paid for it, who did it
  ctx.fillStyle = '#111'; ctx.fillRect(64, H - 212, W - 128, 2);
  let x = 64; const fy = H - 190;
  if (agri) { const h = 164, w = (agri.width / agri.height) * h; ctx.drawImage(agri, x, fy, w, h); x += w + 44; }
  for (const lg of [eu, ukri]) if (lg) { const h = 96, w = (lg.width / lg.height) * h; ctx.drawImage(lg, x, fy + 34, w, h); x += w + 36; }
  ctx.textAlign = 'right'; ctx.fillStyle = '#111';
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  ctx.font = `600 38px ${SANS}`; ctx.fillText(name.trim() ? `${name.trim()} · ${date}` : date, W - 64, fy + 58);
  ctx.font = `400 32px ${SANS}`; ctx.fillStyle = '#4a4a4a';
  ctx.fillText('Patch is a teaching model from the AGRI-DRY doctoral network.', W - 64, fy + 106);
  ctx.fillText('Run your own experiment: joshimudit.github.io/lab/patch', W - 64, fy + 150);
  ctx.lineWidth = 6; ctx.strokeStyle = '#111'; ctx.strokeRect(3, 3, W - 6, H - 6);
}

export function openCard(d: CardData) {
  const dlg = document.querySelector<HTMLDialogElement>('dialog.card')!, canvas = dlg.querySelector('canvas')!, nameIn = dlg.querySelector<HTMLInputElement>('input[type=text]')!, said = dlg.querySelector<HTMLElement>('.said')!;
  const q = (s: string) => dlg.querySelector<HTMLButtonElement>(s)!;
  canvas.width = W; canvas.height = H;
  try { nameIn.value = localStorage.getItem('patch-name') ?? ''; } catch { /* storage may be off */ }
  const redraw = () => draw(canvas, d, nameIn.value);
  const blob = () => new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  const text = `I ran a model experiment with Patch. ${d.heading}: ${d.claim} ${d.found}`;
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
  q('.cp').onclick = async () => { try { await navigator.clipboard.writeText(d.url); said.textContent = 'Link copied. It reopens this exact experiment.'; } catch { said.textContent = d.url; } };
  q('.close').onclick = () => dlg.close();
  redraw();
  if (!dlg.open) dlg.showModal();
}
