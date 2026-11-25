// The simulator screen, laid out like the En-ROADS climate simulator: two graphs you can choose,
// one headline number, grouped sliders with a "today" mark, a short guided tour, and a link to share.
import { C, BASE, type Scen, type Result, type DayOut } from './model';
import { type Site } from './sites';
import { $, $$, clamp, pct, signed, MONTHS, monthOfDay, PLACES, place, run, drawScene, playDays, events, type Player } from './ui';

const small = () => window.matchMedia('(max-width: 599px)').matches;

type Land = 'natural' | 'crop';
type GraphId = 'pic' | 'lai' | 'water' | 'sugar' | 'cover' | 'all' | 'nums';
const GRAPHS: { id: GraphId; name: string }[] = [
  { id: 'pic', name: 'Picture of the patch' },
  { id: 'lai', name: 'Leaves through the year' },
  { id: 'water', name: 'Water in the soil through the year' },
  { id: 'sugar', name: 'Sugar made through the year' },
  { id: 'cover', name: 'What covers the ground' },
  { id: 'all', name: 'All six places side by side' },
  { id: 'nums', name: 'The numbers' },
];
const MD = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const rel = (a: number, b: number) => (a > 0 ? (b / a - 1) * 100 : 0);
const chg = (a: number, b: number) => (Math.abs(rel(a, b)) < 0.5 ? 'no change' : signed(rel(a, b)));
const grassOf = (r: Result) => Math.min(1 - r.mean.tree, r.mean.grass);

export function simulator() {
  const root = $('#sim'); if (!root) return;
  const knob = (k: string) => $<HTMLInputElement>(`input[data-k="${k}"]`, root);
  const go = $<HTMLButtonElement>('.go', root), cap = $('.caption', root), share = $<HTMLButtonElement>('.share', root), shared = $('.shared', root), reset = $<HTMLButtonElement>('.reset', root);
  let site: Site = place('niamey'), land: Land = 'natural', graphs: GraphId[] = ['pic', 'lai'];
  let res: Result, base: Result, ev: ReturnType<typeof events>, player: Player | null = null, played = false;
  let frames: ((d: number) => void)[] = [];

  const scen = (): Scen => ({ dT: +knob('dT').value, rain: 1 + +knob('rain').value / 100, co2: +knob('co2').value, variety: 1 + +knob('variety').value / 100, sow: +knob('sow').value });
  const isBase = (s: Scen) => s.dT === 0 && s.rain === 1 && s.co2 === C.co2ref && (land !== 'crop' || (s.variety === 1 && s.sow === 0));
  const setScen = (s: Partial<Scen>) => { knob('dT').value = String(s.dT ?? 0); knob('rain').value = String(Math.round(((s.rain ?? 1) - 1) * 100)); knob('co2').value = String(s.co2 ?? C.co2ref); knob('variety').value = String(Math.round(((s.variety ?? 1) - 1) * 100)); knob('sow').value = String(s.sow ?? 0); };
  const setLand = (l: Land) => { land = l; $$('[data-land] button', root).forEach((x) => x.classList.toggle('on', (x as HTMLElement).dataset.v === l)); };
  const restDay = () => (land === 'crop' ? (res.sowDay + 55) % 365 : res.daily.reduce((b, d, i) => (d.caught > res.daily[b].caught ? i : b), 0));

  // ── graphs ──
  const smooth = (D: DayOut[], f: (d: DayOut) => number) => D.map((_, i) => { let s = 0, n = 0; for (let k = Math.max(0, i - 4); k <= Math.min(364, i + 4); k++) { s += f(D[k]); n++; } return s / n; });
  function lineGraph(body: HTMLElement, f: (d: DayOut) => number, unit: string, fixedMax?: number) {
    const a = smooth(base.daily, f), b = smooth(res.daily, f), top = fixedMax ?? Math.max(1, ...a, ...b) * 1.12, same = isBase(scen());
    const X = (d: number) => 34 + (d / 364) * 318, Y = (v: number) => 190 - (v / top) * 160, n = (v: number) => (top >= 20 ? v.toFixed(0) : v.toFixed(1));
    let h = '';
    for (let k = 0; k <= 4; k++) { const v = (top * k) / 4; h += `<line class="grid" x1="34" x2="352" y1="${Y(v)}" y2="${Y(v)}"/><text class="lab" x="30" y="${Y(v) + 4}" text-anchor="end">${n(v)}</text>`; }
    let acc = 0; MD.forEach((m, i) => { h += `<text class="lab" x="${X(acc + m / 2)}" y="206" text-anchor="middle">${MONTHS[i][0]}</text>`; acc += m; });
    const path = (v: number[]) => v.map((y, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(y).toFixed(1)}`).join('');
    h += `<path class="lb" d="${path(a)}"/>${same ? '' : `<path class="lc" d="${path(b)}"/>`}<line class="head" x1="-9" x2="-9" y1="30" y2="190"/><circle class="hb" r="4.5" cx="-9" cy="0"/>${same ? '' : '<circle class="hc" r="4.5" cx="-9" cy="0"/>'}<text class="lab" x="4" y="11">${unit}</text><text class="read" x="352" y="11" text-anchor="end"></text><rect class="hit" x="34" y="14" width="318" height="196"/>`;
    body.innerHTML = `<svg class="line" viewBox="0 0 360 212" role="img" aria-label="${unit}, day by day through the year${same ? '' : ', today and in your world'}">${h}</svg><p class="legend"><span class="lg b">Today</span>${same ? '' : '<span class="lg c">Your world</span>'}</p>`;
    const svg = $<SVGSVGElement>('svg', body), head = $('.head', body), hb = $('.hb', body), hc = body.querySelector('.hc'), read = $('.read', body);
    const at = (e: PointerEvent) => { const r = svg.getBoundingClientRect(); scrub(Math.round(clamp(((e.clientX - r.left) / r.width * 360 - 34) / 318) * 364)); };
    svg.addEventListener('pointerdown', (e) => { svg.setPointerCapture(e.pointerId); at(e); });
    svg.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || e.buttons) at(e); });
    return (d: number) => {
      head.setAttribute('x1', String(X(d))); head.setAttribute('x2', String(X(d)));
      hb.setAttribute('cx', String(X(d))); hb.setAttribute('cy', String(Y(a[d]))); hc?.setAttribute('cx', String(X(d))); hc?.setAttribute('cy', String(Y(b[d])));
      read.textContent = `${MONTHS[monthOfDay(d)].slice(0, 3)}: ${n(a[d])}${same ? '' : ' → ' + n(b[d])}`;
    };
  }
  function render() {
    frames = [];
    $$<HTMLElement>('.panel', root).forEach((p, i) => {
      const body = $('.pbody', p), g = graphs[i]; ($('select', p) as HTMLSelectElement).value = g;
      if (g === 'pic') {
        body.innerHTML = `<svg class="scene" viewBox="0 0 360 250" role="img" aria-label="The patch seen from the side: sky, plants, and water in two layers of soil"></svg>`;
        const svg = $<SVGSVGElement>('svg', body);
        frames.push((d) => { const x = res.daily[d]; drawScene(svg, { d: x, maxTree: res.mean.tree, maxGrass: land === 'crop' ? 1 : res.mean.grass, crop: land === 'crop', label: `${MONTHS[monthOfDay(d)]} · ${Math.round(x.T)} °C` }); });
      } else if (g === 'lai') frames.push(lineGraph(body, (d) => d.laiTree + d.laiGrass, 'layers of leaves'));
      else if (g === 'water') frames.push(lineGraph(body, (d) => d.w1 * 100, 'top soil, % full', 100));
      else if (g === 'sugar') frames.push(lineGraph(body, (d) => d.gpp, 'grams of sugar made per day'));
      else if (g === 'cover') {
        const bar = (r: Result, name: string) => land === 'crop' ? '' : `<p class="cv"><span>${name}</span><span class="stack"><i class="t" style="width:${r.mean.tree * 100}%"></i><i class="g" style="width:${grassOf(r) * 100}%"></i></span><span class="cvn">${pct(r.mean.tree)} trees, ${pct(grassOf(r))} grass</span></p>`;
        body.innerHTML = land === 'crop' ? `<p class="empty">A field is all crop. Switch to wild plants to see trees and grass share the ground.</p>` : bar(base, 'Today') + bar(res, 'Your world') + `<ul class="key"><li><span class="k ct"></span>trees</li><li><span class="k cg"></span>grass</li><li><span class="k cb"></span>bare ground</li></ul>`;
      } else if (g === 'all' && land === 'crop') {
        const s = scen(), n = PLACES.length, cw = 360 / n, top = 22, H = 140, rs = PLACES.map((pl) => [run(pl, BASE, 'crop'), run(pl, s, 'crop')]), mx = Math.max(1, ...rs.flat().map((r) => r.mean.yield)) * 1.05; let h = '';
        PLACES.forEach((pl, k) => {
          const [b, r] = rs[k], x = k * cw + 9, w = cw - 18, y = top + H * (1 - r.mean.yield / mx), yb = top + H * (1 - b.mean.yield / mx);
          h += `<rect class="cBare" x="${x}" y="${top}" width="${w}" height="${H}"/><rect class="cCrop" x="${x}" y="${y}" width="${w}" height="${top + H - y}"/><line class="was" x1="${x - 3}" x2="${x + w + 3}" y1="${yb}" y2="${yb}"/>`;
          if (pl === site) h += `<rect class="pick" x="${x - 5}" y="${top - 5}" width="${w + 10}" height="${H + 10}"/>`;
          h += `<text class="lab" x="${x + w / 2}" y="${Math.min(y, yb) - 6}" text-anchor="middle">${r.mean.yield.toFixed(1)}</text><text class="lab" x="${x + w / 2}" y="${top + H + 17}" text-anchor="middle">${pl.name.split(' ')[0]}</text><text class="lab dim" x="${x + w / 2}" y="${top + H + 31}" text-anchor="middle">${r.types[0]}</text>`;
        });
        body.innerHTML = `<svg class="cells" viewBox="0 0 360 200" role="img" aria-label="Grain harvested in six places, in tonnes per hectare">${h}</svg><ul class="key"><li><span class="k cc"></span>grain, tonnes per hectare</li><li><span class="k wask"></span>today</li></ul>`;
        $('svg', body).addEventListener('click', (e) => { const r = (e.currentTarget as Element).getBoundingClientRect(); site = PLACES[clamp(Math.floor((((e as MouseEvent).clientX - r.left) / r.width) * n), 0, n - 1)]; update(); });
      } else if (g === 'all') {
        const s = scen(), n = PLACES.length, cw = 360 / n, top = 10, H = 152; let h = '';
        PLACES.forEach((pl, k) => {
          const r = run(pl, s), b = run(pl, BASE), t = r.mean.tree, gr = grassOf(r), x = k * cw + 7, w = cw - 14;
          h += `<rect class="cBare" x="${x}" y="${top}" width="${w}" height="${H}"/><rect class="cGrass" x="${x}" y="${top + H * (1 - t - gr)}" width="${w}" height="${H * gr}"/><rect class="cTree" x="${x}" y="${top + H * (1 - t)}" width="${w}" height="${H * t}"/>`;
          if (Math.abs(b.mean.tree - t) > 0.02) h += `<line class="was" x1="${x - 3}" x2="${x + w + 3}" y1="${top + H * (1 - b.mean.tree)}" y2="${top + H * (1 - b.mean.tree)}"/>`;
          if (pl === site) h += `<rect class="pick" x="${x - 4}" y="${top - 4}" width="${w + 8}" height="${H + 8}"/>`;
          h += `<text class="lab" x="${x + w / 2}" y="${top + H + 17}" text-anchor="middle">${pl.name.split(' ')[0]}</text><text class="lab dim" x="${x + w / 2}" y="${top + H + 31}" text-anchor="middle">${Math.round(r.mean.rain)} mm</text>`;
        });
        body.innerHTML = `<svg class="cells" viewBox="0 0 360 200" role="img" aria-label="Six places as columns, each split into bare ground, grass and trees">${h}</svg><ul class="key"><li><span class="k ct"></span>trees</li><li><span class="k cg"></span>grass</li><li><span class="k cb"></span>bare</li><li><span class="k wask"></span>trees today</li><li>mm: rain in a year</li></ul>`;
        $('svg', body).addEventListener('click', (e) => { const r = (e.currentTarget as Element).getBoundingClientRect(); site = PLACES[clamp(Math.floor((((e as MouseEvent).clientX - r.left) / r.width) * n), 0, n - 1)]; setLand('natural'); update(); });
      } else {
        const m0 = base.mean, m1 = res.mean, same = isBase(scen());
        const row = (nm: string, a: string, b: string, c: string) => `<tr><th scope="row">${nm}</th><td>${a}</td><td>${b}</td><td class="chg">${same ? '' : c}</td></tr>`;
        body.innerHTML = `<table><thead><tr><th></th><th>today</th><th>your world</th><th></th></tr></thead><tbody>${land === 'crop'
          ? row('Grain harvested, t/ha', m0.yield.toFixed(1), m1.yield.toFixed(1), chg(m0.yield, m1.yield)) + row('Days from sowing to harvest', m0.season.toFixed(0), m1.season.toFixed(0), signed(m1.season - m0.season, ' days')) + row('Water brake, 1 = never thirsty', m0.brake.toFixed(2), m1.brake.toFixed(2), '') + row('Rain drunk by the crop, mm', m0.transp.toFixed(0), m1.transp.toFixed(0), chg(m0.transp, m1.transp))
          : row('Plant growth, g a year', m0.npp.toFixed(0), m1.npp.toFixed(0), chg(m0.npp, m1.npp)) + row('Ground shaded by trees', pct(m0.tree), pct(m1.tree), '') + row('Ground shaded by grass', pct(grassOf(base)), pct(grassOf(res)), '') + row('Carbon in plants, kg', (m0.vegC / 1000).toFixed(1), (m1.vegC / 1000).toFixed(1), chg(m0.vegC, m1.vegC)) + row('Carbon in soil, kg', (m0.soilC / 1000).toFixed(1), (m1.soilC / 1000).toFixed(1), chg(m0.soilC, m1.soilC)) + row('Rain drunk by plants, mm', m0.transp.toFixed(0), m1.transp.toFixed(0), chg(m0.transp, m1.transp))}</tbody></table><p class="small">Per square metre of ground, averaged over 40 years.</p>`;
      }
    });
  }
  const frame = (d: number) => {
    frames.forEach((f) => f(d));
    let t = ev[0].text; for (const e of ev) if (e.day <= d) t = e.text;
    cap.textContent = player?.running ? t : idle;
  };
  let idle = '';
  const scrub = (d: number) => { if (player?.running) { player.stop(); go.textContent = 'Play a year'; } frame(d); };

  const sync: (() => void)[] = [];
  const labels = () => {
    sync.forEach((f) => f());
    const s = scen(), o = (k: string, t: string) => ($(`[data-o="${k}"]`, root).textContent = t);
    o('dT', s.dT === 0 ? 'as today' : `+${s.dT.toFixed(1)} °C`); o('rain', s.rain === 1 ? 'as today' : signed((s.rain - 1) * 100)); o('co2', s.co2 === C.co2ref ? 'as today' : s.co2 + ' ppm');
    o('variety', s.variety === 1 ? 'the usual one' : s.variety! > 1 ? 'slower to ripen' : 'faster to ripen'); o('sow', s.sow === 0 ? 'the usual day' : `${Math.abs(s.sow!)} days ${s.sow! < 0 ? 'earlier' : 'later'}`);
    $$('.croponly', root).forEach((e) => (e.hidden = land !== 'crop'));
  };
  const hash = () => { const s = scen(); return `#p=${site.id}&l=${land}&t=${s.dT}&r=${Math.round((s.rain - 1) * 100)}&c=${s.co2}&v=${Math.round((s.variety! - 1) * 100)}&s=${s.sow}&g=${graphs.join(',')}`; };

  function update() {
    player?.stop(); go.textContent = 'Play a year';
    labels();
    const s = scen(), crop = land === 'crop', same = isBase(s);
    base = run(site, BASE, land); res = run(site, s, land); ev = events(res, crop);
    const m0 = base.mean, m1 = res.mean;
    const meanT = site.T.reduce((a, b) => a + b, 0) / 12 + s.dT;
    idle = crop ? `A field of ${res.types[0]} near ${site.name}, ${site.country}. Sown in ${MONTHS[monthOfDay(res.sowDay)]}, cut after ${m1.season.toFixed(0)} days.` : `${site.name}, ${site.country}: ${site.blurb}. ${Math.round(m1.rain)} mm of rain a year, ${String(Math.round(meanT)).replace("-", "−")} °C on average.`;
    reset.disabled = same;
    $('.hl b', root).textContent = same ? '±0%' : chg(crop ? m0.yield : m0.npp, crop ? m1.yield : m1.npp).replace('no change', '±0%');
    $('.hl span', root).textContent = `${crop ? 'grain harvested' : 'plant growth'}, compared with today`;
    $('.hl2', root).innerHTML = same ? 'Nothing is changed yet. Move a slider.' : crop ? `<span>Harvest: <b>${m0.yield.toFixed(1)}</b> → <b>${m1.yield.toFixed(1)}</b> t/ha</span><span>Days to harvest: <b>${m0.season.toFixed(0)}</b> → <b>${m1.season.toFixed(0)}</b></span>` : `<span>Trees: <b>${pct(m0.tree)}</b> → <b>${pct(m1.tree)}</b> of the ground</span><span>Grass: <b>${pct(grassOf(base))}</b> → <b>${pct(grassOf(res))}</b></span>`;
    $$('.places button', root).forEach((b) => b.classList.toggle('on', (b as HTMLElement).dataset.id === site.id));
    render(); frame(restDay());
    try { history.replaceState(null, '', hash()); } catch {}
    shared.textContent = ''; shared.hidden = true;
    tourCheck();
  }

  // ── controls ──
  let t = 0;
  $$<HTMLInputElement>('input[type=range]', root).forEach((k) => {
    const tr = k.parentElement!, fr = (v: number) => (v - +k.min) / (+k.max - +k.min); tr.style.setProperty('--p', String(fr(+k.dataset.base!))); tr.classList.toggle('edge', fr(+k.dataset.base!) < 0.04); sync.push(() => tr.style.setProperty('--v', String(fr(+k.value))));
    k.addEventListener('input', () => { labels(); clearTimeout(t); t = window.setTimeout(update, 140); }); k.addEventListener('change', () => { clearTimeout(t); update(); });
  });
  const chips = $('.places', root);
  PLACES.forEach((p) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.id = p.id; b.innerHTML = `${p.name}<small>${p.blurb}</small>`; b.addEventListener('click', () => { site = p; update(); }); chips.appendChild(b); });
  $$<HTMLButtonElement>('[data-land] button', root).forEach((b) => b.addEventListener('click', () => { setLand(b.dataset.v as Land); update(); }));
  $$<HTMLElement>('.panel', root).forEach((p, i) => { const sel = $<HTMLSelectElement>('select', p); GRAPHS.forEach((g) => sel.add(new Option(g.name, g.id))); sel.addEventListener('change', () => { graphs[i] = sel.value as GraphId; update(); }); });
  reset.addEventListener('click', () => { setScen({}); update(); });
  go.addEventListener('click', () => {
    if (player?.running) { player.stop(); go.textContent = 'Play a year'; frame(restDay()); return; }
    go.textContent = 'Stop'; played = true;
    player = playDays(33, frame, () => { go.textContent = 'Play it again'; frame(restDay()); tourCheck(); });
  });
  share.addEventListener('click', async () => {
    const url = location.origin + location.pathname + hash(), s = scen(), crop = land === 'crop', say = (t: string) => { shared.textContent = t; shared.hidden = false; };
    const what = [s.dT ? `+${s.dT} °C` : '', s.rain !== 1 ? `rain ${signed((s.rain - 1) * 100)}` : '', s.co2 !== C.co2ref ? `CO₂ at ${s.co2}` : ''].filter(Boolean).join(', ');
    const text = isBase(s) ? `Patch: a small model of plants, set near ${site.name}.` : `Patch, near ${site.name} with ${what || 'different farming'}: ${crop ? 'grain' : 'plant growth'} ${chg(crop ? base.mean.yield : base.mean.npp, crop ? res.mean.yield : res.mean.npp)}.`;
    if (small() && navigator.share) { try { await navigator.share({ title: 'Patch', text, url }); } catch {} return; }
    try { await navigator.clipboard.writeText(url); say('Link copied. Whoever opens it sees this exact experiment.'); } catch { say(url); }
  });
  $$<HTMLButtonElement>('.info', root).forEach((b) => b.addEventListener('click', () => {
    const all = document.getElementById('d-rules') as HTMLDetailsElement | null, d = document.getElementById(b.dataset.open!) as HTMLDetailsElement | null;
    if (all) all.open = true; if (d) { d.open = true; d.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
  }));
  $$<HTMLButtonElement>('.setq').forEach((b) => b.addEventListener('click', () => {
    site = place(b.dataset.site!) ?? site; setLand((b.dataset.land as Land) ?? 'natural'); setScen(JSON.parse(b.dataset.scen || '{}'));
    if (b.dataset.graphs) graphs = b.dataset.graphs.split(',') as GraphId[];
    endTour(); update(); root.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }));

  // ── the five-minute tour ──
  const tour = $('#tour'), tt = $('.tt', tour), tn = $('.tn', tour), note = $('.tnote', tour), tdo = $<HTMLButtonElement>('.tdo', tour), tnext = $<HTMLButtonElement>('.tnext', tour), tclose = $<HTMLButtonElement>('.tclose', tour), tmore = $<HTMLButtonElement>('.tmore', tour), back = $<HTMLButtonElement>('.tourback', root);
  interface Step { text: string; show(): void; done(): boolean; note(): string }
  const aarhus = place('aarhus'), niamey = place('niamey');
  const STEPS: Step[] = [
    { text: 'This is a patch of land near Niamey, in West Africa. A computer grows the plants on it day by day, following five simple rules. Press "Play a year".',
      show: () => go.click(), done: () => played && !player?.running,
      note: () => 'The rain came, leaves came out, the soil dried, the leaves fell. Nobody told the computer when. It all follows from the rules.' },
    { text: 'Now change the world. Slide Rain down to −30%. Guess first: who suffers more, trees or grass?',
      show: () => { site = niamey; setScen({ rain: 0.7 }); update(); }, done: () => scen().rain <= 0.75 && site === niamey && land === 'natural',
      note: () => `Trees shrank from ${pct(base.mean.tree)} of the ground to ${pct(res.mean.tree)}. Grass went from ${pct(grassOf(base))} to ${pct(grassOf(res))}. Less rain reaches the deep soil where tree roots drink, and a trunk still has to be fed every day.` },
    { text: 'Put the rain back. Now add CO₂ to the air: slide it up to 600, a level the world could reach this century.',
      show: () => { site = niamey; setScen({ co2: 600 }); update(); }, done: () => scen().co2 >= 560 && scen().rain === 1 && site === niamey && land === 'natural',
      note: () => `Plant growth: ${chg(base.mean.npp, res.mean.npp)}. Trees: ${pct(base.mean.tree)} → ${pct(res.mean.tree)} of the ground. Plants build themselves out of CO₂. These trees can use the extra. This kind of grass already had all it could use.` },
    { text: 'Is a warmer world worse for plants everywhere? Put CO₂ back, add 3 °C, and visit cool Aarhus in Denmark.',
      show: () => { setScen({ dT: 3 }); site = aarhus; update(); }, done: () => scen().dT >= 2.5 && scen().co2 === C.co2ref && site === aarhus && land === 'natural',
      note: () => `Hot Niamey: growth ${chg(run(niamey, BASE).mean.npp, run(niamey, scen()).mean.npp)}. Cool Aarhus: ${chg(base.mean.npp, res.mean.npp)}, and trees ${pct(base.mean.tree)} → ${pct(res.mean.tree)}. Same rules, different answer. Extra heat hurts where it is already hot. Where it is cool, a longer warm season makes up for it.` },
    { text: 'Last one. The same five rules can run anywhere. Open a graph menu and choose "All six places side by side".',
      show: () => { setScen({}); graphs = ['all', 'pic']; update(); }, done: () => graphs.includes('all'),
      note: () => 'Forest in Manaus, thin grass in Alice Springs, a mix in between. Nobody told the model where forests grow. It worked that out from the weather. That is a process-based model.' },
  ];
  let step = 0, on = true;
  const showStep = () => { tour.classList.remove('answered', 'end'); tn.textContent = `Step ${step + 1} of ${STEPS.length}`; tt.textContent = STEPS[step].text; note.textContent = ''; tnext.hidden = true; tmore.hidden = true; tdo.hidden = false; tclose.textContent = 'Skip the tour'; tnext.textContent = step === STEPS.length - 1 ? 'Finish' : 'Next'; };
  function tourCheck() { if (!on || !res || player?.running || step >= STEPS.length) return; if (STEPS[step].done() && !note.textContent) { note.textContent = STEPS[step].note(); tour.classList.add('answered'); tnext.hidden = false; tdo.hidden = true; } }
  function endTour() { on = false; tour.hidden = true; back.hidden = false; }
  const view = () => { if (small()) $('.panel', root).scrollIntoView({ block: 'start', behavior: 'smooth' }); };
  tdo.addEventListener('click', () => { if (player?.running) return; setLand('natural'); STEPS[step].show(); view(); });
  tnext.addEventListener('click', () => {
    step++; if (step < STEPS.length) return showStep();
    tour.classList.remove('answered'); tour.classList.add('end'); tn.textContent = 'That was the short version'; tt.textContent = 'Now test your own ideas: other places, a field of grain, or one of the questions further down.'; note.textContent = ''; tnext.hidden = true; tmore.hidden = false; tclose.textContent = 'Close';
  });
  tmore.addEventListener('click', () => { endTour(); const q = document.getElementById('d-ask') as HTMLDetailsElement | null; if (q) { q.open = true; q.scrollIntoView({ block: 'start', behavior: 'smooth' }); } });
  tclose.addEventListener('click', endTour);
  back.addEventListener('click', () => { on = true; step = 0; played = false; tour.hidden = false; back.hidden = true; site = niamey; setLand('natural'); setScen({}); graphs = ['pic', 'lai']; update(); showStep(); });

  // a shared link opens the same experiment, without the tour
  const q = new URLSearchParams(location.hash.slice(1));
  if (q.get('p') && place(q.get('p')!)) {
    site = place(q.get('p')!); setLand(q.get('l') === 'crop' ? 'crop' : 'natural');
    setScen({ dT: +(q.get('t') ?? 0), rain: 1 + +(q.get('r') ?? 0) / 100, co2: +(q.get('c') ?? C.co2ref), variety: 1 + +(q.get('v') ?? 0) / 100, sow: +(q.get('s') ?? 0) });
    const g = (q.get('g') ?? '').split(',').filter((x) => GRAPHS.some((y) => y.id === x)) as GraphId[]; if (g.length === 2) graphs = g;
    if (!isBase(scen()) || site.id !== 'niamey' || land !== 'natural') endTour();
  }
  showStep(); update();
}
