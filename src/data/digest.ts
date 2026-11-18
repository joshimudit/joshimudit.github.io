// This Week: one entry per issue, newest first. The page shows the newest
// issue in full and keeps every older one in the archive below it.
//
// Rules for every item:
// - It links to the original, and every fact in it was read in that original.
// - Words are our own: a short summary, never copied paragraphs.
// - `home: true` marks India items (shown with a "From home" tag). Usually one, sometimes two.
// - `take` is Mudit's one line. Leave it out until he writes it; the page hides it when empty.

export type DigestItem = {
  title: string;
  summary: string;
  why: string;
  source: string; // who published the piece we link to
  url: string;
  date: string; // date of the original, 'YYYY-MM-DD'
  home?: boolean;
  take?: string;
};

export type Issue = {
  number: number;
  date: string; // publication date of the issue, 'YYYY-MM-DD'
  items: DigestItem[];
};

export const issues: Issue[] = [
  {
    number: 1,
    date: '2026-11-18',
    items: [
      {
        title: 'Plastic in the blood of animals far from any town',
        summary:
          'In Brazil’s Pantanal wetland, a team led by veterinarian Marcia Ferraz found microplastics in the blood of giant anteaters and tapirs, including 14 animals living more than 40 miles from the nearest town or building. Animals living closer to people carried more.',
        why:
          'Levels were roughly the same across species with very different sizes and diets, so the plastic is not just climbing the food chain. It is in the landscape itself. The youngest animal had the highest level.',
        source: 'National Geographic',
        url: 'https://www.nationalgeographic.com/environment/article/microplastic-brazilian-pantanal-wildlife-anteaters-tapirs',
        date: '2026-11-12',
      },
      {
        title: 'The warning arrived. Most people still stayed.',
        summary:
          'Household surveys after cyclones in Madagascar, Malawi and Mozambique found that 77 to 90 per cent of people received a warning, yet fewer than half of those who got one evacuated. Warnings came too late, were doubted, or reached people with no means to leave.',
        why:
          'The number of countries with early-warning systems has more than doubled since 2015, and that is rightly celebrated. This study is a reminder that a forecast only protects people who can trust it and act on it.',
        source: 'University of Bristol · Bulletin of the American Meteorological Society',
        url: 'https://www.bristol.ac.uk/news/2026/november/climate-vulnerable-africa.html',
        date: '2026-11-02',
      },
      {
        title: 'The unfunded half of farming',
        summary:
          'A report launched at COP31 by IFAD and Türkiye’s agriculture ministry finds that 80 per cent of international public climate finance for agrifood systems considers gender equality in some way, but only 3 per cent, about US$855 million a year, has it as the main goal.',
        why:
          'Women make up around four in ten farm workers worldwide, yet have less access to land and farm inputs, and earn 82 cents for every dollar men earn in farm wage work. The report calls them “the investable half”: reliable borrowers who, with finance, help whole farms and families adapt. A finance gap, not just a social one.',
        source: 'IFAD',
        url: 'https://www.ifad.org/en/w/publications/scaling-gender-and-climate-investment-opportunities',
        date: '2026-11-09',
      },
      {
        title: 'Judge AI agents as a team, not one by one',
        summary:
          'AI is moving from single models to systems of agents that plan, message each other, call tools and split work. The authors argue that evaluating each agent alone is no longer enough, and propose a framework that links how agents interact, how they are arranged, and what happens over time.',
        why:
          'Anyone who studies ecosystems or societies will recognise the point: behaviour emerges from interactions. A group of capable agents can still fail as a group, and that is where testing now needs to look.',
        source: 'Nature Communications',
        url: 'https://www.nature.com/articles/s41467-026-78879-x',
        date: '2026-11-06',
      },
      {
        title: 'Can saving groundwater pay an Indian farmer?',
        summary:
          'Groundwater researcher Tushaar Shah talks with Veena Srinivasan about how India’s groundwater economy grew, why subsidised electricity reshaped irrigation, Gujarat’s Jyotigram reforms, solar pumps that let farmers sell spare power to the grid, recharge, and rising salinity in Punjab.',
        why:
          'It treats depletion as a problem of incentives rather than of water alone. The fix sits across energy, water and farm policy at the same time, which is exactly why it is hard.',
        source: 'The Water Data Podcast · WELL Labs',
        url: 'https://welllabs.org/wdp-tushaar-shah/',
        date: '2026-11-10',
        home: true,
      },
    ],
  },
];

export function formatDay(d: string) {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
