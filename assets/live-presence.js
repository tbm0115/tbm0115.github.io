(function () {
  function renderStats(data) {
    const U = window.PresenceData;
    const development = data.development || {};
    const domains = data.domains || {};
    const social = data.social || {};
    const search = data.search || {};
    const devSummary = development.summary || {};
    const domainSummary = domains.summary || {};
    const socialSummary = social.summary || {};
    const managedDomains = U.asArray(domains.domains).length;

    U.setHtml("[data-dashboard-stats]", [
      U.statCard("Public repos", U.number(devSummary.publicRepos), "visible on GitHub"),
      U.statCard("Stars", U.number(devSummary.totalStars), "across recent repos"),
      U.statCard("Forks", U.number(devSummary.totalForks), "across recent repos"),
      U.statCard("Managed domains", managedDomains || U.number(domainSummary.checked), `${U.number(domainSummary.activeExpected)} active expected`),
      U.statCard("Reachable domains", U.number(domainSummary.reachable), `${U.number(domainSummary.unreachable)} offline`),
      U.statCard("Reachable profiles", U.number(socialSummary.reachable), `${U.number(socialSummary.unknown)} inconclusive`)
    ].join(""));
  }

  function renderHero(data) {
    const U = window.PresenceData;
    const updatedAt = U.newestTimestamp([
      data.development?.lastUpdatedAt,
      data.domains?.lastUpdatedAt,
      data.social?.lastUpdatedAt,
      data.search?.lastUpdatedAt
    ]);
    U.setText("[data-dashboard-summary]", U.generatedProfessionalSummary(data));
    U.setText("[data-dashboard-updated]", `Last refresh: ${U.formatDate(updatedAt)}`);
  }

  function summaryCard(title, href, value, detail) {
    const U = window.PresenceData;
    return `
      <a class="presence-summary-link" href="${href}">
        <strong>${U.escapeHtml(title)}</strong>
        <span>${U.escapeHtml(value)}</span>
        <small>${U.escapeHtml(detail)}</small>
      </a>
    `;
  }

  function renderRouteCards(data) {
    const U = window.PresenceData;
    const projects = U.asArray(data.development?.recentRepositories);
    const events = U.asArray(data.development?.latestPublicEvents);
    const domains = U.asArray(data.domains?.domains);
    const profiles = U.asArray(data.social?.profiles);
    const searchResults = U.asArray(data.search?.topResults);

    U.setHtml(
      "[data-route-summary-cards]",
      [
        summaryCard("Projects", "/projects/", `${projects.length} recent repos`, "Browse portfolio-style project cards."),
        summaryCard("Domains", "/domains/", `${domains.length} managed domains`, `${U.number(data.domains?.summary?.reachable)} reachable in last check.`),
        summaryCard("Profiles", "/profiles/", `${profiles.length} public profiles`, `${U.number(data.social?.summary?.feedsChecked)} activity sources refreshed.`),
        summaryCard("Development", "/development/", `${events.length} recent events`, "GitHub metrics, languages, and activity."),
        summaryCard("Discovery", "/discovery/", `${searchResults.length} search results`, data.search?.status === "ok" ? data.search.provider : "Search provider optional.")
      ].join("")
    );
  }

  function renderFeaturedProjects(data) {
    const U = window.PresenceData;
    const projects = U.featuredProjects(data.development, 5);
    U.setHtml(
      "[data-featured-projects]",
      projects.length
        ? projects.map((repo) => U.repoCard(repo, data.development.latestPublicEvents)).join("")
        : U.renderEmpty("No featured projects are available yet.")
    );
  }

  function renderActivity(data) {
    const U = window.PresenceData;
    const events = U.asArray(data.development?.latestPublicEvents).slice(0, 5);

    U.setHtml(
      "[data-recent-activity]",
      events.length
        ? events
            .map(
              (event) => `
                <li>
                  <a href="${U.safeUrl(event.url)}">${U.escapeHtml(event.summary || event.type || "Activity")}</a>
                  <small>${U.escapeHtml([event.repo, U.compactDate(event.createdAt)].filter(Boolean).join(" - "))}</small>
                </li>
              `
            )
            .join("")
        : "<li>No recent public activity captured.</li>"
    );
  }

  function renderLanguages(data) {
    const U = window.PresenceData;
    const languages = U.asArray(data.development?.topLanguages).slice(0, 6);
    U.setHtml(
      "[data-language-highlights]",
      languages.length
        ? languages.map((item) => U.chip(item.language, `${U.number(item.repositories)} repos, ${U.number(item.stars)} stars`)).join("")
        : U.renderEmpty("No language summary is available yet.")
    );
  }

  function renderDomainSummary(data) {
    const U = window.PresenceData;
    const summary = data.domains?.summary || {};
    const domains = U.asArray(data.domains?.domains);
    const active = domains.filter((domain) => domain.status !== "inactive" && domain.isActive !== false);

    U.setHtml(
      "[data-domains-summary-card]",
      `
        <article class="presence-summary-card">
          <strong>${U.number(summary.checked) || domains.length}</strong>
          <span>managed domains tracked</span>
          <p>${U.number(summary.reachable)} reachable, ${U.number(summary.unreachable)} offline, ${U.number(summary.unknown)} unknown. ${active.length} are marked active or in development.</p>
          <a href="/domains/">Review full domain inventory</a>
        </article>
      `
    );
  }

  function renderProfiles(data) {
    const U = window.PresenceData;
    const profiles = U.asArray(data.social?.profiles);
    U.setHtml(
      "[data-profile-cards]",
      profiles.length
        ? profiles.map((profile) => U.profileCard(profile)).join("")
        : U.renderEmpty("No profile links are configured yet.")
    );
  }

  function renderSearch(data) {
    const U = window.PresenceData;
    const results = U.asArray(data.search?.topResults).slice(0, 5);

    if (!results.length) {
      U.setHtml(
        "[data-search-cards]",
        `
          <article class="presence-summary-card">
            <strong>${U.escapeHtml(data.search?.status || "pending")}</strong>
            <span>${U.escapeHtml(data.search?.query || "Search snapshot")}</span>
            <p>${U.escapeHtml(data.search?.note || "Search results will appear here when a search provider is configured.")}</p>
          </article>
        `
      );
      return;
    }

    U.setHtml("[data-search-cards]", results.map((result) => U.searchResultCard(result, data.search?.provider)).join(""));
  }

  async function init() {
    const data = await window.PresenceData.loadAllData();
    renderHero(data);
    renderStats(data);
    renderRouteCards(data);
    renderFeaturedProjects(data);
    renderActivity(data);
    renderLanguages(data);
    renderDomainSummary(data);
    renderProfiles(data);
    renderSearch(data);
  }

  init();
})();
