# joshimudit.github.io

Personal website of Mudit Joshi. Built with [Astro](https://astro.build), deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`.

## Where content lives

| What | File |
|---|---|
| Name, intro, about, links, places, contact form key | `src/data/profile.ts` |
| Work page projects | `src/data/projects.ts` |
| News log (Home "Latest" + Blog archive) | `src/data/log.ts` |
| CV page | `src/data/cv.ts` |
| Publications | `src/pages/publications.astro` |

Add a news item: one line in `src/data/log.ts`. Nothing is ever deleted; older items move to the archive.

## Run locally

```
npm install
npm run dev
```

## Workflow

Changes arrive as pull requests. Review, then merge; the site updates about a minute later.
