// Six ecosystems around the world, each stood in for by one real weather station.
// Monthly climate normals: temperature in °C, precipitation in mm, sunshine in hours per month.
// Taken from the climate table on each city's Wikipedia page, which cite: NOAA and the World Meteorological
// Organization (Niamey), the Australian Bureau of Meteorology (Alice Springs), the India Meteorological Department
// and the Tokyo Climate Center (Hyderabad), AEMET (Seville), the Danish Meteorological Institute (Aarhus) and
// INMET (Manaus). Normals are for 1991–2020 (Hyderabad sunshine: 1971–2000).
import type { CropId } from './model';

export interface Site {
  id: string; biome: string; name: string; country: string; lat: number; blurb: string; crop: CropId;
  T: number[]; P: number[]; sun: number[];
}

export const SITES: Site[] = [
  { id: 'niamey', biome: 'Tropical savanna', name: 'Niamey', country: 'Niger', lat: 13.51, blurb: 'hot all year, one short rainy season', crop: 'millet',
    T: [24.6, 27.8, 31.9, 34.7, 34.5, 32.2, 29.5, 28.1, 29.6, 31.5, 29.0, 25.5],
    P: [0, 0.3, 0.2, 9.8, 25.3, 78.6, 145.6, 192.6, 85.1, 16.7, 0, 0],
    sun: [285.0, 259.1, 263.3, 256.8, 266.8, 247.4, 245.1, 226.2, 250.1, 286.1, 293.8, 299.4] },
  { id: 'alice', biome: 'Arid shrubland', name: 'Alice Springs', country: 'Australia', lat: -23.7, blurb: 'desert: little rain in any month', crop: 'wheat',
    T: [29.7, 28.5, 25.7, 21.1, 15.8, 12.4, 12.3, 14.7, 20.0, 23.4, 26.4, 28.2],
    P: [48.9, 40.7, 19.9, 19.9, 17.5, 10.3, 13.0, 3.8, 7.8, 18.7, 33.0, 41.3],
    sun: [316.2, 274.0, 297.6, 291.0, 266.6, 252.0, 285.2, 313.3, 303.0, 316.2, 297.0, 294.5] },
  { id: 'hyderabad', biome: 'Semi-arid farmland', name: 'Hyderabad', country: 'India', lat: 17.36, blurb: 'hot, with a summer monsoon', crop: 'millet',
    T: [22.8, 25.4, 28.8, 31.4, 33.2, 29.7, 27.2, 26.4, 26.8, 26.2, 24.1, 22.2],
    P: [9.2, 10.2, 12.3, 27.2, 34.5, 113.8, 162.0, 203.9, 148.5, 113.9, 19.1, 5.0],
    sun: [272.8, 265.6, 272.8, 276.0, 279.0, 180.0, 136.4, 133.3, 162.0, 226.3, 243.0, 251.1] },
  { id: 'seville', biome: 'Mediterranean woodland', name: 'Seville', country: 'Spain', lat: 37.39, blurb: 'mild wet winters, hot dry summers', crop: 'wheat',
    T: [11.2, 12.7, 15.6, 17.8, 21.6, 25.7, 28.5, 28.6, 25.0, 20.6, 15.2, 12.2],
    P: [56.3, 46.2, 46.9, 51.5, 33.9, 5.8, 0.6, 2.5, 33.1, 75.4, 72.6, 77.2],
    sun: [189, 198, 229, 255, 307, 339, 369, 347, 261, 229, 192, 174] },
  { id: 'aarhus', biome: 'Temperate forest', name: 'Aarhus', country: 'Denmark', lat: 56.15, blurb: 'cool and damp all year', crop: 'wheat',
    T: [1.3, 1.5, 3.1, 7.3, 11.2, 14.6, 16.8, 16.8, 13.3, 9.1, 5.3, 2.4],
    P: [56.0, 37.5, 49.3, 38.0, 45.5, 62.8, 59.6, 61.4, 73.3, 68.4, 63.3, 58.9],
    sun: [43, 72, 119, 183, 255, 253, 265, 228, 149, 100, 59, 38] },
  { id: 'manaus', biome: 'Tropical rainforest', name: 'Manaus', country: 'Brazil', lat: -3.12, blurb: 'warm and wet all year', crop: 'maize',
    T: [26.6, 26.6, 26.6, 26.7, 27.0, 27.3, 27.5, 28.2, 28.6, 28.5, 28.0, 27.2],
    P: [305.6, 296.8, 320.9, 331.0, 233.3, 117.2, 67.1, 56.1, 79.0, 113.9, 188.0, 253.5],
    sun: [122.7, 98.0, 104.3, 113.6, 141.9, 191.0, 223.1, 222.5, 196.4, 173.5, 150.7, 126.6] },
];
export const site = (id: string) => SITES.find((s) => s.id === id) ?? SITES[0];
