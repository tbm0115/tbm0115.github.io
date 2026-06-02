---
title: Projects
description: Browse public projects generated from development.json.
permalink: /projects/
---

# Projects

<link rel="stylesheet" href="/assets/live-presence.css">

<section class="presence-page" aria-labelledby="projects-page-heading">
  <section class="presence-hero presence-hero--compact">
    <p class="presence-kicker">Project browser</p>
    <h2 id="projects-page-heading">Public repositories rendered from generated GitHub data.</h2>
    <p>Portfolio-style cards focus on what each project is, when it was active, and where to find it.</p>
    <nav class="presence-actions" aria-label="Site navigation">
      <a href="/">Dashboard</a>
      <a href="/development/">Development activity</a>
      <a href="https://github.com/tbm0115">GitHub</a>
    </nav>
  </section>

  <section class="presence-section" aria-labelledby="project-summary-heading">
    <div class="presence-section__heading">
      <h2 id="project-summary-heading">Summary</h2>
      <span data-projects-updated>Refresh data pending</span>
    </div>
    <div class="presence-stat-grid" data-projects-summary>
      <p class="presence-skeleton">Preparing project summary.</p>
    </div>
  </section>

  <section class="presence-section" aria-labelledby="featured-projects-page-heading">
    <div class="presence-section__heading">
      <h2 id="featured-projects-page-heading">Featured</h2>
    </div>
    <div class="presence-card-grid presence-card-grid--repos" data-projects-featured>
      <p class="presence-skeleton">Preparing featured projects.</p>
    </div>
  </section>

  <section class="presence-section" aria-labelledby="all-projects-heading">
    <div class="presence-section__heading">
      <h2 id="all-projects-heading">All Recent Projects</h2>
      <label class="presence-search-box">
        <span>Filter projects</span>
        <input type="search" data-projects-filter placeholder="Filter by name, language, category, or activity">
      </label>
    </div>
    <div class="presence-chip-list" data-projects-language-filter aria-label="Language filters"></div>
    <div class="presence-card-grid presence-card-grid--repos" data-projects-list>
      <p class="presence-skeleton">Preparing projects.</p>
    </div>
  </section>
</section>

<script src="/assets/presence-utils.js" defer></script>
<script src="/assets/projects-page.js" defer></script>
