// Patch: a pocket-sized, process-based vegetation model for teaching.
// One square metre of grassland, simulated one day at a time.
// Deliberately simple, but every process follows the logic used by
// dynamic global vegetation models such as LPJmL:
//   light-use-efficiency photosynthesis limited by temperature, water and CO2,
//   a soil water bucket, respiration, allocation to leaves/roots/stems,
//   leaf turnover and phenology, litter and soil carbon decomposition.

export type Settings = {
  tempMean: number; // mean annual temperature, °C
  rain: number; // annual rainfall, mm
  co2: number; // ppm
  soilCap: number; // plant-available water the soil can hold, mm (sand ~60, loam ~150, clay ~220)
};

export type State = {
  day: number; // 0..364
  year: number;
  water: number; // mm in the soil bucket
  leaf: number; // g C per m²
  root: number;
  stem: number;
  litter: number;
  soilC: number;
};

export type Fluxes = {
  temp: number; // °C today
  light: number; // MJ PAR per m² per day
  raining: boolean;
  rainToday: number; // mm
  lai: number; // leaf area index
  fapar: number; // fraction of light absorbed
  fT: number; // temperature effect 0..1
  fW: number; // water effect 0..1
  fCO2: number; // CO2 effect (1 = pre-industrial)
  gpp: number; // g C per m² per day
  npp: number;
  respPlant: number;
  respSoil: number; // heterotrophic respiration
  transp: number; // mm per day
  evap: number;
  runoff: number;
  growing: boolean;
  limit: 'light' | 'water' | 'temperature' | 'cold' | 'none';
};

export type YearTotals = { year: number; gpp: number; npp: number; transp: number; runoff: number; peakPlant: number; soilC: number; respSoil: number };

// a small seeded random generator so a given setting always gives the same weather
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// Like a real model, Patch is "spun up" first: it runs quietly for a few centuries
// so plants and soil carbon settle into balance with the chosen climate.
export function initialState(s: Settings, years = 300): State {
  const st: State = { day: 0, year: 1, water: s.soilCap * 0.6, leaf: 0, root: 40, stem: 0, litter: 60, soilC: 4000 };
  const r = rng(7);
  for (let i = 0; i < years * 365; i++) step(st, s, r);
  st.day = 0; st.year = 1;
  return st;
}

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

export function seasonOf(day: number) {
  // +1 in mid July, -1 in mid January (northern hemisphere)
  return Math.sin((2 * Math.PI * (day - 110)) / 365);
}

export function step(st: State, s: Settings, rand: () => number): Fluxes {
  const season = seasonOf(st.day);
  const temp = s.tempMean + 10 * season;
  const light = Math.max(1.5, 8 + 5 * season);

  // rain arrives in random events; on average it adds up to the annual total
  const rainDays = 0.32;
  const raining = rand() < rainDays;
  const rainToday = raining ? (s.rain / (365 * rainDays)) * -Math.log(1 - rand() * 0.98) : 0;
  st.water += rainToday;
  let runoff = 0;
  if (st.water > s.soilCap) { runoff = st.water - s.soilCap; st.water = s.soilCap; }

  // phenology: leaves grow when it is warm enough, die back in the cold
  const growing = temp > 5;
  if (growing && st.leaf < 3) st.leaf += 0.4; // buds break, drawing on root reserves
  const lai = st.leaf * 0.03;
  const fapar = 1 - Math.exp(-0.5 * lai);

  // temperature response of photosynthesis (cool-season grassland, optimum ~22 °C)
  const fT = temp <= 0 || temp >= 42 ? 0 : Math.exp(-(((temp - 22) / 12) ** 2));

  // CO2 fertilisation, with the usual logarithmic saturation
  const fCO2 = clamp(1 + 0.35 * Math.log(s.co2 / 280), 0.3, 2);

  // water: demand from the canopy versus what roots can pull from the soil
  const pet = Math.max(0.3, 0.12 * (temp + 5)) * (light / 8); // potential evaporation, mm/day
  const demand = pet * fapar * Math.pow(280 / s.co2, 0.25); // higher CO2 lets leaves close their pores a little
  const supply = 6 * (st.water / s.soilCap) * clamp(st.root / 60, 0.3, 1);
  const fW = demand > 0.01 ? clamp(supply / demand, 0, 1) : 1;

  // photosynthesis: absorbed light × efficiency × the limiting factors
  const gpp = 1.3 * fapar * light * fT * fW * fCO2;
  const transp = Math.min(supply, demand);
  st.water = Math.max(0, st.water - transp);
  const evap = Math.min(st.water, 0.6 * (st.water / s.soilCap) * (1 - fapar) * pet);
  st.water -= evap;

  // plants spend part of their sugar staying alive; more when it is hot
  const respFrac = clamp(0.45 + 0.012 * (temp - 15), 0.35, 0.7);
  const respPlant = gpp * respFrac;
  const npp = gpp - respPlant;

  // allocation of new growth
  st.leaf += npp * 0.45;
  st.root += npp * 0.3;
  st.stem += npp * 0.25;

  // turnover: leaves and stems die back in the cold, under drought and in heat
  let leafLoss = growing ? 0.012 : 0.09;
  if (fW < 0.3 && growing) leafLoss += 0.03;
  if (temp > 36) leafLoss += 0.04;
  const stemLoss = growing ? 0.004 : 0.06;
  const dLeaf = st.leaf * leafLoss, dStem = st.stem * stemLoss, dRoot = st.root * 0.003;
  st.leaf -= dLeaf; st.stem -= dStem; st.root -= dRoot;
  st.litter += dLeaf + dStem + dRoot;

  // decomposition: microbes work faster when warm and moist (Q10 = 2)
  const q10 = Math.pow(2, (temp - 10) / 10);
  const moist = 0.2 + 0.8 * (st.water / s.soilCap);
  const litterDecay = st.litter * 0.004 * q10 * moist;
  const soilDecay = st.soilC * (1 / (30 * 365)) * q10 * moist;
  st.litter -= litterDecay;
  st.soilC += 0.3 * litterDecay - soilDecay;
  const respSoil = 0.7 * litterDecay + soilDecay;

  // what is holding growth back right now?
  let limit: Fluxes['limit'] = 'none';
  if (!growing) limit = 'cold';
  else {
    const lightLim = light / 13;
    const m = Math.min(fW, fT, lightLim);
    if (m < 0.85) limit = m === fW ? 'water' : m === fT ? 'temperature' : 'light';
  }

  st.day += 1;
  if (st.day >= 365) { st.day = 0; st.year += 1; }

  return { temp, light, raining, rainToday, lai, fapar, fT, fW, fCO2, gpp, npp, respPlant, respSoil, transp, evap, runoff, growing, limit };
}
