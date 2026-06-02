---
title: Profiles
description: Public profiles and recent public profile activity generated from social-media.json.
permalink: /profiles/
---

# Profiles

<link rel="stylesheet" href="/assets/live-presence.css">

<section class="presence-page" aria-labelledby="profiles-page-heading">
  <section class="presence-hero presence-hero--compact">
    <p class="presence-kicker">Public profile index</p>
    <h2 id="profiles-page-heading">Profile links grouped from generated social data.</h2>
    <p>Reachability checks can be inconclusive when sites block automated requests; profile links are preserved unless the source data removes them.</p>
    <nav class="presence-actions" aria-label="Site navigation">
      <a href="/">Dashboard</a>
      <a href="/projects/">Projects</a>
      <a href="/discovery/">Discovery</a>
    </nav>
  </section>

  <section class="presence-section" aria-labelledby="profile-summary-heading">
    <div class="presence-section__heading">
      <h2 id="profile-summary-heading">Summary</h2>
      <span data-profiles-updated>Refresh data pending</span>
    </div>
    <div class="presence-stat-grid" data-profiles-summary>
      <p class="presence-skeleton">Preparing profile summary.</p>
    </div>
  </section>

  <section class="presence-section" aria-labelledby="profile-links-heading">
    <div class="presence-section__heading">
      <h2 id="profile-links-heading">Profile Links</h2>
    </div>
    <div data-profile-groups>
      <p class="presence-skeleton">Preparing profile links.</p>
    </div>
  </section>

  <section class="presence-section" aria-labelledby="profile-updates-heading">
    <div class="presence-section__heading">
      <h2 id="profile-updates-heading">Recent Public Updates</h2>
    </div>
    <ul class="presence-list" data-profile-updates>
      <li>Preparing updates.</li>
    </ul>
  </section>
</section>

<script src="/assets/presence-utils.js" defer></script>
<script src="/assets/profiles-page.js" defer></script>
