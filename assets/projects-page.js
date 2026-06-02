(function () {
  let projects = [];
  let events = [];
  let activeLanguage = "";

  function matches(repo, filter) {
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

    return (!filter || text.includes(filter.toLowerCase())) && (!activeLanguage || repo.language === activeLanguage);
  }

  function renderLanguageFilters() {
    const U = window.PresenceData;
    const languages = U.asArray(projects.map((repo) => repo.language))
      .filter(Boolean)
      .filter((language, index, all) => all.indexOf(language) === index)
      .sort();

    U.setHtml(
      "[data-projects-language-filter]",
      languages.length
        ? [
            `<button type="button" class="presence-filter-chip${activeLanguage ? "" : " is-active"}" data-language="">All</button>`,
            ...languages.map(
              (language) => `<button type="button" class="presence-filter-chip${activeLanguage === language ? " is-active" : ""}" data-language="${U.escapeHtml(language)}">${U.escapeHtml(language)}</button>`
            )
          ].join("")
        : ""
    );

    document.querySelectorAll("[data-language]").forEach((button) => {
      button.addEventListener("click", () => {
        activeLanguage = button.getAttribute("data-language") || "";
        renderLanguageFilters();
        renderProjects(document.querySelector("[data-projects-filter]")?.value || "");
      });
    });
  }

  function renderProjects(filter = "") {
    const U = window.PresenceData;
    const visible = projects.filter((repo) => matches(repo, filter));
    U.setHtml(
      "[data-projects-list]",
      visible.length
        ? visible.map((repo) => U.repoCard(repo, events, { showScore: true })).join("")
        : U.renderEmpty("No projects match the current filters.")
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

    U.setText("[data-projects-updated]", `Last refresh: ${U.formatDate(data.lastUpdatedAt)}`);
    U.setHtml(
      "[data-projects-summary]",
      [
        U.statCard("Projects shown", projects.length, "from recentRepositories"),
        U.statCard("Featured", U.featuredProjects(data, 5).length, "selected by score"),
        U.statCard("Languages", U.asArray(data.topLanguages).length, "reported by GitHub"),
        U.statCard("With homepages", projects.filter((repo) => repo.homepageUrl).length, "linked project sites")
      ].join("")
    );
    U.setHtml(
      "[data-projects-featured]",
      U.featuredProjects(data, 5).map((repo) => U.repoCard(repo, events, { showScore: true })).join("") ||
        U.renderEmpty("No featured projects are available yet.")
    );

    renderLanguageFilters();
    renderProjects();

    const filter = document.querySelector("[data-projects-filter]");
    if (filter) {
      filter.addEventListener("input", () => renderProjects(filter.value));
    }
  }

  init();
})();
