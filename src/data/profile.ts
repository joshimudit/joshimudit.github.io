// Single source of truth for who Mudit is. Every page reads from here.

export const profile = {
  name: 'Mudit Joshi',
  role: 'Systems scientist',
  position: 'PhD researcher, Aarhus University',
  network: 'Marie Skłodowska-Curie doctoral network AGRI-DRY',
  email: 'mjoshi@bio.au.dk',
  photo: '/img/mudit-alps.webp',
  photoAlt: 'Mudit Joshi on a mountain ridge in the Alps',
  lede:
    'My research sits where climate, food systems and natural ecosystems meet: how they shape each other, how they have changed, and where they are heading. I study them together with models and systems thinking, and I keep pace with machine learning, AI agents and data workflows, with an eye on fair access to data and tools.',
  // the line under the lede on Home (HTML)
  roots:
    'I grew up in the hills of Uttarakhand, in the Indian Himalaya. Today I’m a PhD researcher at Aarhus University, in the Marie Skłodowska-Curie doctoral network <a href="https://agri-dry.org">AGRI-DRY</a>.',
  // About on Home (HTML)
  about: [
    'My PhD treats the last 12,000 years as a natural experiment in how climate decides where wild plants and crops can grow, as farming spread through the drylands of Africa and Mediterranean Europe. I combine palaeoclimate reconstructions, crop suitability models and dynamic global vegetation models (DGVMs). I’m supervised by <a href="https://bio.au.dk/en/about-biology/contact/show/person/alejandro.ordonez@bio.au.dk">Alejandro Ordonez</a>, with <a href="https://www.gla.ac.uk/schools/humanities/staff/nickiwhitehouse/">Nicki Whitehouse</a> and <a href="https://icrea.cat/Web/ScientificStaff/Marco-Madella-330">Marco Madella</a> as co-supervisors, and I’m also part of the <a href="https://bio.au.dk/en/research/research-centres/econovo">ECONOVO</a>, <a href="https://bio.au.dk/en/research/research-centres/sustainscapes">SustainScapes</a> and <a href="https://iclimate.au.dk/">iClimate</a> research centres at Aarhus.',
    'I got here in three steps: agricultural sciences for my BSc in India, environmental management for my MSc at <a href="https://www.uni-kiel.de/en/">Kiel University</a>, and mathematical modelling for my master’s thesis in the <a href="https://ele.ethz.ch/">Ecosystems and Landscape Evolution group</a> at ETH Zurich, simulating how plant diversity evolved with climate over 400 million years.',
  ],
};

export const links = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/muditjoshi296/' },
  { label: 'ORCID', href: 'https://orcid.org/0000-0001-9583-9404' },
  { label: 'GitHub', href: 'https://github.com/joshimudit' },
  { label: 'AGRI-DRY profile', href: 'https://agri-dry.org/team/dc/mudit-joshi/' },
];

// Current and past collaborations, shown on the map at the end of Home.
// href: main sites for now; swap in lab or professor pages later.
export type Collab = { name: string; short: string; place: string; country: string; role: string; group: 'agridry' | 'past'; lat: number; lon: number; href: string };

export const collaborations: Collab[] = [
  { name: 'Aarhus University', short: 'Aarhus', place: 'Aarhus', country: 'Denmark', role: 'PhD host, AGRI-DRY', group: 'agridry', lat: 56.17, lon: 10.2, href: 'https://international.au.dk' },
  { name: 'University of Glasgow', short: 'Glasgow', place: 'Glasgow', country: 'United Kingdom', role: 'AGRI-DRY coordinator', group: 'agridry', lat: 55.87, lon: -4.29, href: 'https://www.gla.ac.uk' },
  { name: 'Universitat Pompeu Fabra', short: 'UPF', place: 'Barcelona', country: 'Spain', role: 'AGRI-DRY coordinator', group: 'agridry', lat: 41.39, lon: 2.18, href: 'https://www.upf.edu' },
  { name: 'Università del Salento', short: 'Salento', place: 'Lecce', country: 'Italy', role: 'AGRI-DRY partner', group: 'agridry', lat: 40.35, lon: 18.17, href: 'https://www.unisalento.it' },
  { name: 'University of Botswana', short: 'Botswana', place: 'Gaborone', country: 'Botswana', role: 'AGRI-DRY partner', group: 'agridry', lat: -24.66, lon: 25.93, href: 'https://www.ub.bw' },
  { name: 'University of the Witwatersrand', short: 'Wits', place: 'Johannesburg', country: 'South Africa', role: 'AGRI-DRY partner', group: 'agridry', lat: -26.19, lon: 28.03, href: 'https://www.wits.ac.za' },
  { name: 'ETH Zurich', short: 'ETH', place: 'Zurich', country: 'Switzerland', role: 'Master’s thesis', group: 'past', lat: 47.38, lon: 8.55, href: 'https://ethz.ch' },
  { name: 'Kiel University', short: 'Kiel', place: 'Kiel', country: 'Germany', role: 'MSc', group: 'past', lat: 54.34, lon: 10.12, href: 'https://www.uni-kiel.de' },
  { name: 'Adam Mickiewicz University', short: 'AMU', place: 'Poznań', country: 'Poland', role: 'Erasmus semester', group: 'past', lat: 52.41, lon: 16.93, href: 'https://amu.edu.pl' },
  { name: 'G.B. Pant University of Agriculture and Technology', short: 'Pantnagar', place: 'Pantnagar', country: 'India', role: 'BSc', group: 'past', lat: 29.02, lon: 79.48, href: 'https://www.gbpuat.ac.in' },
  { name: 'INHERE', short: 'INHERE', place: 'Masi, Almora', country: 'India', role: 'Internship, Himalayan villages', group: 'past', lat: 29.82, lon: 79.37, href: 'https://www.inhereindia.in' },
];

// Contact form. Get a free access key at https://web3forms.com (enter the inbox
// address that should receive messages) and paste it here. Empty = form shows
// the email address instead.
export const web3formsKey = '';
