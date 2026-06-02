# Personal Presence Dashboard

This GitHub Pages site is a static dashboard for public online presence data. The homepage is intentionally light on manually curated content; most visible sections are rendered from JSON files refreshed by the GitHub Action in `.github/workflows/update-live-data.yml`.

## Generated Data Files

- `development.json`: GitHub profile stats, recent repositories, language summaries, cached social preview paths, and recent public events.
- `domains.json`: managed domain inventory, status labels, reachability checks, and summary counts.
- `social-media.json`: public profile links, reachability checks, configured activity sources, and recent profile updates.
- `search-results.json`: optional search/discovery results when a supported search API secret is configured.

## Pages

- `/`: concise dashboard with profile summary, key statistics, featured projects, recent activity, domain summary, profile cards, and search/discovery snapshot.
- `/projects/`: portfolio-style project browser generated from `development.json`.
- `/development/`: GitHub activity and metrics page with summaries, languages, categories, recent repositories, and public events.
- `/domains/`: full managed-domain inventory with reachability summary and filter.
- `/profiles/`: public profile cards grouped by category with recent profile updates.
- `/discovery/`: optional public search/discovery snapshot with a complete skipped state when no search key is configured.

## Featured Project Scoring

Featured projects are selected in `assets/presence-utils.js` from `development.json`. The scoring prefers projects that are:

- recently pushed or updated;
- not archived;
- not forks unless they have useful metadata;
- described;
- linked to a homepage;
- starred or forked;
- associated with a language, topics, cached preview image, or recent activity.

It penalizes archived repositories, forks without useful metadata, missing descriptions, stale pushed dates, and the Pages repository itself unless there are fewer than three good alternatives.

The score is deliberately simple and data-driven so the homepage updates when `development.json` changes without editing `index.md`.

## Optional Search Secrets

Public discovery search is optional. If no supported key is configured, `search-results.json` can remain in the `skipped` state and the site still renders a complete Discovery page.

Supported repository secrets:

- `BRAVE_SEARCH_API_KEY`
- `SERPAPI_KEY`
- `BING_SEARCH_API_KEY`

## Frontend Rendering

The site uses progressive enhancement:

- Markdown pages provide semantic headings and loading placeholders.
- `assets/presence-utils.js` provides shared loading, formatting, sorting, scoring, and card-rendering helpers.
- Page-specific scripts render the dashboard, domain inventory, and development inventory.
- Missing or malformed arrays are treated as empty arrays, and empty states are rendered instead of failing hard.

The CSS in `assets/live-presence.css` supports responsive layouts and light/dark mode via `prefers-color-scheme`.

## Local Development

This repository is intentionally a GitHub Pages/Jekyll site with JavaScript progressive enhancement. GitHub Pages builds the Markdown routes and serves the JSON/assets. A plain static server can serve files for quick asset checks, but it does not emulate Jekyll permalink routes unless the site is built first.

Useful checks:

```powershell
node --check assets/presence-utils.js
node --check assets/live-presence.js
node --check assets/projects-page.js
node --check assets/domains-page.js
node --check assets/profiles-page.js
node --check assets/discovery-page.js
node --check assets/development-page.js
node scripts/update-live-data.mjs --offline
```
