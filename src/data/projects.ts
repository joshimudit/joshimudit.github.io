// Projects shown on the Work page. Only the four main PhD papers are public for now.
// status: 'ongoing' | 'completed'
// output: 'In preparation' | 'Submitted' | 'Under review' | 'Preprint' | 'Published' | 'PDF'
// era: where the project sits on the Home time ruler.

export type Project = {
  slug: string;
  title: string;
  short: string;
  status: 'ongoing' | 'completed';
  output: string;
  outputLink?: string;
  role: string;
  era: 'deep' | 'holocene' | 'now' | 'next';
  summary: string[];
  methods: string[];
  people?: { name: string; href?: string }[];
};

export const projects: Project[] = [
  {
    slug: 'crop-niches-holocene',
    title: 'Where could the first farmers grow their crops?',
    short: 'Crop niches across the Holocene',
    status: 'ongoing',
    output: 'In preparation',
    role: 'Lead author',
    era: 'holocene',
    summary: [
      'Farming spread into Africa’s drylands while the climate was shifting under it. This project maps where key crops could have grown at each step of the last 10,000 years.',
      'It pairs palaeoclimate reconstructions with crop suitability modelling, so the archaeological record can be read against what the climate allowed.',
    ],
    methods: ['EcoCrop suitability modelling', 'Palaeoclimate reconstructions', 'R'],
  },
  {
    slug: 'holocene-crop-productivity',
    title: 'How productive was early farming?',
    short: 'Simulating Holocene crop productivity with LPJmL',
    status: 'ongoing',
    output: 'In preparation',
    role: 'Lead author',
    era: 'holocene',
    summary: [
      'Suitability says where a crop could grow; it does not say how much it would yield. Here I run the process-based LPJmL vegetation and crop model through the Holocene to estimate productivity and how it changed.',
    ],
    methods: ['LPJmL', 'Process-based modelling', 'High-performance computing'],
  },
  {
    slug: 'agricultural-novelty',
    title: 'Is today’s farming entering conditions it has never seen?',
    short: 'Agricultural novelty',
    status: 'ongoing',
    output: 'In preparation',
    role: 'Lead author',
    era: 'now',
    summary: [
      'Using 10,000 years of farming history as a baseline, this project asks whether today’s food systems are moving into climates and ecological roles without precedent, and what that means for building resilient, biodiversity-positive agriculture.',
    ],
    methods: ['Novelty metrics', 'Palaeo and modern climate data', 'Systems analysis'],
  },
  {
    slug: 'trace-framework',
    title: 'Using the past to plan climate adaptation beyond 2030',
    short: 'The TRACE framework',
    status: 'ongoing',
    output: 'Under review',
    role: 'Lead author',
    era: 'next',
    summary: [
      'People have adapted farming to changing climates for millennia. TRACE is a five-step framework for turning that long-term evidence into adaptation options that still hold up after 2030, without romanticising the past.',
      'Written with archaeologists, ecologists and modellers across the AGRI-DRY network, for the journal Geography & Sustainability.',
    ],
    methods: ['Framework design', 'Evidence synthesis', 'Maps and data analysis'],
    people: [
      { name: 'Sara Scaglia' },
      { name: 'Nicki Whitehouse' },
      { name: 'Marco Madella' },
      { name: 'Alejandro Ordonez' },
      { name: 'and colleagues across AGRI-DRY', href: 'https://agri-dry.org' },
    ],
  },
];
