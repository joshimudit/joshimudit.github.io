// Conferences, talks and posters. Shown on Publications and the CV.
// kind: 'Poster' | 'Presentation' | 'Presentation and poster'

export type Conference = { date: string; when: string; event: string; place: string; kind: string; title: string; note?: string; href?: string };

export const conferences: Conference[] = [
  {
    date: '2026-02',
    when: 'February 2026',
    event: 'iCROPM 2026, 3rd International Crop Modelling Symposium',
    place: 'Florence, Italy',
    kind: 'Presentation and poster',
    title: 'Modelling dryland crops through the Holocene: the framework of my PhD',
    note: 'Best poster award',
  },
  {
    date: '2026-01',
    when: 'January 2026',
    event: '12th International Biogeography Society Conference',
    place: 'Aarhus, Denmark',
    kind: 'Poster',
    title: 'How the climate niche of sorghum changed through the Holocene',
  },
];
