// Real weather-station climate normals (monthly). Temperature in °C, rain in mm, sunshine in hours per month.
// Source: the climate tables on each city's Wikipedia page, which give NOAA / WMO normals
// (Niamey, Parakou, Cotonou 1991–2020; Agadez 1961–1990) and Danish Meteorological Institute normals for Aarhus.
export interface Site {
  id: string; name: string; country: string; lat: number;
  T: number[]; P: number[]; sun: number[];
  station?: boolean; blurb?: string;
}

export const STATIONS: Site[] = [
  { id: 'agadez', name: 'Agadez', country: 'Niger', lat: 16.97, station: true, blurb: 'edge of the Sahara',
    T: [19.8, 22.5, 26.7, 31.2, 33.7, 33.8, 32.1, 31.0, 31.7, 29.4, 24.3, 21.0],
    P: [0, 0, 0.1, 2.0, 5.5, 10.4, 35.2, 49.7, 8.2, 0.3, 0, 0],
    sun: [297.6, 280.0, 294.5, 288.0, 297.6, 270.0, 288.3, 285.2, 285.0, 306.9, 303.0, 294.5] },
  { id: 'niamey', name: 'Niamey', country: 'Niger', lat: 13.51, station: true, blurb: 'the Sahel',
    T: [24.6, 27.8, 31.9, 34.7, 34.5, 32.2, 29.5, 28.1, 29.6, 31.5, 29.0, 25.5],
    P: [0, 0.3, 0.2, 9.8, 25.3, 78.6, 145.6, 192.6, 85.1, 16.7, 0, 0],
    sun: [285.0, 259.1, 263.3, 256.8, 266.8, 247.4, 245.1, 226.2, 250.1, 286.1, 293.8, 299.4] },
  { id: 'parakou', name: 'Parakou', country: 'Benin', lat: 9.35, station: true, blurb: 'savanna',
    T: [27.5, 29.6, 30.7, 29.7, 28.2, 26.7, 25.7, 25.2, 25.7, 26.8, 28.0, 27.4],
    P: [4.9, 8.0, 33.6, 83.2, 133.8, 157.5, 188.8, 212, 221.5, 111.9, 6.9, 1.9],
    sun: [251.5, 233.2, 234.8, 230.9, 229.1, 190.0, 144.8, 119.6, 148.7, 208.7, 250.2, 259.9] },
  { id: 'cotonou', name: 'Cotonou', country: 'Benin', lat: 6.37, station: true, blurb: 'the coast',
    T: [28.0, 29.2, 29.6, 29.2, 28.4, 27.1, 26.5, 26.2, 26.7, 27.3, 28.4, 28.4],
    P: [19.4, 38.2, 80.5, 126.1, 213.0, 333.2, 135.2, 39.0, 134.9, 165.1, 43.9, 12.1],
    sun: [188.8, 188.3, 213.5, 209.7, 196.5, 137.7, 141.3, 150.8, 155.1, 200.9, 233.0, 219.1] },
];

export const AARHUS: Site = { id: 'aarhus', name: 'Aarhus', country: 'Denmark', lat: 56.15, station: true, blurb: 'cool and damp',
  T: [1.3, 1.5, 3.1, 7.3, 11.2, 14.6, 16.8, 16.8, 13.3, 9.1, 5.3, 2.4],
  P: [56.0, 37.5, 49.3, 38.0, 45.5, 62.8, 59.6, 61.4, 73.3, 68.4, 63.3, 58.9],
  sun: [43, 72, 119, 183, 255, 253, 265, 228, 149, 100, 59, 38] };

/** A line of 12 cells from the Sahara to the coast, roughly one per degree of latitude.
 *  Four cells sit on a weather station. The cells in between get a climate blended
 *  from the station to the north and the station to the south. */
export function transect(): Site[] {
  const S = STATIONS;
  const lats = [16.97, 16, 15, 14.3, 13.51, 12.5, 11.5, 10.4, 9.35, 8.4, 7.4, 6.37];
  return lats.map((lat, i) => {
    const near = S.find((s) => Math.abs(s.lat - lat) < 0.01);
    if (near) return { ...near, id: 'c' + i };
    let k = 0;
    while (k < S.length - 2 && lat < S[k + 1].lat) k++;
    const a = S[k], b = S[k + 1], f = (a.lat - lat) / (a.lat - b.lat);
    const mix = (x: number[], y: number[]) => x.map((v, m) => +(v + (y[m] - v) * f).toFixed(1));
    return { id: 'c' + i, name: `${lat.toFixed(1)}°N`, country: '', lat, T: mix(a.T, b.T), P: mix(a.P, b.P), sun: mix(a.sun, b.sun) };
  });
}
