(function () {
  function renderRepositoryList(data) {
    const U = window.PresenceData;
    const repos = U.asArray(data.recentRepositories).slice(0, 12);
    const events = U.asArray(data.latestPublicEvents);

    U.setHtml(
      "[data-development-repositories]",
      repos.length
        ? repos
            .map((repo) => {
              const activity = U.activityForRepo(repo, events);
              return `
                <li>
                  <a href="${U.safeUrl(repo.url)}">${U.escapeHtml(repo.name || "Repository")}</a>
                  <small>${U.escapeHtml([repo.language, repo.description, U.compactDate(repo.pushedAt || repo.updatedAt)].filter(Boolean).join(" - "))}</small>
                  <small>${U.escapeHtml(activity.summary || "Recent repository activity")}</small>
                </li>
              `;
            })
            .join("")
        : "<li>No recent repositories captured.</li>"
    );
  }

  function renderEvents(data) {
    const U = window.PresenceData;
    const events = U.asArray(data.latestPublicEvents).slice(0, 12);
    U.setHtml(
      "[data-development-events]",
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
        : "<li>No public events captured.</li>"
    );
  }

  async function init() {
    const U = window.PresenceData;
    const data = await U.loadJson("/development.json", {
      recentRepositories: [],
      latestPublicEvents: [],
      topLanguages: [],
      summary: {}
    });
    const projects = U.sortedProjects(data);
    const summary = data.summary || {};

    U.setText("[data-development-updated]", `Last refresh: ${U.formatDate(data.lastUpdatedAt)}`);
    U.setHtml(
      "[data-development-page-summary]",
      [
        U.statCard("Public repos", U.number(summary.publicRepos), "visible on GitHub"),
        U.statCard("Stars", U.number(summary.totalStars), "across recent repos"),
        U.statCard("Forks", U.number(summary.totalForks), "across recent repos"),
        U.statCard("Followers", U.number(summary.followers), "GitHub followers")
      ].join("")
    );
    U.setHtml(
      "[data-development-languages]",
      U.asArray(data.topLanguages).length
        ? U.asArray(data.topLanguages)
            .map((item) => U.chip(item.language, `${U.number(item.repositories)} repos, ${U.number(item.stars)} stars`))
            .join("")
        : U.renderEmpty("No language summary is available yet.")
    );
    U.setHtml(
      "[data-development-categories]",
      U.categorySummary(projects).length
        ? U.categorySummary(projects).map((item) => U.chip(item.category, `${item.count} project${item.count === 1 ? "" : "s"}`)).join("")
        : U.renderEmpty("No project categories are available yet.")
    );

    renderRepositoryList(data);
    renderEvents(data);
  }

  init();
})();
