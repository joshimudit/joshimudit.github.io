// This Week: one entry per issue, newest first. The page shows the newest
// issue in full and keeps every older one in the archive below it.
//
// Rules for every item:
// - It links to the original, and every fact in it was read in that original.
// - Words are our own: a short summary, never copied paragraphs.
// - `home: true` marks the "From home" item (tag reads "From home · Uttarakhand" and links to
//   Incredible India's Uttarakhand page): Uttarakhand first, the wider Himalaya as fallback,
//   and skipped in weeks with nothing good. Other India news can sit among the regular items.
// - `image` is the preview image the source itself publishes for the article (its og:image),
//   shown as a thumbnail that links to the original.
// - `illustration` is used only when the source has no usable image: the name of a small,
//   minimal drawing made for that specific story, in src/assets/digest/<name>.svg.
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
  image?: string;
  imageAlt?: string;
  illustration?: string;
};

export type Issue = {
  number: number;
  date: string; // publication date of the issue, 'YYYY-MM-DD'
  items: DigestItem[];
};

export const issues: Issue[] = [
  {
    number: 2,
    date: '2026-11-23',
    items: [
      {
        title: '245 animals living inside one deep-sea rock',
        summary:
          'Researchers at MARUM, University of Bremen, examined 244 metal-rich nodules from the Pacific’s Clarion-Clipperton Zone, 4,000 to 6,000 metres down, and found 4,139 animals smaller than a millimetre living in their cracks. One nodule alone held 245.',
        why:
          'The nodule communities are unlike those in the surrounding mud, yet similar to each other across sites up to 1,000 km apart. These are the rocks deep-sea miners want for nickel, cobalt and copper, and they take millions of years to form, so losing them could be permanent.',
        source: 'ScienceDaily · Scientific Reports',
        url: 'https://www.sciencedaily.com/releases/2026/11/261114202133.htm',
        date: '2026-11-16',
        image: 'https://www.sciencedaily.com/images/1920/polymetallic-nodules-in-clarion-clipperton-fracture-zone.webp',
        imageAlt: 'A small crustacean among dark polymetallic nodules on the deep Pacific seafloor',
      },
      {
        title: 'Less land, more money per hectare',
        summary:
          'A nine-year evaluation of Kenya’s Farm to Market Alliance, which links about 400,000 smallholders to inputs, training and buyers through 2,126 farmer service centres, finds women earn about 18 per cent more per hectare than men, on plots averaging 1.9 acres against 2.8.',
        why:
          'Per hectare is not the whole story. Service centres run by women average about KES 144,000 a year in profit against KES 515,000 for those run by men, and own fewer machines; women can lose up to half their bean harvest shelling by hand. The skill is there. The capital is not.',
        source: 'allAfrica',
        url: 'https://allafrica.com/stories/202611200236.html',
        date: '2026-11-20',
        illustration: 'kenya-plots',
      },
      {
        title: 'What happens when 936 AI scientists share a preprint server',
        summary:
          'Over twelve weeks, 35 labs ran 936 autonomous AI agents that shared a preprint server and a chat workspace. They produced 936 studies with code and data, retracted some of their own mistakes and even set up their own peer-review journal. Blinded reviewers rated the work higher on rigour but lower on novelty than human preprints.',
        why:
          'The failures look familiar. Told to draft a proposal without citations, agents reused a paper’s method without credit in 42 of 48 trials, although all of them said afterwards that citing was required. A false result refuted twice still left 95–98 per cent of later agents calling the question “contested”. The norms of science do not come free with the tools.',
        source: 'alphaXiv preprint, not yet peer reviewed',
        url: 'https://www.alphaxiv.org/abs/2611.society-ai-scientists.pdf',
        date: '2026-11-21',
        illustration: 'ai-scientists',
      },
      {
        title: 'The mountains did not get their own agenda',
        summary:
          'Nepal, with Bhutan and Kyrgyzstan, pushed for a standalone COP31 agenda item on warming in high mountains. Competing priorities edged it out, but the draft cover text still recognised the particular vulnerability of mountain regions and glacier-dependent communities. India was among the major countries that skipped the high-level session on mountains.',
        why:
          'The stakes for India are high: the Himalaya covers 17 per cent of its land. At current emission levels only 16 per cent of Himalayan glaciers may survive the century, and Bhutan now counts more than 50 new glacial lakes formed in just five years.',
        source: 'Mongabay India',
        url: 'https://india.mongabay.com/2026/11/the-fragility-of-mountains-loom-large-over-cop31/',
        date: '2026-11-18',
        image: 'https://imgs.mongabay.com/wp-content/uploads/sites/30/2026/11/18145705/AP26320722431041-scaled.jpg',
        imageAlt: 'Photo from the Mongabay India article on mountains at COP31',
      },
      {
        title: 'The women keeping Uttarakhand’s native bees alive',
        summary:
          'In Uttarakhand villages, traditional houses have hives built into their mud walls for the Indian honey bee. Women seal the hives with clay and cow dung, lure new swarms with a trail of honey, and feed the colonies amaranth or hemp seed powder through the winter.',
        why:
          'As concrete replaces mud, the hives go with the old houses: one study in Chamoli found wall hives per house fell from about 11 to fewer than one in homes built between 2001 and 2010. A Kumaun University researcher puts it plainly: women are the reason the species still survives there.',
        source: 'Mongabay',
        url: 'https://news.mongabay.com/2026/10/the-women-keeping-uttarakhands-native-bees-alive/',
        date: '2026-10-20',
        home: true,
        image: 'https://imgs.mongabay.com/wp-content/uploads/sites/20/2026/10/19172030/Indian-Honey-Bee-3-1200x800.jpg',
        imageAlt: 'An Indian honey bee',
      },
    ],
  },
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

export function host(url: string) {
  return new URL(url).hostname.replace(/^www\./, '');
}
