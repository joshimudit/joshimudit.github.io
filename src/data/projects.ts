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
  myPart?: string;
  results?: string[];
  figures?: { src: string; alt: string; caption: string; width: number; height: number; in: 'approach' | 'results' }[];
  links?: { label: string; href: string }[];
  funding?: string;
};

const SUP = [
  { name: 'Alejandro Ordonez', href: 'https://bio.au.dk/en/about-biology/contact/show/person/alejandro.ordonez@bio.au.dk', role: 'main supervisor' },
  { name: 'Nicki Whitehouse', href: 'https://www.gla.ac.uk/schools/humanities/staff/nickiwhitehouse/', role: 'co-supervisor' },
  { name: 'Marco Madella', href: 'https://icrea.cat/Web/ScientificStaff/Marco-Madella-330', role: 'co-supervisor' },
];
const MSCA = 'Funded by the European Union’s Horizon Europe research and innovation programme under the Marie Skłodowska-Curie Grant Agreement No 101120560 (AGRI-DRY).';

const AD = 'https://agri-dry.org';

export const projects: Project[] = [
  {
    slug: 'crops-and-climate',
    title: 'Crops and climate across the Holocene',
    status: 'ongoing',
    output: 'In preparation',
    role: 'Lead author',
    era: 'holocene',
    period: 'PhD chapter 1',
    where: 'Aarhus University, AGRI-DRY',
    summary: 'How climate shaped where early farmers could grow their crops as farming spread into the drylands of Africa and the Mediterranean.',
    methods: ['Crop suitability modelling', 'Palaeoclimate data', 'R'],
    art: { kind: 'niches' },
    aims: [
      'Map where key dryland crops could grow at different points of the last 12,000 years.',
      'Test whether climate opened or closed the routes along which farming spread through the Mediterranean, North Africa, the Sahara and southern Africa.',
      'Separate what climate allowed from what early farmers chose to do.',
    ],
    approach: [
      'Palaeoclimate reconstructions give the conditions at each place and time. A crop suitability model, EcoCrop, turns those conditions into a measure of how well each crop could grow there, based on the temperature and rainfall it tolerates.',
      'Repeating this through the Holocene gives a moving map of where each crop was possible, which is then set against the timing and routes of farming’s spread.',
    ],
    team: SUP,
    funding: MSCA,
  },
  {
    slug: 'simulating-early-farming',
    title: 'Simulating early farming',
    status: 'ongoing',
    output: 'In preparation',
    role: 'Lead author',
    era: 'holocene',
    period: 'PhD chapter 2',
    where: 'Aarhus University, AGRI-DRY',
    summary: 'Following crops and natural vegetation together through the last 12,000 years with a process-based model.',
    methods: ['LPJmL', 'Vegetation modelling', 'High-performance computing'],
    art: { kind: 'productivity' },
    aims: [
      'Simulate how the productivity of crops and natural vegetation changed across the Holocene in the drylands of Africa and the Mediterranean.',
      'Compare how crops and natural ecosystems respond to the same changes in climate and CO₂.',
      'Give the first study a mechanistic counterpart: not only where crops could grow, but how well.',
    ],
    approach: [
      'I use LPJmL, a dynamic global vegetation model that also simulates crops. It represents photosynthesis, respiration and the water and carbon cycles mechanistically, so natural vegetation and cropland can be followed side by side on the same grid.',
      'The model is driven with palaeoclimate and atmospheric CO₂ for the last 12,000 years. The runs are made on high-performance computing.',
    ],
    team: SUP,
    funding: MSCA,
    links: [{ label: 'About LPJmL (Potsdam Institute for Climate Impact Research)', href: 'https://www.pik-potsdam.de/en/institute/departments/activities/biosphere-water-modelling/lpjml' }],
  },
  {
    slug: 'farming-in-context',
    title: 'Today’s farming in a 12,000-year context',
    status: 'ongoing',
    output: 'In preparation',
    role: 'Lead author',
    era: 'now',
    period: 'PhD chapter 3',
    where: 'Aarhus University, AGRI-DRY',
    summary: 'Setting the conditions farming faces today against its long history, to inform resilient, biodiversity-positive food systems.',
    methods: ['Climate data', 'Systems analysis', 'Python'],
    art: { kind: 'context' },
    aims: [
      'Place the climate and ecological conditions of today’s farming within the range farming has met since it began.',
      'Ask what that long view adds to planning climate-resilient, biodiversity-positive food systems in drylands and beyond.',
    ],
    approach: [
      'This study builds on the first two. It compares present-day conditions of cropland with conditions reconstructed for the past 12,000 years, using climate data and a systems view of how crops, ecosystems and people interact.',
    ],
    team: SUP,
    funding: MSCA,
  },
  {
    slug: 'learning-from-adaptation',
    title: 'Learning from long-term adaptation',
    status: 'completed',
    output: 'Under review',
    role: 'Lead author',
    era: 'next',
    period: 'AGRI-DRY network paper',
    where: 'AGRI-DRY network',
    summary: 'A framework for turning long-term evidence of how people adapted to climate into options for the decades after 2030.',
    methods: ['Framework design', 'Evidence synthesis', 'Mapping'],
    art: { kind: 'strata' },
    aims: [
      'Show how archaeological and historical records of adaptation can inform climate adaptation beyond 2030.',
      'Give a structured way to judge which past practices can transfer to today’s conditions, and which cannot.',
    ],
    approach: [
      'Together with archaeologists, ecologists and modellers across the AGRI-DRY network, we synthesised documented cases of long-term adaptation and grouped them by the mechanism behind them.',
      'We then built a step-by-step framework for checking the evidence, the environmental constraints and the transferability of each practice before it is used in planning.',
    ],
    myPart: 'I designed the framework, wrote most of the first draft, made the figures and maps, and lead the paper as first and corresponding author.',
    team: [
      { name: 'Sara Scaglia', href: `${AD}/our-team/doctoral-candidates/sara-scaglia/` },
      { name: 'Sara Krubeck', href: `${AD}/our-team/doctoral-candidates/sara-krubeck/` },
      { name: 'Mncedisi Taala', href: `${AD}/our-team/doctoral-candidates/mncedisi-taala/` },
      { name: 'Wudu Abiye', href: `${AD}/our-team/doctoral-candidates/wudu-abiye/` },
      { name: 'Thamary Mukuya', href: `${AD}/our-team/doctoral-candidates/thamary-mukuya/` },
      { name: 'Paidamoyo Chingono', href: `${AD}/our-team/doctoral-candidates/paidamoyo-hazel-chingono/` },
      { name: 'Tawanda Mushweshwe', href: `${AD}/our-team/doctoral-candidates/tawanda-mushweshwe/` },
      { name: 'Kayla Mac Conachie', href: `${AD}/our-team/doctoral-candidates/kayla-storm-mac-conachie/` },
      { name: 'Alexandra Vasilyeva', href: `${AD}/our-team/doctoral-candidates/alexandra-vasilyeva/` },
      { name: 'Alex Schoeman', href: `${AD}/our-team/pis-and-supervisors/alex-schoeman/` },
      { name: 'Nicki Whitehouse', href: `${AD}/our-team/pis-and-supervisors/nicki-whitehouse/` },
      { name: 'Marco Madella', href: `${AD}/our-team/pis-and-supervisors/marco-madella/` },
      { name: 'Stefano Biagetti', href: `${AD}/team/pi/stefano-biagetti/` },
      { name: 'Alejandro Ordonez', href: `${AD}/our-team/pis-and-supervisors/alejandro-ordonez-gloria/` },
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
      { name: 'Loïc Pellissier', href: 'https://ele.ethz.ch/', role: 'supervisor, ETH Zurich' },
      { name: 'Tim Diekötter', href: 'https://www.uni-kiel.de/de/person/diekoetter-tim-5728', role: 'second supervisor, Kiel University' },
      { name: 'Wilhelmine Bach', href: 'https://ele.ethz.ch/', role: 'ETH Zurich' },
      { name: 'Julian Rogger', href: 'https://ele.ethz.ch/', role: 'ETH Zurich' },
    ],
  },
];
