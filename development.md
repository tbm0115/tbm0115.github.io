---
permalink: /development/
---

# Development

<link rel="stylesheet" href="/assets/live-presence.css">

<section class="presence-page" aria-labelledby="development-page-heading">
  <section class="presence-hero presence-hero--compact">
    <p class="presence-kicker">Public development activity</p>
    <h2 id="development-page-heading">Projects, recent activity, and technology highlights.</h2>
    <p>Generated from <code>development.json</code>. Featured projects are scored from metadata instead of manually curated.</p>
    <nav class="presence-actions" aria-label="Site navigation">
      <a href="/">Dashboard</a>
      <a href="/domains/">Domains</a>
      <a href="https://github.com/tbm0115">GitHub</a>
    </nav>
  </section>

  <section class="presence-section" aria-labelledby="development-summary-heading">
    <div class="presence-section__heading">
      <h2 id="development-summary-heading">Summary</h2>
      <span data-development-updated>Loading refresh time...</span>
    </div>
    <div class="presence-stat-grid" data-development-page-summary>
      <p>Loading development summary...</p>
    </div>
  </section>

  <div class="presence-dashboard-grid">
    <section class="presence-section" aria-labelledby="development-languages-heading">
      <div class="presence-section__heading">
        <h2 id="development-languages-heading">Languages</h2>
      </div>
      <div class="presence-chip-list" data-development-languages>
        <p>Loading languages...</p>
      </div>
    </section>

    <section class="presence-section" aria-labelledby="development-categories-heading">
      <div class="presence-section__heading">
        <h2 id="development-categories-heading">Project Categories</h2>
      </div>
      <div class="presence-chip-list" data-development-categories>
        <p>Loading categories...</p>
      </div>
    </section>
  </div>

  <section class="presence-section" aria-labelledby="project-list-heading">
    <div class="presence-section__heading">
      <h2 id="project-list-heading">Projects</h2>
      <label class="presence-search-box">
        <span>Filter projects</span>
        <input type="search" data-project-filter placeholder="Filter by name, language, category, or activity">
      </label>
    </div>
    <div class="presence-card-grid presence-card-grid--repos" data-project-list>
      <p>Loading projects...</p>
    </div>
  </section>
</section>

<script src="/assets/presence-utils.js" defer></script>
<script src="/assets/development-page.js" defer></script>
