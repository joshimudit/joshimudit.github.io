// Everything on the CV page. Edit here; the page and its PDF follow.

export const education = [
  {
    when: 'Dec 2024 – Nov 2027',
    what: 'PhD, Section of Ecoinformatics and Biodiversity, Aarhus University',
    where: 'Denmark',
    detail: 'Modelling key crop environmental niches and productivity over the Holocene. Marie Skłodowska-Curie doctoral network AGRI-DRY.',
  },
  {
    when: '2023 – 2024',
    what: 'Master’s thesis, ETH Zurich',
    where: 'Switzerland',
    detail: 'Simulating the eco-evolution of plant biodiversity with climate over the last 400 million years. Supervised by Prof. Loïc Pellissier, working with Wilhelmine Bach and Julian Rogger.',
    link: { label: 'Read the thesis (PDF)', href: '/files/Mudit-Joshi-MSc-thesis-2024.pdf' },
  },
  {
    when: '2024',
    what: 'MSc Environmental Management, Kiel University',
    where: 'Germany',
    detail: 'Graduated June 2024 with a final grade of 1.4.',
  },
  {
    when: '2021',
    what: 'Erasmus double degree semester, Adam Mickiewicz University',
    where: 'Poland',
  },
  {
    when: '2016 – 2020',
    what: 'BSc Agriculture, G.B. Pant University of Agriculture and Technology',
    where: 'India',
  },
];

export const experience = [
  {
    when: 'Dec 2024 – present',
    what: 'PhD researcher, Section of Ecoinformatics and Biodiversity, Aarhus University',
    where: 'Denmark',
    points: [
      'Modelling crop environmental niches and productivity over the Holocene in the Marie Skłodowska-Curie doctoral network AGRI-DRY.',
      'Lead author of four papers, in preparation or under review.',
      'Research stays in South Africa and at the University of Glasgow.',
    ],
  },
  {
    when: '2023 – 2024',
    what: 'Master’s project, Department of Environmental Systems Science, ETH Zurich',
    where: 'Switzerland',
    points: [
      'Simulated global plant diversity over deep time with the R-based mechanistic model gen3sis and PlaSim climate data.',
      'Tracked 36 biodiversity metrics through time to test how sensitive the model is to climate reconstructions.',
    ],
  },
  {
    when: '2023 – 2024',
    what: 'Python projects, Campus Business Box e.V.',
    where: 'Kiel, Germany',
    points: [
      'Built regression neural networks, RNNs and LSTMs on text and time-series data with TensorFlow and scikit-learn.',
      'Created a Tkinter app that teaches students the basics of machine learning.',
    ],
  },
  {
    when: '2023 – 2024',
    what: 'Project assistant, SEA-EU European University of the Seas',
    where: 'Kiel, Germany',
    points: [
      'Coordinated science communication and exchanges across an alliance of nine European universities.',
      'Managed databases and statistics for decision-making.',
    ],
  },
  {
    when: '2021 – 2022',
    what: 'Research assistant, Department of Landscape Ecology, Kiel University',
    where: 'Germany',
    points: ['Lab protocols and statistical analysis on the effects of veterinary pharmaceuticals on non-target organisms.'],
  },
  {
    when: '2020 – 2022',
    what: 'Intern, Institute of Himalayan Environmental Research and Education',
    where: 'India',
    points: [
      'Supported the Government of India’s National Mission on Himalayan Studies.',
      'Led low-input sustainable agriculture work in 20 Western Himalayan villages: design, data collection and reporting.',
    ],
  },
];

export const skills = [
  { group: 'Modelling', items: ['LPJmL', 'gen3sis', 'EcoCrop', 'Process-based and mechanistic models', 'Numerical simulation'] },
  { group: 'Data and AI', items: ['Python', 'R', 'Machine learning (random forests, neural networks)', 'Statistics', 'AI agents'] },
  { group: 'Earth system', items: ['Palaeoclimate data', 'Crop suitability', 'Biodiversity metrics', 'Spatial analysis'] },
  { group: 'Working', items: ['High-performance computing', 'Data visualisation', 'Project management', 'Science communication'] },
];

export const languages = ['English', 'Hindi', 'German'];

export const honours = [
  'Best poster award, iCROPM 2026 crop modelling symposium, Florence, 2026',
  'Marie Skłodowska-Curie doctoral fellowship, AGRI-DRY',
  'Erasmus scholarship, Adam Mickiewicz University',
  'NSS Best Volunteer Award, National Service Scheme, India',
  'Student representative on the examination board, MSc Environmental Management, Kiel University',
];
