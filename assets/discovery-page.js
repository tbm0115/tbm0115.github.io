(function () {
  function secretList() {
    return `
      <ul class="presence-detail-list">
        <li><code>BRAVE_SEARCH_API_KEY</code></li>
        <li><code>SERPAPI_KEY</code></li>
        <li><code>BING_SEARCH_API_KEY</code></li>
      </ul>
    `;
  }

  async function init() {
    const U = window.PresenceData;
    const [search, social, development] = await Promise.all([
      U.loadJson("/search-results.json", { topResults: [], status: "missing", provider: "none" }),
      U.loadJson("/social-media.json", { profiles: [] }),
      U.loadJson("/development.json", { recentRepositories: [] })
    ]);
    const results = U.asArray(search.topResults);

    U.setText("[data-discovery-updated]", `Last refresh: ${U.formatDate(search.lastUpdatedAt)}`);

    if (!results.length) {
      U.setHtml(
        "[data-discovery-summary]",
        `
          <article class="presence-summary-card">
            <strong>${U.escapeHtml(search.status || "skipped")}</strong>
            <span>${U.escapeHtml(search.provider || "No search provider")}</span>
            <p>${U.escapeHtml(search.note || "Public search discovery is not configured yet.")}</p>
            ${secretList()}
          </article>
        `
      );
      U.setHtml("[data-discovery-results]", U.renderEmpty("No search results are available yet."));
    } else {
      U.setHtml(
        "[data-discovery-summary]",
        `
          <article class="presence-summary-card">
            <strong>${results.length}</strong>
            <span>${U.escapeHtml(search.provider || "Search provider")}</span>
            <p>${U.escapeHtml(search.query || "Public discovery query")}</p>
          </article>
        `
      );
      U.setHtml("[data-discovery-results]", results.map((result) => U.searchResultCard(result, search.provider)).join(""));
    }

    const relatedProfiles = U.asArray(social.profiles).slice(0, 4);
    const relatedProjects = U.featuredProjects(development, 3);
    U.setHtml(
      "[data-discovery-related]",
      [
        ...relatedProfiles.map(
          (profile) => `
            <a class="presence-summary-link" href="${U.safeUrl(profile.url)}">
              <strong>${U.escapeHtml(profile.name || "Profile")}</strong>
              <span>${U.escapeHtml(profile.category || "Profile")}</span>
              <small>${U.escapeHtml(U.profileReachabilityLabel(profile))}</small>
            </a>
          `
        ),
        ...relatedProjects.map(
          (repo) => `
            <a class="presence-summary-link" href="${U.safeUrl(repo.url)}">
              <strong>${U.escapeHtml(repo.name || "Project")}</strong>
              <span>${U.escapeHtml(repo.language || "Project")}</span>
              <small>${U.escapeHtml(repo.description || "Public repository")}</small>
            </a>
          `
        )
      ].join("") || U.renderEmpty("No related profiles or projects are available yet.")
    );
  }

  init();
})();
