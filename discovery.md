---
title: Discovery
description: Optional public search discovery snapshot generated from search-results.json.
permalink: /discovery/
---

# Discovery

<link rel="stylesheet" href="/assets/live-presence.css">

<section class="presence-page" aria-labelledby="discovery-page-heading">
  <section class="presence-hero presence-hero--compact">
    <p class="presence-kicker">Public discovery</p>
    <h2 id="discovery-page-heading">Search snapshot for public discoverability.</h2>
    <p>Generated from <code>search-results.json</code>. The site remains complete when search is skipped because no optional API key is configured.</p>
    <nav class="presence-actions" aria-label="Site navigation">
      <a href="/">Dashboard</a>
      <a href="/profiles/">Profiles</a>
      <a href="/projects/">Projects</a>
    </nav>
  </section>

  <section class="presence-section" aria-labelledby="discovery-summary-heading">
    <div class="presence-section__heading">
      <h2 id="discovery-summary-heading">Summary</h2>
      <span data-discovery-updated>Refresh data pending</span>
    </div>
    <div data-discovery-summary>
      <p class="presence-skeleton">Preparing discovery summary.</p>
    </div>
  </section>

  <section class="presence-section" aria-labelledby="search-results-heading">
    <div class="presence-section__heading">
      <h2 id="search-results-heading">Search Results</h2>
    </div>
    <div class="presence-search-grid" data-discovery-results>
      <p class="presence-skeleton">Preparing search results.</p>
    </div>
  </section>

  <section class="presence-section" aria-labelledby="related-links-heading">
    <div class="presence-section__heading">
      <h2 id="related-links-heading">Related Sources</h2>
    </div>
    <div class="presence-summary-grid" data-discovery-related>
      <p class="presence-skeleton">Preparing related sources.</p>
    </div>
  </section>
</section>

<script src="/assets/presence-utils.js" defer></script>
<script src="/assets/discovery-page.js" defer></script>
