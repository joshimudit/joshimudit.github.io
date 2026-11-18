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
    'I build models of how climate, crops and ecosystems shape each other, and I use the deep past to test ideas about where food systems go next.',
  about: [
    'My PhD treats the last 10,000 years as a natural experiment: how did climate decide where people could farm, especially as farming spread into the drylands of Africa? I combine palaeoclimate reconstructions, crop suitability modelling and the LPJmL vegetation and crop model to answer that.',
    'Before that I went much further back. For my master’s thesis at ETH Zurich I simulated how plant biodiversity evolved with climate over 400 million years.',
    'What ties it together is systems thinking: turning uncertain, messy environmental data into models people can reason with. Lately that includes AI agents, used carefully and evaluated in the open.',
  ],
};

export const links = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/muditjoshi296/' },
  { label: 'ORCID', href: 'https://orcid.org/0000-0001-9583-9404' },
  { label: 'GitHub', href: 'https://github.com/joshimudit' },
  { label: 'AGRI-DRY profile', href: 'https://agri-dry.org/team/dc/mudit-joshi/' },
];

// Places Mudit has studied, worked or collaborated. Shown on Home.
export const places = [
  { name: 'Aarhus University', country: 'Denmark', what: 'PhD' },
  { name: 'University of Glasgow', country: 'United Kingdom', what: 'Research secondment' },
  { name: 'ETH Zurich', country: 'Switzerland', what: 'Master’s thesis' },
  { name: 'Kiel University', country: 'Germany', what: 'MSc' },
  { name: 'Adam Mickiewicz University', country: 'Poland', what: 'Erasmus semester' },
  { name: 'G.B. Pant University of Agriculture and Technology', country: 'India', what: 'BSc' },
];

// Contact form. Get a free access key at https://web3forms.com (enter the inbox
// address that should receive messages) and paste it here. Empty = form shows
// the email address instead.
export const web3formsKey = '';
