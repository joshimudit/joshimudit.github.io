// sitemap.xml for search engines. Lists every public page; hidden Studio drafts are left out.
import type { APIRoute } from 'astro';
import { projects } from '../data/projects';

const pages = [
  '/', '/work/', '/publications/', '/this-week/', '/studio/',
  '/studio/patch/', '/studio/patch/experiment/', '/studio/patch/inside/', '/studio/patch/beyond/',
  ...projects.map((p) => `/work/${p.slug}/`),
];

export const GET: APIRoute = ({ site }) => {
  const urls = pages.map((p) => `  <url><loc>${new URL(p, site)}</loc></url>`).join('\n');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
};
