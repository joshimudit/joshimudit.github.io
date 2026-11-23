// The world of the Sahara game: places, the moving rain belt, skills, jobs and the facts behind them.
// Years are calendar years: negative = BCE, positive = CE.

export type PlaceId = 'east' | 'lake' | 'highlands' | 'oasis' | 'nile' | 'niger' | 'sahel' | 'savanna';
export type JobId = 'fish' | 'gather' | 'hunt' | 'herd' | 'farm' | 'trade' | 'ties';
export type SkillId = 'pots' | 'harpoons' | 'cattle' | 'goats' | 'nilefarm' | 'sorghum' | 'wells' | 'granary' | 'camels' | 'foggara' | 'trees';
export type Kind = 'playa' | 'lake' | 'highlands' | 'oasis' | 'river' | 'sahel' | 'savanna';

export interface Place {
  id: PlaceId;
  name: string; // full name
  short: string; // used in sentences: "at the river"
  kidName: string; // name in story mode
  kind: Kind;
  x: number; y: number; // position on the map, 0–100, north at the top
  lat: number; // rough latitude, °N
  rainBonus: number; // mountains catch more rain
  river: number; // reliable river water, 0–1
  groundwater: boolean;
  grassK: number; // how many animals the grass can carry in a good year
  tsetse: boolean; // cattle sickness in the wet south
  hub: boolean; // on the caravan routes
  links: PlaceId[];
  kids?: boolean; // used in story mode
  fact: string;
}

export const PLACES: Record<PlaceId, Place> = {
  east: {
    id: 'east', name: 'The eastern lakes', short: 'by the eastern lakes', kidName: 'The lake', kind: 'playa',
    x: 74, y: 30, lat: 24.6, rainBonus: 0, river: 0, groundwater: true, grassK: 380, tsetse: false, hub: false,
    links: ['highlands', 'nile', 'lake'], kids: true,
    fact: 'About 9,000 years ago, people camped beside seasonal lakes in what is now the desert of southern Egypt, at places like Nabta Playa.',
  },
  lake: {
    id: 'lake', name: 'Lake Chad', short: 'at Lake Chad', kidName: 'Lake Chad', kind: 'lake',
    x: 56, y: 60, lat: 17.4, rainBonus: 0, river: 0, groundwater: true, grassK: 520, tsetse: false, hub: false,
    links: ['highlands', 'sahel', 'savanna', 'east'],
    fact: 'At its peak about 6,000 years ago, “Mega-Chad” covered around 360,000 km², the largest freshwater lake on Earth. Today’s Lake Chad is a small fraction of that (Armitage et al., 2015).',
  },
  highlands: {
    id: 'highlands', name: 'The highlands', short: 'in the highlands', kidName: 'The highlands', kind: 'highlands',
    x: 55, y: 36, lat: 23.2, rainBonus: 0.18, river: 0, groundwater: true, grassK: 300, tsetse: false, hub: false,
    links: ['oasis', 'east', 'lake', 'niger'],
    fact: 'Rock paintings in the Saharan mountains, such as the Acacus and Tassili n’Ajjer, show cattle, giraffes and people from the green times.',
  },
  oasis: {
    id: 'oasis', name: 'The Fezzan oases', short: 'in the oases', kidName: 'The oasis', kind: 'oasis',
    x: 46, y: 20, lat: 26.5, rainBonus: 0, river: 0, groundwater: true, grassK: 90, tsetse: false, hub: true,
    links: ['highlands', 'niger'],
    fact: 'Water left under the Sahara from wetter times feeds its oases. In southern Libya, the Garamantes built a kingdom on it more than 2,000 years ago.',
  },
  nile: {
    id: 'nile', name: 'The Nile valley', short: 'by the Nile', kidName: 'The river', kind: 'river',
    x: 92, y: 26, lat: 24.5, rainBonus: 0, river: 1, groundwater: true, grassK: 160, tsetse: false, hub: true,
    links: ['east'], kids: true,
    fact: 'The Nile floods every summer with rain from the Ethiopian highlands, so it keeps flowing even when the Sahara around it is dry.',
  },
  niger: {
    id: 'niger', name: 'The Niger bend', short: 'at the Niger bend', kidName: 'The Niger', kind: 'river',
    x: 20, y: 52, lat: 17.8, rainBonus: 0, river: 0.75, groundwater: true, grassK: 420, tsetse: false, hub: true,
    links: ['oasis', 'highlands', 'sahel'],
    fact: 'Pearl millet was domesticated by about 2500 BCE in the Tilemsi Valley, near the Niger bend in Mali (Manning et al., 2011).',
  },
  sahel: {
    id: 'sahel', name: 'The Sahel', short: 'in the Sahel', kidName: 'The south', kind: 'sahel',
    x: 34, y: 72, lat: 15, rainBonus: 0, river: 0, groundwater: true, grassK: 620, tsetse: false, hub: false,
    links: ['niger', 'lake', 'savanna'], kids: true,
    fact: 'The Sahel is the grassland belt along the Sahara’s southern edge. Its rain falls in a few summer months, so one failed season hurts.',
  },
  savanna: {
    id: 'savanna', name: 'The southern savanna', short: 'in the savanna', kidName: 'The savanna', kind: 'savanna',
    x: 50, y: 88, lat: 11, rainBonus: 0, river: 0, groundwater: true, grassK: 640, tsetse: true, hub: false,
    links: ['sahel', 'lake'],
    fact: 'In the wetter savannas, tsetse flies spread a disease that kills cattle. It has long kept herders out of these green lands.',
  },
};

// In story mode only three places, linked to each other
export const KID_LINKS: Partial<Record<PlaceId, PlaceId[]>> = { east: ['nile', 'sahel'], nile: ['east', 'sahel'], sahel: ['east', 'nile'] };

/** Northern edge of the summer rains, °N. It retreats south as the Green Sahara ends. */
export function beltEdge(year: number): number {
  if (year <= -5300) return 27 + 0.6 * Math.sin((year + 5300) / 520);
  if (year <= -3500) return 27 - 8 * ((year + 5300) / 1800);
  if (year <= -1000) return 19 - 2.2 * ((year + 3500) / 2500);
  if (year < 1900) return 16.8 - 0.3 * ((year + 1000) / 2900);
  if (year < 1965) return 16.6; // wetter 1950s
  if (year < 1993) return 14.7; // the long Sahel drought
  return 15.6; // partial recovery
}

/** How wet a place is in a normal year, 0–1. */
export function wetness(p: Place, year: number): number {
  return Math.max(0, Math.min(1, (beltEdge(year) - p.lat) / 5 + 0.25 + p.rainBonus));
}

export interface Skill {
  id: SkillId; name: string; verb: string; gives: string; from: number; to?: number;
  where?: PlaceId[]; needs?: SkillId; fact: string;
}

export const SKILLS: Skill[] = [
  { id: 'pots', name: 'Pottery', verb: 'Make clay pots', gives: 'Cook wild grain and store food for bad years.', from: -8500,
    fact: 'Some of Africa’s oldest pottery, from before 9400 BCE at Ounjougou in Mali, was made by people who cooked wild grass seeds, long before farming (Huysecom et al., 2009).' },
  { id: 'harpoons', name: 'Harpoons and nets', verb: 'Make harpoons and nets', gives: 'Catch more fish.', from: -8500,
    fact: 'Camps by the early Holocene lakes and rivers of the Sahara are full of fish bones and bone harpoons, from the Nile to Mali (Sutton, 1977).' },
  { id: 'cattle', name: 'Cattle', verb: 'Get cattle', gives: 'A herd that gives milk and meat, and can walk to new grass.', from: -6800,
    fact: 'Herding spread across the Sahara long before any crop was domesticated in Africa. Cattle came first (Marshall & Hildebrand, 2002).' },
  { id: 'goats', name: 'Sheep and goats', verb: 'Add sheep and goats', gives: 'Hardy animals: your herd loses far fewer in dry years.', from: -5800, needs: 'cattle',
    fact: 'Sheep and goats came to Africa from the Near East through Egypt, by about 7,500 years ago.' },
  { id: 'nilefarm', name: 'Wheat and barley', verb: 'Farm wheat and barley', gives: 'Farm the Nile floodplain. Big, steady harvests.', from: -5200, where: ['nile'],
    fact: 'Wheat and barley, first farmed in the Near East, reached Egypt’s Fayum by about 5200 BCE. It is the oldest farming village found in Egypt.' },
  { id: 'sorghum', name: 'Sorghum and millet', verb: 'Farm sorghum and millet', gives: 'Farm with the rain. Feeds many people, but fails in droughts.', from: -3300,
    fact: 'Sorghum was domesticated in eastern Sudan by 3500–3000 BCE (Winchell et al., 2017), and pearl millet in Mali by about 2500 BCE (Manning et al., 2011).' },
  { id: 'wells', name: 'Wells', verb: 'Dig wells', gives: 'Reach groundwater when the rain fails.', from: -4000,
    fact: 'The Garamantes of southern Libya lifted water from wells with “shadoofs”, poles with a bucket and a counterweight, still used in places today.' },
  { id: 'granary', name: 'Granaries', verb: 'Build granaries', gives: 'Store much more grain for bad years.', from: -3000, needs: 'sorghum',
    fact: 'Clay granaries raised off the ground keep grain safe from damp and pests. They are still a common sight in Sahel villages.' },
  { id: 'camels', name: 'Camels', verb: 'Get camels', gives: 'Animals that go days without water: live and travel in the desert.', from: 200,
    fact: 'Camels came from Arabia, perhaps reaching Egypt in the 9th century BCE. Camel travel became common in North Africa by the 3rd century CE.' },
  { id: 'foggara', name: 'Foggaras', verb: 'Dig foggaras', gives: 'Underground channels that bring groundwater to oasis fields. Uses up the water.', from: -400, to: 1900, where: ['oasis'],
    fact: 'The Garamantes dug hundreds of underground channels called foggaras, used from about 400 BCE to 700 CE. Falling water tables may have helped end their kingdom.' },
  { id: 'trees', name: 'Protect young trees', verb: 'Protect young trees', gives: 'Let trees regrow in fields. Land recovers faster and yields rise.', from: 1983,
    fact: 'From 1983, farmers in Niger let trees regrow from old roots in their fields. Over 5 million hectares turned green again.' },
];
export const skill = (id: SkillId) => SKILLS.find((s) => s.id === id)!;

export interface Job { id: JobId; name: string; kid: string; needs?: SkillId[]; }
export const JOBS: Job[] = [
  { id: 'fish', name: 'Fish', kid: 'Go fishing' },
  { id: 'gather', name: 'Gather', kid: 'Gather wild grain' },
  { id: 'hunt', name: 'Hunt', kid: 'Hunt gazelles' },
  { id: 'herd', name: 'Herd', kid: 'Look after the herd', needs: ['cattle', 'camels'] },
  { id: 'farm', name: 'Farm', kid: 'Tend the fields', needs: ['nilefarm', 'sorghum', 'foggara', 'wells'] },
  { id: 'trade', name: 'Trade', kid: 'Trade with others' },
  { id: 'ties', name: 'Visit neighbours', kid: 'Visit neighbours' },
];
export const job = (id: JobId) => JOBS.find((j) => j.id === id)!;

export interface HistoryEvent {
  year: number; title: string; text: string; places?: PlaceId[]; effect?: string; offer?: 'boreholes';
}

/** Real events the full game passes through. */
export const HISTORY: HistoryEvent[] = [
  { year: -5300, title: 'The rains are weakening', text: 'A slow change in Earth’s orbit is weakening the African monsoon. Over the next 2,000 years the summer rains will retreat south (Kuper & Kröpelin, 2006).' },
  { year: -3500, title: 'The desert is spreading', text: 'Much of the eastern Sahara is now desert. Most people have left for the Nile valley, the oases and the south (Kuper & Kröpelin, 2006).' },
  { year: 300, title: 'Camel caravans', text: 'Camel travel is now common in North Africa. Caravans begin to cross the Sahara, linking the Mediterranean with the Sahel.' },
  { year: 800, title: 'The golden age of the caravans', text: 'Great camel caravans carry salt south and gold north. Trading towns on the routes grow rich.', places: ['oasis', 'niger', 'nile'], effect: 'Trade pays much more on the caravan routes.' },
  { year: 1324, title: 'Mansa Musa’s journey', text: 'Mansa Musa, ruler of the Mali Empire, travels to Mecca with so much gold that he becomes famous across the Mediterranean world.' },
  { year: 1471, title: 'Ships reach the Gold Coast', text: 'Portuguese ships sailing down the Atlantic coast now offer another route for gold. Over time, the caravan trade loses ground.' },
  { year: 1890, title: 'Cattle plague', text: 'Rinderpest, a cattle disease brought to Africa in 1887, sweeps across the continent in the 1890s. In many regions most cattle die.', effect: 'Herds are devastated.' },
  { year: 1900, title: 'New borders', text: 'European colonial powers draw borders across the Sahara and Sahel, cutting across the routes herders have always used.', effect: 'Moving costs more from now on.' },
  { year: 1950, title: 'Deep wells', text: 'From the 1950s, governments drill deep wells across the Sahel. Water becomes easy, and herds grow around the wells (Glantz, 1976). Will your people use them?', offer: 'boreholes' },
  { year: 1968, title: 'The great Sahel drought', text: 'From 1968 to 1974 the rains fail across the Sahel. Crops fail, herds die and many families have to leave. Droughts return in the early 1980s.' },
  { year: 1983, title: 'Regreening', text: 'Farmers in Niger start letting trees regrow from old roots in their fields. The idea spreads from farmer to farmer.' },
  { year: 2007, title: 'The Great Green Wall', text: 'African countries launch the Great Green Wall, a plan to restore land in a belt across the Sahel.' },
];

/** Background facts, shown once each when nothing more specific comes up. */
export const ERA_FACTS: { from: number; to: number; text: string }[] = [
  { from: -8500, to: -6500, text: 'At Gobero in Niger, archaeologists found graves of Green Sahara people together with bones of fish, crocodiles and hippos (Sereno et al., 2008).' },
  { from: -7500, to: -5300, text: 'In the green times, the Sahara’s rains came from the African monsoon, which reached much further north than it does today.' },
  { from: -5300, to: -3500, text: 'The Sahara did not dry all at once. Different regions dried at different times, and people moved step by step (Kuper & Kröpelin, 2006).' },
  { from: -3500, to: -1000, text: 'As the desert spread, people crowded into the Nile valley. Within a few centuries Egypt became one of the world’s first states.' },
  { from: -1000, to: 700, text: 'The Garamantes farmed the Fezzan oases with groundwater for about a thousand years, trading across the desert.' },
  { from: 700, to: 1600, text: 'Salt from Saharan mines was carried south by camel, and gold came north. Towns like Timbuktu grew rich on this trade.' },
  { from: 1600, to: 1950, text: 'Herders in the Sahel move with the seasons: north in the rains, south in the dry season. Moving is how they deal with uncertain rain.' },
  { from: 1950, to: 2030, text: 'In the droughts of the 1970s, herders who kept moving lost fewer animals than those who settled around wells.' },
];

export const SOURCES = [
  'Sereno, P. C. et al. (2008). Lakeside cemeteries in the Sahara: 5000 years of Holocene population and environmental change. PLoS ONE 3, e2995.',
  'Kuper, R. & Kröpelin, S. (2006). Climate-controlled Holocene occupation in the Sahara: motor of Africa’s evolution. Science 313, 803–807.',
  'Huysecom, E. et al. (2009). The emergence of pottery in Africa during the tenth millennium cal BC: new evidence from Ounjougou (Mali). Antiquity 83, 905–917.',
  'Sutton, J. E. G. (1977). The African aqualithic. Antiquity 51, 25–34.',
  'Marshall, F. & Hildebrand, E. (2002). Cattle before crops: the beginnings of food production in Africa. Journal of World Prehistory 16, 99–143.',
  'Winchell, F. et al. (2017). Evidence for sorghum domestication in fourth-millennium BC eastern Sudan. Current Anthropology 58, 673–683.',
  'Manning, K. et al. (2011). 4500-year old domesticated pearl millet from the Tilemsi Valley, Mali. Journal of Archaeological Science 38, 312–322.',
  'Armitage, S. J., Bristow, C. S. & Drake, N. A. (2015). West African monsoon dynamics inferred from abrupt fluctuations of Lake Mega-Chad. PNAS 112, 8543–8548.',
  'Sterry, M., Mattingly, D. J. & Wilson, A. I. Foggaras and the Garamantes: hydraulic landscapes in the central Sahara.',
  'Glantz, M. H. (1976). Water and inappropriate technology: deep wells in the Sahel. Denver Journal of International Law and Policy 6, 527.',
  'Reij, C., Tappan, G. & Smale, M. (2009). Agroenvironmental transformation in the Sahel. IFPRI Discussion Paper 914.',
  'FAO Desert Locust Information Service.',
];
