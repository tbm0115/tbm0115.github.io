(function () {
  let projects = [];
  let events = [];

  function matchesFilter(repo, filter) {
    if (!filter) {
      return true;
    }

    const U = window.PresenceData;
    const activity = U.activityForRepo(repo, events);
    const text = [
      repo.name,
      repo.fullName,
      repo.description,
      repo.language,
      U.projectCategory(repo),
      activity.summary
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return text.includes(filter.toLowerCase());
  }

  function renderSummary(data) {
    const U = window.PresenceData;
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
  }

  function renderLanguages(data) {
    const U = window.PresenceData;
    const languages = U.asArray(data.topLanguages);
    U.setHtml(
      "[data-development-languages]",
      languages.length
        ? languages.map((item) => U.chip(item.language, `${U.number(item.repositories)} repos, ${U.number(item.stars)} stars`)).join("")
        : U.renderEmpty("No language summary is available yet.")
    );
  }

  function renderCategories() {
    const U = window.PresenceData;
    const categories = U.categorySummary(projects);
    U.setHtml(
      "[data-development-categories]",
      categories.length
        ? categories.map((item) => U.chip(item.category, `${item.count} project${item.count === 1 ? "" : "s"}`)).join("")
        : U.renderEmpty("No project categories are available yet.")
    );
  }

  function renderProjects(filter = "") {
    const U = window.PresenceData;
    const visible = projects.filter((repo) => matchesFilter(repo, filter));
    U.setHtml(
      "[data-project-list]",
      visible.length
        ? visible.map((repo) => U.repoCard(repo, events, { showScore: true })).join("")
        : U.renderEmpty("No projects match the current filter.")
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

    projects = U.sortedProjects(data);
    events = U.asArray(data.latestPublicEvents);

    renderSummary(data);
    renderLanguages(data);
    renderCategories();
    renderProjects();

    const filter = document.querySelector("[data-project-filter]");
    if (filter) {
      filter.addEventListener("input", () => renderProjects(filter.value));
    }
  }

  init();
})();
