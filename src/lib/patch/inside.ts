// Step 2: look inside Patch. Every process can be picked from the list or from the drawing.
import { lightCaught, lightUse, tempLimit, breathing, C, PFT } from './model';

const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T;
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll(s)] as T[];

interface Curve { x: [number, number, number]; at(x: number): string; xLabel: string; yLabel: string; unit: string; lines: { name: string; color: string; dash?: boolean; f(x: number): number }[]; start: number }
interface Proc { g: 'c' | 'w' | 'e'; abbr: string; short: string; term: string; plain: string; eq: string; to: string[]; source: string; pos: [number, number]; arrow: string; curve?: Curve }
const INK = '#111111', WATER = '#1b6ca8', ENERGY = '#b5480b';
const gppRel = (c4: boolean) => (T: number) => (lightUse(c4, T, C.co2ref) * tempLimit(PFT[c4 ? 'c4grass' : 'temptree'].tl, T)) / lightUse(false, 20, C.co2ref);

export const PROCS: Record<string, Proc> = {
  gpp: { g: 'c', abbr: 'GPP', short: 'Photosynthesis', term: 'Photosynthesis (gross primary production)', plain: 'Leaves use the light they absorb to turn CO₂ and water into sugar. The total amount made is called gross primary production. It slows when it is too cold, too hot or too dry.', eq: 'GPP = absorbed light × light-use efficiency (temperature, CO₂) × water stress', to: ['ra', 'npp', 't'], source: 'Farquhar and others 1980; Collatz and others 1992; Haxeltine and Prentice 1996', pos: [47, 20], arrow: '↓',
    curve: { x: [0, 45, 15], at: (x) => `At ${x.toFixed(0)} °C`, xLabel: 'air temperature, °C', yLabel: 'photosynthesis, relative', unit: '', start: 25, lines: [{ name: 'C3 plant (here a temperate tree)', color: INK, f: gppRel(false) }, { name: 'C4 plant (here a savanna grass)', color: ENERGY, dash: true, f: gppRel(true) }] } },
  ra: { g: 'c', abbr: 'Ra', short: 'Plant respiration', term: 'Plant respiration (autotrophic respiration)', plain: 'Plants burn part of their sugar to stay alive and to build new tissue. The CO₂ goes back to the air. It runs faster when it is warm.', eq: 'Ra = living biomass × rate (temperature) + 25% of new growth', to: ['npp'], source: 'Lloyd and Taylor 1994; Ryan 1991; Sitch and others 2003', pos: [60, 8], arrow: '↑',
    curve: { x: [0, 40, 10], at: (x) => `At ${x.toFixed(0)} °C`, xLabel: 'air temperature, °C', yLabel: 'respiration rate, relative to 10 °C', unit: '×', start: 20, lines: [{ name: 'respiration', color: INK, f: breathing }] } },
  npp: { g: 'c', abbr: 'NPP', short: 'Growth', term: 'Growth (net primary production)', plain: 'What is left after respiration is net primary production. The plant puts it into leaves, roots, wood or grain. This is called allocation.', eq: 'NPP = GPP − Ra', to: ['par', 't', 'rh', 'h'], source: 'Sitch and others 2003', pos: [63, 46], arrow: '' },
  rh: { g: 'c', abbr: 'Rh', short: 'Decomposition', term: 'Decomposition (heterotrophic respiration)', plain: 'Dead leaves and roots enter the soil. Microbes break them down and release the carbon as CO₂, faster when the soil is warm and moist.', eq: 'Rh = soil carbon × rate (temperature, soil moisture)', to: [], source: 'Lloyd and Taylor 1994', pos: [80, 67], arrow: '↑' },
  h: { g: 'c', abbr: 'H', short: 'Harvest', term: 'Harvest', plain: 'On cropland the grain is removed when it is ripe. A crop ripens once enough warm days have added up. These are called growing degree days.', eq: 'ripe when Σ (daily temperature − base temperature) reaches what the variety needs', to: ['npp'], source: 'Bondeau and others 2007', pos: [30, 62], arrow: '' },
  p: { g: 'w', abbr: 'P', short: 'Precipitation', term: 'Precipitation', plain: 'Rain is the water input. Patch turns the monthly rainfall of a place into rainy days and dry days.', eq: 'soil water today = soil water yesterday + P − T − E − percolation', to: ['i'], source: 'Manabe 1969', pos: [15, 33], arrow: '↓' },
  i: { g: 'w', abbr: 'I', short: 'Infiltration, percolation', term: 'Infiltration and percolation', plain: 'Rain enters the top soil layer. This is infiltration. When that layer is full, the extra drains to the deep layer, where mostly tree roots reach. This is percolation.', eq: 'percolation = max (0, top-soil water − capacity)', to: ['t'], source: 'Walter 1971; Manabe 1969', pos: [19, 80], arrow: '↓' },
  t: { g: 'w', abbr: 'T', short: 'Transpiration', term: 'Transpiration', plain: 'Leaves lose water through small pores called stomata, the same pores that take in CO₂. When roots cannot supply enough, the stomata close and photosynthesis slows. This is water stress.', eq: 'T = min (atmospheric demand, root supply);  water stress = supply ÷ demand', to: ['gpp', 'i'], source: 'Priestley and Taylor 1972; Sitch and others 2003', pos: [87, 38], arrow: '↑',
    curve: { x: [0, 1, 0.25], at: (x) => `With the soil ${Math.round(x * 100)}% full`, xLabel: 'how full the soil is (0 = dry, 1 = full)', yLabel: 'water stress factor (1 = no stress)', unit: '', start: 0.5, lines: [{ name: 'on a day when the air demands 4 mm', color: WATER, f: (w) => Math.min(1, (C.emax * w) / 4) }] } },
  e: { g: 'w', abbr: 'E', short: 'Evaporation', term: 'Evaporation', plain: 'Water also evaporates straight from bare, wet soil. Ground shaded by leaves loses less this way.', eq: 'E = atmospheric demand × unshaded share × (top-soil wetness)²', to: ['i'], source: 'a simple form, after Sitch and others 2003', pos: [8, 52], arrow: '↑' },
  par: { g: 'e', abbr: 'PAR', short: 'Light absorption', term: 'Light absorption (photosynthetically active radiation)', plain: 'Leaves absorb the part of sunlight that plants can use. More leaf area absorbs more, but upper leaves shade the lower ones, so each extra layer adds less.', eq: 'absorbed fraction = 1 − e^(−0.5 × LAI);  LAI = leaf area per ground area', to: ['gpp'], source: 'Monsi and Saeki 1953', pos: [74, 27], arrow: '↓',
    curve: { x: [0, 8, 2], at: (x) => `At a leaf area index of ${x.toFixed(1)}`, xLabel: 'leaf area index (LAI)', yLabel: 'share of light absorbed', unit: '', start: 3, lines: [{ name: 'absorbed light', color: ENERGY, f: lightCaught }] } },
};

const PULLS: [string, string[]][] = [
  ['Less precipitation', ['Less water infiltrates. The soil dries.', 'Roots supply less water, so stomata close and transpiration falls.', 'With the stomata closed, photosynthesis falls.', 'Less growth means fewer leaves.', 'Fewer leaves use less water. This softens the drought a little: a balancing feedback.']],
  ['More CO₂', ['Photosynthesis rises in C3 plants.', 'Stomata can stay a little more closed, so transpiration falls.', 'The soil stays wet for longer.', 'In dry places, plants can keep growing later into the dry season.']],
  ['Warmer air', ['Respiration speeds up, so more sugar is burned.', 'The air demands more water, so transpiration rises and the soil dries sooner.', 'Where it was already hot, photosynthesis falls.', 'Where cold was the limit, the growing season gets longer and growth can rise.']],
];

function drawCurve(host: HTMLElement, c: Curve) {
  const [x0, x1] = c.x, n = 60, xs = Array.from({ length: n + 1 }, (_, i) => x0 + ((x1 - x0) * i) / n);
  const top = Math.max(...c.lines.flatMap((l) => xs.map(l.f))) * 1.1, X = (x: number) => 40 + ((x - x0) / (x1 - x0)) * 270, Y = (v: number) => 130 - (v / top) * 112;
  let h = `<line class="axis" x1="40" y1="130" x2="310" y2="130"/><line class="axis" x1="40" y1="18" x2="40" y2="130"/>`;
  for (let x = x0; x <= x1 + 1e-9; x += c.x[2]) h += `<text x="${X(x)}" y="145" text-anchor="middle">${+x.toFixed(1)}</text>`;
  h += `<text x="175" y="161" text-anchor="middle">${c.xLabel}</text><text x="4" y="11">${c.yLabel}</text>`;
  for (const l of c.lines) h += `<path d="${xs.map((x, i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)},${Y(l.f(x)).toFixed(1)}`).join('')}" stroke="${l.color}"${l.dash ? ' stroke-dasharray="6 4"' : ''}/>`;
  if (c.lines.length > 1) h += c.lines.map((l, i) => `<line x1="${46 + i * 150}" x2="${66 + i * 150}" y1="26" y2="26" stroke="${l.color}" stroke-width="2.5"${l.dash ? ' stroke-dasharray="6 4"' : ''}/><text x="${70 + i * 150}" y="30">${l.name.split(' (')[0]}</text>`).join('');
  h += `<line class="axis mark" x1="0" x2="0" y1="18" y2="130"/>` + c.lines.map((l) => `<circle r="5" fill="${l.color}" stroke="#fff" stroke-width="2"/>`).join('');
  host.innerHTML = `<svg viewBox="0 0 320 166" role="img" aria-label="${c.yLabel} against ${c.xLabel}">${h}</svg><label class="knob"><span class="sr" style="position:absolute;left:-999px">${c.xLabel}</span><input type="range" min="${x0}" max="${x1}" step="${(x1 - x0) / 100}" value="${c.start}" aria-label="${c.xLabel}"></label><p class="note read"></p>`;
  const inp = $<HTMLInputElement>('input', host), mark = $('.mark', host), dots = $$('circle', host), read = $('.read', host);
  const set = () => {
    const x = +inp.value; mark.setAttribute('x1', String(X(x))); mark.setAttribute('x2', String(X(x)));
    dots.forEach((d, i) => { d.setAttribute('cx', String(X(x))); d.setAttribute('cy', String(Y(c.lines[i].f(x)))); });
    read.textContent = `${c.at(x)}: ` + c.lines.map((l) => `${c.lines.length > 1 ? l.name.split(' (')[0] + ' ' : ''}${l.f(x).toFixed(2)}${c.unit}`).join(', ') + '.';
    inp.style.setProperty('--v', String((x - x0) / (x1 - x0)));
  };
  inp.addEventListener('input', set); set();
}

export function insidePage() {
  const root = $('#inside'), fig = $('.fig', root), ids = Object.keys(PROCS);
  let cur = 'gpp', pull = 0;
  for (const g of ['c', 'w', 'e'] as const) $(`.legend .${g} ul`, root).innerHTML = ids.filter((id) => PROCS[id].g === g).map((id) => `<li><button type="button" data-id="${id}"><b>${PROCS[id].abbr}</b>${PROCS[id].short}</button></li>`).join('');
  fig.insertAdjacentHTML('beforeend', ids.map((id) => { const p = PROCS[id]; return `<button type="button" class="tag ${p.g}" data-id="${id}" style="left:${p.pos[0]}%;top:${p.pos[1]}%" aria-label="${p.short}"><span aria-hidden="true">${p.arrow}</span>${p.abbr}</button>`; }).join(''));
  $('.pulls', root).innerHTML = PULLS.map((p, i) => `<button type="button" class="opt" data-i="${i}">${p[0]}</button>`).join('');
  function show() {
    const p = PROCS[cur], name = { c: 'Carbon', w: 'Water', e: 'Energy' }[p.g];
    $$('[data-id]', root).forEach((b) => b.classList.toggle('on', b.dataset.id === cur));
    const d = $('.detail', root);
    $('.cyc', d).textContent = `${name} · ${p.abbr}`; $('.cyc', d).style.color = { c: INK, w: WATER, e: ENERGY }[p.g];
    $('h2', d).textContent = p.term; $('.plain', d).textContent = p.plain; $('.eq', d).textContent = p.eq; $('.src', d).textContent = 'Source: ' + p.source + '.';
    $('.to', d).innerHTML = p.to.length ? p.to.map((id) => `<button type="button" class="opt" data-id="${id}">${PROCS[id].short}</button>`).join('') : '<span class="note">Nothing further inside Patch: the carbon leaves to the air.</span>';
    const tr = $('.try', d); $('.trylab', d).hidden = !p.curve; tr.hidden = !p.curve;
    if (p.curve) drawCurve(tr, p.curve);
    $$('.pulls .opt', root).forEach((b, i) => b.classList.toggle('on', i === pull));
    $('.chain', root).innerHTML = PULLS[pull][1].map((t) => `<li>${t}</li>`).join('');
  }
  root.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('button');
    if (!b) return;
    if (b.dataset.id) { cur = b.dataset.id; show(); if (window.matchMedia('(max-width: 720px)').matches && !b.closest('.detail')) $('.detail', root).scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    else if (b.dataset.i && b.closest('.pulls')) { pull = +b.dataset.i; show(); }
  });
  show();
}
