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
  role: string;
  era: 'deep' | 'holocene' | 'now' | 'next';
  summary: string;
  methods: string[];
  art: { kind: 'niches' | 'productivity' | 'context' | 'strata' } | { src: string; alt: string };
  people?: { name: string; href?: string }[];
};

export const projects: Project[] = [
  {
    slug: 'crops-and-climate',
    title: 'Crops and climate across the Holocene',
    status: 'ongoing',
    output: 'In preparation',
    role: 'Lead author',
    era: 'holocene',
    summary: 'How climate shaped where early farmers could grow their crops as farming spread into Africa’s drylands.',
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
    summary: 'Following farming through the last 10,000 years with a process-based vegetation and crop model.',
    methods: ['LPJmL', 'Process-based modelling', 'High-performance computing'],
    art: { kind: 'productivity' },
  },
  {
    slug: 'farming-in-context',
    title: 'Today’s farming in a 10,000-year context',
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
    people: [{ name: 'colleagues across the AGRI-DRY network', href: 'https://agri-dry.org/team/' }],
  },
  {
    slug: 'plant-biodiversity-400-million-years',
    title: 'Plant biodiversity over 400 million years',
    status: 'completed',
    output: 'Master’s thesis (PDF)',
    outputLink: '/files/Mudit-Joshi-MSc-thesis-2024.pdf',
    role: 'ETH Zurich and Kiel University, 2024',
    era: 'deep',
    summary: 'I simulated how plant diversity evolved with climate since the Devonian, running the mechanistic model gen3sis under three palaeoclimate scenarios and tracking 36 biodiversity metrics through time.',
    methods: ['gen3sis', 'R', 'Palaeoclimate scenarios', 'Biodiversity metrics'],
    art: { src: '/img/thesis-richness.webp', alt: 'Simulated plant species richness on today’s continents, from my master’s thesis' },
    people: [
      { name: 'Loïc Pellissier' },
      { name: 'Wilhelmine Bach' },
      { name: 'Julian Rogger' },
    ],
  },
];
