// llms.txt: a plain-text summary of the site for AI tools. Built from the same data as the pages.
import type { APIRoute } from 'astro';
import { profile, links } from '../data/profile';
import { projects } from '../data/projects';

const plain = (s: string) => s.replace(/<[^>]+>/g, '');

export const GET: APIRoute = ({ site }) => {
  const u = (p: string) => new URL(p, site).toString();
  const work = projects
    .map((p) => `- [${p.title}](${u(`/work/${p.slug}/`)}): ${p.summary} (${p.role}; ${p.output})`)
    .join('\n');
  const body = `# ${profile.name}

> ${plain(profile.roots)} ${profile.lede}

${profile.about.map(plain).join('\n\n')}

## Research
${work}

## Pages
- [Work](${u('/work/')}): research projects, ongoing and completed
- [Publications](${u('/publications/')})
- [This Week](${u('/this-week/')}): a weekly digest of climate, food and ecosystems research
- [Studio](${u('/studio/')}): tools and outreach material, including Patch, a teaching aid for how a DGVM like LPJmL works
- [Blog](${u('/blog/')})

## Profiles
${links.map((l) => `- ${l.label}: ${l.href}`).join('\n')}
- Email: ${profile.email}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
