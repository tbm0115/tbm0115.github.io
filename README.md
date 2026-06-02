# Personal Presence Dashboard

This GitHub Pages site is a static dashboard for public online presence data. The homepage is intentionally light on manually curated content; most visible sections are rendered from JSON files refreshed by the GitHub Action in `.github/workflows/update-live-data.yml`.

## Generated Data Files

- `development.json`: GitHub profile stats, recent repositories, language summaries, cached social preview paths, and recent public events.
- `domains.json`: managed domain inventory, status labels, reachability checks, and summary counts.
- `social-media.json`: public profile links, reachability checks, configured activity sources, and recent profile updates.
- `search-results.json`: optional search/discovery results when a supported search API secret is configured.

## Pages

- `/`: concise dashboard with profile summary, key statistics, featured projects, recent activity, domain summary, profile cards, and search/discovery snapshot.
- `/development/`: full project listing with filter, language highlights, category summaries, scoring hints, and recent activity.
- `/domains/`: full managed-domain inventory with reachability summary and filter.

## Featured Project Scoring

Featured projects are selected in `assets/presence-utils.js` from `development.json`. The scoring prefers projects that are:

- recently pushed or updated;
- not archived;
- not forks unless they have useful metadata;
- described;
- linked to a homepage;
- starred or forked;
- associated with a language, topics, cached preview image, or recent activity.

The score is deliberately simple and data-driven so the homepage updates when `development.json` changes without editing `index.md`.

## Frontend Rendering

The site uses progressive enhancement:

- Markdown pages provide semantic headings and loading placeholders.
- `assets/presence-utils.js` provides shared loading, formatting, sorting, scoring, and card-rendering helpers.
- Page-specific scripts render the dashboard, domain inventory, and development inventory.
- Missing or malformed arrays are treated as empty arrays, and empty states are rendered instead of failing hard.

The CSS in `assets/live-presence.css` supports responsive layouts and light/dark mode via `prefers-color-scheme`.
