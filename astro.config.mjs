import { defineConfig } from 'astro/config';

// When the custom domain (e.g. muditjoshi.org) is bought, change `site` here
// and add public/CNAME containing the domain.
export default defineConfig({
  site: 'https://joshimudit.github.io',
  trailingSlash: 'ignore',
  // The Studio used to be called the Lab: old addresses keep working.
  redirects: {
    '/lab': '/studio',
    '/lab/patch': '/studio/patch',
    '/lab/patch/inside': '/studio/patch/inside',
    '/lab/patch/beyond': '/studio/patch/beyond',
    '/lab/follow-the-rain': '/studio/follow-the-rain',
    '/lab/sahara': '/studio/sahara',
    '/lab/dryland-runner': '/studio/dryland-runner',
  },
});
