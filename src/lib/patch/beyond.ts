// Step 4: a small calibration demonstration. One uncertain value is turned until the model fits a set of points.
import { sampleYear, C } from './model';
import { site } from './sites';

export function calibration() {
  const host = document.getElementById('calib');
  if (!host) return;
  const days = sampleYear(site('seville')), MD = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31], model: number[] = [];
  let d = 0;
  for (const m of MD) { let s = 0; for (let i = 0; i < m; i++) s += days[d + i].gpp; model.push(s / m); d += m; }
  // The points are invented: the model's own curve at another value of the uncertain number, with some scatter.
  const scatter = [0.05, -0.04, 0.03, -0.06, 0.04, 0.02, -0.03, 0.05, -0.05, 0.03, -0.02, 0.04], TRUE = 0.63;
  const obs = model.map((v, i) => v * (TRUE / C.alphaA) * (1 + scatter[i]) + 0.05);
  const top = Math.max(...obs, ...model.map((v) => (v * 0.8) / C.alphaA)) * 1.1;
  const X = (i: number) => 44 + i * 30, Y = (v: number) => 150 - (v / top) * 130;
  const svg = host.querySelector('svg')!, inp = host.querySelector<HTMLInputElement>('input')!, out = host.querySelector<HTMLElement>('output')!, say = host.querySelector<HTMLElement>('.say')!;
  const draw = () => {
    const a = +inp.value, line = model.map((v) => (v * a) / C.alphaA);
    const gap = Math.sqrt(line.reduce((s, v, i) => s + (v - obs[i]) ** 2, 0) / 12) / (obs.reduce((s, v) => s + v, 0) / 12);
    let h = `<line x1="40" y1="150" x2="388" y2="150" stroke="#bdbdbd"/>`;
    'JFMAMJJASOND'.split('').forEach((m, i) => (h += `<text x="${X(i)}" y="166" text-anchor="middle">${m}</text>`));
    h += `<text x="4" y="12">photosynthesis (GPP) by month, near Seville</text>`;
    h += `<path d="${line.map((v, i) => `${i ? 'L' : 'M'}${X(i)},${Y(v).toFixed(1)}`).join('')}" fill="none" stroke="#111" stroke-width="3"/>`;
    h += obs.map((v, i) => `<circle cx="${X(i)}" cy="${Y(v).toFixed(1)}" r="5" fill="#fff" stroke="#b5480b" stroke-width="3"/>`).join('');
    svg.innerHTML = h;
    out.textContent = a.toFixed(2);
    inp.style.setProperty('--p', String((C.alphaA - 0.3) / 0.5)); inp.style.setProperty('--v', String((a - 0.3) / 0.5));
    say.textContent = gap < 0.07 ? `Mismatch ${Math.round(gap * 100)}%. A good fit. The next step would be to check this value against measurements from other places, which were not used for fitting. That is evaluation.` : `Mismatch between model and measurements: ${Math.round(gap * 100)}%. Turn the value until the line runs through the points.`;
  };
  inp.addEventListener('input', draw); draw();
}
