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

    U.setHtml("[data-dashboard-stats]", [
      U.statCard("Public repos", U.number(devSummary.publicRepos), `${U.number(devSummary.totalStars)} stars across recent repos`),
      U.statCard("Active domains", U.number(domainSummary.activeExpected), `${U.number(domainSummary.reachable)} reachable in last check`),
      U.statCard("Profiles", U.asArray(social.profiles).length, `${U.number(socialSummary.feedsChecked)} activity sources refreshed`),
      U.statCard("Discovery", U.asArray(search.topResults).length, search.status === "ok" ? search.provider : "Search provider not configured")
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
    const repoCount = U.number(data.development?.summary?.publicRepos);
    const activeDomains = U.number(data.domains?.summary?.activeExpected);
    const profileCount = U.asArray(data.social?.profiles).length;

    U.setText(
      "[data-dashboard-summary]",
      `${repoCount} public repositories, ${activeDomains} active or in-development domains, and ${profileCount} public profiles are summarized from generated JSON.`
    );
    U.setText("[data-dashboard-updated]", `Last refresh: ${U.formatDate(updatedAt)}`);
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

    U.setHtml(
      "[data-search-cards]",
      results
        .map(
          (result) => `
            <article class="presence-card presence-card--search">
              <h3><a href="${U.safeUrl(result.url)}">${U.escapeHtml(result.title || "Search result")}</a></h3>
              <p>${U.escapeHtml(result.snippet || result.url || "")}</p>
            </article>
          `
        )
        .join("")
    );
  }

  async function init() {
    const data = await window.PresenceData.loadAllData();
    renderHero(data);
    renderStats(data);
    renderFeaturedProjects(data);
    renderActivity(data);
    renderLanguages(data);
    renderDomainSummary(data);
    renderProfiles(data);
    renderSearch(data);
  }

  init();
})();
