// The log: add one line when something happens. It appears on Home ("Latest",
// newest 5) and in the archive at the bottom of the Blog page.
// date: 'YYYY-MM' ; kind: 'news' | 'talk' | 'poster' | 'visit' | 'award' | 'paper'

export type LogItem = { date: string; kind: string; text: string; href?: string };

export const log: LogItem[] = [
  { date: '2026-11', kind: 'visit', text: 'Research secondment at the University of Glasgow.' },
  { date: '2024-06', kind: 'award', text: 'Graduated MSc Environmental Management, Kiel University, with a final grade of 1.4.' },
  {
    date: '2024-04',
    kind: 'paper',
    text: 'Finished my master’s thesis at ETH Zurich: simulating 400 million years of plant biodiversity.',
    href: '/files/Mudit-Joshi-MSc-thesis-2024.pdf',
  },
];

export const sortedLog = [...log].sort((a, b) => b.date.localeCompare(a.date));

export function formatMonth(d: string) {
  const [y, m] = d.split('-').map(Number);
  return new Date(y, (m || 1) - 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}
