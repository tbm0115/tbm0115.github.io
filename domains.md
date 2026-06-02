---
permalink: /domains/
---

# Managed Domains

<link rel="stylesheet" href="/assets/live-presence.css">

<section class="presence-page" aria-labelledby="domains-page-heading">
  <section class="presence-hero presence-hero--compact">
    <p class="presence-kicker">Domain operations</p>
    <h2 id="domains-page-heading">Reachability and status for managed domains.</h2>
    <p>Generated from <code>domains.json</code>. The homepage shows the summary; this page keeps the full inventory.</p>
    <nav class="presence-actions" aria-label="Site navigation">
      <a href="/">Dashboard</a>
      <a href="/development/">Development</a>
    </nav>
  </section>

  <section class="presence-section" aria-labelledby="domain-summary-heading">
    <div class="presence-section__heading">
      <h2 id="domain-summary-heading">Summary</h2>
      <span data-domains-updated>Loading refresh time...</span>
    </div>
    <div class="presence-stat-grid" data-domain-page-summary>
      <p>Loading domain summary...</p>
    </div>
  </section>

  <section class="presence-section" aria-labelledby="domain-list-heading">
    <div class="presence-section__heading">
      <h2 id="domain-list-heading">Full Inventory</h2>
      <label class="presence-search-box">
        <span>Filter domains</span>
        <input type="search" data-domain-filter placeholder="Filter by name, domain, or status">
      </label>
    </div>
    <div class="presence-card-grid presence-card-grid--sites" data-domain-list>
      <p>Loading domains...</p>
    </div>
  </section>
</section>

<script src="/assets/presence-utils.js" defer></script>
<script src="/assets/domains-page.js" defer></script>
