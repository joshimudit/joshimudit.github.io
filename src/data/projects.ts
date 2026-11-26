// Projects shown on the Work page and the Home time ruler.
// Unpublished papers use theme titles only: no real titles, results or concept names.
// status: 'ongoing' | 'completed'
// output: 'In preparation' | 'Submitted' | 'Under review' | 'Preprint' | 'Published' | 'PDF'
// art: a drawn concept graphic (see components/ProjectArt.astro) or an image path.

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
  team?: { name: string; href?: string }[];
};

const AD = 'https://agri-dry.org';

export const projects: Project[] = [
  {
    slug: 'crops-and-climate',
    title: 'Crops and climate across the Holocene',
    status: 'ongoing',
    output: 'In preparation',
    role: 'Lead author',
    era: 'holocene',
    summary: 'How climate shaped where early farmers could grow their crops as farming spread into the dryland ecosystems of Africa.',
    methods: ['Crop suitability modelling', 'Palaeoclimate data', 'R'],
    art: { kind: 'niches' },
  },
  {
    slug: 'simulating-early-farming',
    title: 'Simulating early farming',
    status: 'ongoing',
    output: 'In preparation',
    role: 'Lead author',
    era: 'holocene',
    summary: 'Following crops and natural vegetation together through the last 12,000 years with a process-based model.',
    methods: ['LPJmL', 'Vegetation modelling', 'High-performance computing'],
    art: { kind: 'productivity' },
  },
  {
    slug: 'farming-in-context',
    title: 'Today’s farming in a 12,000-year context',
    status: 'ongoing',
    output: 'In preparation',
    role: 'Lead author',
    era: 'now',
    summary: 'Setting the conditions farming faces today against its long history, to inform resilient, biodiversity-positive food systems.',
    methods: ['Climate data', 'Systems analysis', 'Python'],
    art: { kind: 'context' },
  },
  {
    slug: 'learning-from-adaptation',
    title: 'Learning from long-term adaptation',
    status: 'ongoing',
    output: 'Under review',
    role: 'Lead author',
    era: 'next',
    summary: 'A framework for turning long-term evidence of how people adapted to climate into options for the decades ahead.',
    methods: ['Framework design', 'Evidence synthesis', 'Mapping'],
    art: { kind: 'strata' },
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
  },
  {
    slug: 'plant-biodiversity-400-million-years',
    title: 'Plant biodiversity over 400 million years',
    status: 'completed',
    output: 'Master’s thesis (PDF)',
    outputLink: '/files/Mudit-Joshi-MSc-thesis-2024.pdf',
    role: 'Lead author',
    note: 'ETH Zurich and Kiel University, 2024',
    era: 'deep',
    summary: 'I simulated how plant diversity arose since the Devonian with the eco-evolutionary model gen3sis, driven by reconstructed palaeogeography, CO₂ and climate under three scenarios, and tracked 36 biodiversity metrics through time.',
    methods: ['gen3sis', 'R', 'Eco-evolutionary modelling', 'Palaeogeography, CO₂ and climate', 'Biodiversity metrics'],
    art: { src: '/img/thesis-richness.webp', alt: 'Simulated plant species richness on today’s continents, from my master’s thesis' },
    team: [
      { name: 'Loïc Pellissier', href: 'https://ele.ethz.ch/' },
      { name: 'Wilhelmine Bach', href: 'https://ele.ethz.ch/' },
      { name: 'Julian Rogger', href: 'https://ele.ethz.ch/' },
      { name: 'Tim Diekötter', href: 'https://www.uni-kiel.de/de/person/diekoetter-tim-5728' },
    ],
  },
];
