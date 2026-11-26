// Projects shown on the Work page and the Home time ruler.
// Unpublished papers use theme titles only: no real titles, results or concept names.
// Each project has a card on /work and its own page at /work/<slug>.
// status: 'ongoing' | 'completed' (the work), output: where the paper or thesis stands.
// art: a drawn graphic (components/ProjectArt.astro) or an image path.
// For unpublished papers the detail page gives aims and methods only, never results.

export type Project = {
  slug: string;
  title: string;
  status: 'ongoing' | 'completed';
  output: string;
  outputLink?: string;
  role: 'Lead author' | 'Co-author';
  // for co-authored work: who leads it (shown as 'Lead author: <name>')
  lead?: { name: string; href?: string };
  note?: string;
  era: 'deep' | 'holocene' | 'now' | 'next';
  summary: string;
  methods: string[];
  art: { kind: 'niches' | 'productivity' | 'context' | 'strata' } | { src: string; alt: string };
  team?: { name: string; href?: string; role?: string }[];
  period: string;
  where: string;
  aims: string[];
  approach: string[];
  results?: string[];
  figures?: { src: string; alt: string; caption: string; width: number; height: number; in: 'approach' | 'results' }[];
  links?: { label: string; href: string }[];
  funding?: string;
};

const AD = 'https://agri-dry.org';
const P = {
  ordonez: { name: 'Alejandro Ordonez', href: `${AD}/our-team/pis-and-supervisors/alejandro-ordonez-gloria/` },
  whitehouse: { name: 'Nicki Whitehouse', href: `${AD}/our-team/pis-and-supervisors/nicki-whitehouse/` },
  madella: { name: 'Marco Madella', href: `${AD}/our-team/pis-and-supervisors/marco-madella/` },
  schoeman: { name: 'Alex Schoeman', href: `${AD}/our-team/pis-and-supervisors/alex-schoeman/` },
  chingono: { name: 'Paidamoyo Chingono', href: `${AD}/our-team/doctoral-candidates/paidamoyo-hazel-chingono/` },
  scaglia: { name: 'Sara Scaglia', href: `${AD}/our-team/doctoral-candidates/sara-scaglia/` },
  mukuya: { name: 'Thamary Mukuya', href: `${AD}/our-team/doctoral-candidates/thamary-mukuya/` },
};
const MSCA = 'Funded by the European Union’s Horizon Europe research and innovation programme under the Marie Skłodowska-Curie Grant Agreement No 101120560 (AGRI-DRY).';


export const projects: Project[] = [
  {
    slug: 'crops-and-climate',
    title: 'Crop climatic niches across the Holocene',
    status: 'ongoing',
    output: 'In preparation',
    role: 'Lead author',
    era: 'holocene',
    period: 'PhD chapter 1',
    where: 'Aarhus University, AGRI-DRY',
    summary: 'How the climatic niches of key crops shaped where early farmers could grow them as farming spread into the drylands of Africa and the Mediterranean.',
    methods: ['Crop suitability modelling', 'Palaeoclimate data', 'Archaeobotanical data', 'R'],
    art: { kind: 'niches' },
    aims: [
      'Map where key dryland crops could grow at different points of the last 12,000 years.',
      'Test whether climate opened or closed the routes along which farming spread through the Mediterranean, North Africa, the Sahara and southern Africa.',
      'Separate what climate allowed from what early farmers chose to do.',
    ],
    approach: [
      'Palaeoclimate reconstructions give the conditions at each place and time. A crop suitability model, EcoCrop, turns those conditions into a measure of how well each crop could grow there, based on its climatic niche: the range of temperature and rainfall it tolerates.',
      'Repeating this through the Holocene gives a moving map of where each crop was possible, which is then set against the timing and routes of farming’s spread.',
      'The models are evaluated against the archaeobotanical database for southern Africa that <a href="https://agri-dry.org/our-team/doctoral-candidates/paidamoyo-hazel-chingono/">Paidamoyo Chingono</a> is putting together within AGRI-DRY.',
    ],
    team: [P.ordonez, P.whitehouse, P.madella, P.schoeman, P.chingono, P.scaglia],
    funding: MSCA,
  },
  {
    slug: 'simulating-early-farming',
    title: 'Why the first fields came so late',
    status: 'ongoing',
    output: 'In preparation',
    role: 'Lead author',
    era: 'holocene',
    period: 'PhD chapter 2',
    where: 'Aarhus University, AGRI-DRY',
    summary: 'People gathered wild cereals for thousands of years before they farmed them. A process-based vegetation and crop model tests, in numbers, what held the first harvests back in Southwest Asia and the Green Sahara.',
    methods: ['LPJmL', 'Palaeoclimate', 'Model experiments', 'High-performance computing'],
    art: { kind: 'productivity' },
    aims: [
      'Southwest Asia, at the end of the last ice age: as CO₂ in the air rose, did wild wheat and barley start to give harvests large and reliable enough to farm?',
      'The Green Sahara: why did herding come long before crops? Was it the risk of failing rains, plenty of wild food, or something else that limited a rainfed harvest?',
      'Turn explanations that archaeologists have argued about for decades into tests: none of them has yet been worked out as an actual harvest.',
    ],
    approach: [
      'I use LPJmL, a dynamic global vegetation model that also simulates crops. It represents photosynthesis and the water, carbon and nitrogen cycles mechanistically, so wild vegetation and fields of wheat, barley, sorghum and millet can be followed side by side on the same grid.',
      'The model is calibrated on the present only, then run from 15,000 years ago to today with reconstructed climate, rainfall and CO₂. It is tested against past records it never saw, such as pollen and dated archaeological sites. Experiments then hold single factors fixed, such as CO₂, climate or rainfall variability, to see which one mattered for the harvest.',
    ],
    team: [P.ordonez, P.madella, P.whitehouse, P.schoeman],
    funding: MSCA,
    links: [{ label: 'About LPJmL (Potsdam Institute for Climate Impact Research)', href: 'https://www.pik-potsdam.de/en/institute/departments/activities/biosphere-water-modelling/lpjml' },
      { label: 'Patch, a playable model inspired by LPJmL, made for outreach', href: '/studio/patch' },
    ],
  },
  {
    slug: 'farming-in-context',
    title: 'What farming’s past can tell us about the crops we grow next',
    status: 'ongoing',
    output: 'In preparation',
    role: 'Lead author',
    era: 'now',
    period: 'PhD chapter 3',
    where: 'Aarhus University, AGRI-DRY',
    summary: 'Linking the long history of crops in Africa and the Mediterranean with today’s choices, from opportunity crops to climate projections, to ask which changes in what we grow fit a place.',
    methods: ['AGRI-DRY crop database', 'Crop statistics', 'Climate projections'],
    art: { kind: 'context' },
    aims: [
      'Find which cereals and pulses have a long documented history in each place across Africa and the Mediterranean.',
      'Set that history beside today’s debates: the crops that policy now promotes, such as opportunity and forgotten crops, and the changes that climate projections imply.',
      'Ask what such changes would mean for what food systems provide: nutrition, reliable harvests, livelihoods and the environment.',
    ],
    approach: [
      'Three debates that are usually kept apart are brought together. The past comes from dated crop records in the AGRI-DRY crop database, built within the network by <a href="https://agri-dry.org/our-team/doctoral-candidates/thamary-mukuya/">Thamary Mukuya</a>. The present comes from crop statistics and maps. The future comes from mid-century projections of crop yields and suitability, and from current crop recommendations.',
    ],
    team: [P.ordonez, P.whitehouse, P.madella, P.schoeman, P.mukuya],
    funding: MSCA,
  },
  {
    slug: 'learning-from-adaptation',
    title: 'What past societies can teach climate adaptation after 2030',
    status: 'completed',
    output: 'Under review',
    role: 'Lead author',
    era: 'next',
    period: 'AGRI-DRY network paper',
    where: 'AGRI-DRY network',
    summary: 'TRACE, a framework for turning archaeological and historical evidence of how people adapted to climate into options for sustainable adaptation after 2030.',
    methods: ['TRACE framework', 'Evidence synthesis', 'Mapping'],
    art: { kind: 'strata' },
    aims: [
      'Show how archaeological and historical records of adaptation can inform climate adaptation beyond 2030.',
      'Give a structured way to judge which past practices can transfer to today’s conditions, and which cannot.',
    ],
    approach: [
      'Together with archaeologists, ecologists and modellers across the AGRI-DRY network, we gathered documented cases of long-term adaptation and grouped them into seven families of mechanisms: mobility and resource tracking, diversification and risk spreading, storage and buffering, soil and water engineering, biodiversity and regeneration, knowledge and governance, and reorganisation and transformation.',
      'TRACE turns such cases into usable options in five steps: <b>T</b>ranslate documented practices, <b>R</b>econstruct the adaptive mechanisms behind them, <b>A</b>ssess the evidence and the environmental constraints, <b>C</b>heck whether they can transfer to today, and <b>E</b>nable their responsible use.',
    ],
    team: [
      P.scaglia,
      { name: 'Sara Krubeck', href: `${AD}/our-team/doctoral-candidates/sara-krubeck/` },
      { name: 'Mncedisi Taala', href: `${AD}/our-team/doctoral-candidates/mncedisi-taala/` },
      { name: 'Wudu Abiye', href: `${AD}/our-team/doctoral-candidates/wudu-abiye/` },
      P.mukuya,
      P.chingono,
      { name: 'Tawanda Mushweshwe', href: `${AD}/our-team/doctoral-candidates/tawanda-mushweshwe/` },
      { name: 'Kayla Mac Conachie', href: `${AD}/our-team/doctoral-candidates/kayla-storm-mac-conachie/` },
      { name: 'Alexandra Vasilyeva', href: `${AD}/our-team/doctoral-candidates/alexandra-vasilyeva/` },
      P.schoeman,
      P.whitehouse,
      P.madella,
      { name: 'Stefano Biagetti', href: `${AD}/team/pi/stefano-biagetti/` },
      P.ordonez,
    ],
    funding: MSCA,
  },
  {
    slug: 'plant-biodiversity-400-million-years',
    title: 'Plant biodiversity over 400 million years',
    status: 'completed',
    output: 'Master’s thesis',
    outputLink: '/files/Mudit-Joshi-MSc-thesis-2024.pdf',
    role: 'Lead author',
    era: 'deep',
    period: 'Master’s thesis, 2024',
    where: 'Ecosystems and Landscape Evolution group, ETH Zurich, and Kiel University',
    summary: 'I simulated how plant diversity emerged and changed since the Devonian with the eco-evolutionary model gen3sis, driven by reconstructed palaeogeography, CO₂ and climate under three scenarios, and tracked 36 biodiversity metrics through time.',
    methods: ['gen3sis', 'R', 'Eco-evolutionary modelling', 'Palaeogeography, CO₂ and climate', 'Biodiversity metrics'],
    art: { src: '/img/thesis-richness.webp', alt: 'Simulated plant species richness on today’s continents, from my master’s thesis' },
    aims: [
      'How are changes in temperature and palaeogeography over geological time linked to the evolution of plant species richness?',
      'How do extreme CO₂ peaks, as in mass extinctions, and a constant CO₂ level change that evolution?',
      'How do taxonomic, phylogenetic and functional diversity differ between these scenarios?',
    ],
    approach: [
      'gen3sis is a mechanistic engine for eco-evolutionary simulations: species disperse, adapt, speciate and go extinct on a changing landscape, following explicit rules. Plants had not yet been simulated with it.',
      'I built gridded landscapes for the last 400 million years at 500,000-year steps, from palaeogeographies by Scotese and Wright and temperature and aridity derived from three CO₂ scenarios: the most probable CO₂ curve, a constant median CO₂, and a curve with the extreme CO₂ peaks of four mass extinctions. I then simulated the emergence of 100 plant clades in each scenario and compared them with 36 biodiversity metrics.',
    ],
    results: [
      'Simulated plant richness rose slowly until about 250 million years ago, then sharply to a peak in the Late Cretaceous, around 100 million years ago, with rises and falls through the Cenozoic. The overall shape follows published curves for vascular plants.',
      'A latitudinal diversity gradient emerged on its own as the continents moved.',
      'The rate of temperature change was moderately linked to the rate of change in richness (Spearman ρ = 0.36). Changes in continental area hardly mattered (ρ = −0.11).',
      'The constant-CO₂ scenario ended with the most species and the mass-extinction scenario with the fewest. The gap was widest after the end-Cretaceous extinction, which hit plants harder in the model than earlier extinctions.',
      'Even so, today’s patterns were surprisingly similar across scenarios, and most metrics separated them only weakly. The lesson: process-based models are sensitive to the palaeo-environmental inputs they are given, and need to be read through time, not only at the end.',
    ],
    figures: [
      { in: 'approach', src: '/img/work/thesis-inputs.webp', width: 1378, height: 1331, alt: 'Maps of palaeogeography, temperature and aridity at 0, 100, 200, 300 and 400 million years ago', caption: 'The landscapes that drove the model: elevation, temperature and aridity at five points in time.' },
      { in: 'results', src: '/img/work/thesis-richness-maps.webp', width: 1190, height: 1822, alt: 'Maps of simulated plant species richness at 400, 300, 200, 100 and 0 million years ago', caption: 'Simulated plant species richness as the continents moved, from 400 million years ago to today.' },
      { in: 'results', src: '/img/work/thesis-scenarios.webp', width: 1052, height: 572, alt: 'Line chart of mean species richness over 400 million years for the three CO₂ scenarios', caption: 'Mean species richness under the three CO₂ scenarios: most probable (blue), constant median (green) and mass extinctions (red).' },
    ],
    links: [
      { label: 'Read the thesis (PDF)', href: '/files/Mudit-Joshi-MSc-thesis-2024.pdf' },
      { label: 'Code on GitHub', href: 'https://github.com/joshimudit/Masters-thesis-gen3sis' },
    ],
    team: [
      { name: 'Loïc Pellissier', href: 'https://ethz.ch/en/the-eth-zurich/organisation/who-is-who/usys/details.html?persid=216059', role: 'supervisor' },
      { name: 'Julian Rogger', href: 'https://orcid.org/0000-0002-8833-1861' },
      { name: 'Wilhelmine Bach', href: 'https://scholar.google.com/citations?user=ALDcBQUAAAAJ' },
      { name: 'Tim Diekötter', href: 'https://www.uni-kiel.de/de/person/diekoetter-tim-5728', role: 'second supervisor' },
    ],
  },
];
