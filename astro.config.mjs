import { defineConfig } from 'astro/config';

// When the custom domain (e.g. muditjoshi.org) is bought, change `site` here
// and add public/CNAME containing the domain.
export default defineConfig({
  site: 'https://joshimudit.github.io',
  trailingSlash: 'ignore',
});
