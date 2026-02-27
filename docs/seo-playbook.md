# SEO Playbook — Mecker Capital

## 1) Initial setup

1. Deploy production build to `https://mecker.capital`.
2. Verify sitemap availability:
   - `https://mecker.capital/sitemap-index.xml`
   - `https://mecker.capital/sitemap-0.xml`
3. Verify robots file:
   - `https://mecker.capital/robots.txt`

## 2) Search Console and Bing

1. Add domain property in Google Search Console.
2. Add site in Bing Webmaster Tools.
3. Submit sitemap index URL in both tools.
4. Use URL Inspection on:
   - `/`
   - `/writings/`
   - `/insights/<slug>/`
   - `/projects/`
   - `/portfolio/`

## 3) Indexation policy checks

Expected:
- Indexable: Home, Writings index, Insights pages, Projects, Portfolio, About.
- Noindex: `/legal/*` and `/writings/2+` pagination pages.

If coverage reports include excluded legal/pagination URLs, confirm they remain `noindex,follow`.

## 4) Structured data checks

Validate in Rich Results / Schema validators:
- Home: `WebSite`, `Organization`, `Person`
- Writings page: `CollectionPage`
- Insights pages: `BlogPosting`
- Portfolio/Projects: `CollectionPage`

## 5) Performance and CWV monitoring

Track Core Web Vitals for top URLs:
- `/`
- `/writings/`
- representative `/insights/<slug>/`

Priorities:
- Keep LCP image sizes controlled.
- Avoid CLS regressions in article cards and insight cover image.
- Keep JS payload minimal (Astro static-first).

## 6) Content operations loop (weekly)

1. Refresh Substack cache during build.
2. Add/update `src/content/writings-seo-overrides.json` entries for top posts.
3. Review titles/descriptions in Search Console query report.
4. Improve underperforming insights pages with stronger summaries and keyword focus.

## 7) KPI dashboard

Track monthly:
- Indexed pages count
- Impressions (brand vs non-brand)
- CTR by page type (`/writings`, `/insights/*`, `/projects`, `/portfolio`)
- Average position for target topic clusters (macro, market making, stat arb)
