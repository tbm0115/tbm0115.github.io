(function () {
  const jsonFiles = {
    development: "/development.json",
    domains: "/domains.json",
    search: "/search-results.json",
    social: "/social-media.json"
  };

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function number(value) {
    return Number.isFinite(Number(value)) ? Number(value) : 0;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
      };

      return entities[character];
    });
  }

  function safeUrl(value) {
    if (!value || typeof value !== "string") {
      return "#";
    }

    if (/^(https?:)?\/\//i.test(value) || value.startsWith("/")) {
      return value;
    }

    return `/${value.replace(/^\.?\//, "")}`;
  }

  function uniqueValues(values) {
    return [...new Set(asArray(values).filter(Boolean))];
  }

  function setText(selector, value) {
    const target = document.querySelector(selector);
    if (target) {
      target.textContent = value;
    }
  }

  function setHtml(selector, value) {
    const target = document.querySelector(selector);
    if (target) {
      target.innerHTML = value;
    }
  }

  function renderEmpty(message) {
    return `<p class="presence-empty">${escapeHtml(message)}</p>`;
  }

  function formatDate(value) {
    if (!value) {
      return "Not refreshed yet";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Not refreshed yet";
    }

    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    });
  }

  function compactDate(value) {
    if (!value) {
      return "";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function ageInDays(value) {
    const date = new Date(value || 0);
    if (Number.isNaN(date.getTime())) {
      return Infinity;
    }

    return Math.max(0, (Date.now() - date.getTime()) / 86400000);
  }

  async function loadJson(path, fallback) {
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.warn(`Unable to load ${path}`, error);
      return fallback;
    }
  }

  async function loadAllData() {
    const [development, domains, search, social] = await Promise.all([
      loadJson(jsonFiles.development, { recentRepositories: [], latestPublicEvents: [], topLanguages: [], summary: {} }),
      loadJson(jsonFiles.domains, { domains: [], summary: {} }),
      loadJson(jsonFiles.search, { topResults: [], status: "missing" }),
      loadJson(jsonFiles.social, { profiles: [], recentUpdates: [], summary: {} })
    ]);

    return { development, domains, search, social };
  }

  function newestTimestamp(values) {
    return values
      .filter(Boolean)
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => b - a)[0];
  }

  function statusClass(status) {
    if (status === "reachable" || status === "ok" || status === "active") {
      return "presence-status presence-status--ok";
    }

    if (status === "unknown" || status === "pending" || status === "skipped" || status === "in-development") {
      return "presence-status presence-status--warn";
    }

    return "presence-status presence-status--error";
  }

  function reachabilityLabel(item) {
    const status = item?.reachabilityStatus || item?.check?.reachabilityStatus;
    if (status === "reachable" || item?.isReachable === true) {
      return "Reachable";
    }

    if (status === "unreachable") {
      return "Offline";
    }

    return "Unknown";
  }

  function profileReachabilityLabel(profile) {
    const status = profile?.reachabilityStatus || profile?.check?.reachabilityStatus;
    if (status === "reachable" || profile?.isReachable === true) {
      return "Reachable";
    }

    if (status === "unreachable") {
      return "Unavailable";
    }

    return "Check inconclusive";
  }

  function domainStatusLabel(domain) {
    if (domain?.statusLabel) {
      return domain.statusLabel;
    }

    if (domain?.status === "in-development") {
      return "In development";
    }

    if (domain?.status === "inactive" || domain?.isActive === false) {
      return "Inactive";
    }

    return "Active";
  }

  function statCard(label, value, detail) {
    return `
      <article class="presence-stat-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        <small>${escapeHtml(detail || "")}</small>
      </article>
    `;
  }

  function chip(label, detail) {
    return `
      <span class="presence-chip">
        <strong>${escapeHtml(label)}</strong>
        ${detail ? `<small>${escapeHtml(detail)}</small>` : ""}
      </span>
    `;
  }

  function activityForRepo(repo, events) {
    if (repo?.latestActivity) {
      return repo.latestActivity;
    }

    const fullName = repo?.fullName || repo?.name || "";
    const event = asArray(events).find((item) => {
      return item.repo && fullName && item.repo.toLowerCase().endsWith(String(fullName).toLowerCase());
    });

    if (event) {
      return event;
    }

    return {
      summary: `Updated ${compactDate(repo?.pushedAt || repo?.updatedAt) || "recently"}`,
      url: repo?.url,
      createdAt: repo?.pushedAt || repo?.updatedAt
    };
  }

  function isPagesRepository(repo) {
    const name = String(repo?.name || "").toLowerCase();
    const fullName = String(repo?.fullName || "").toLowerCase();
    return name.endsWith(".github.io") || fullName.endsWith(".github.io");
  }

  function projectCategory(repo) {
    const text = `${repo?.name || ""} ${repo?.description || ""} ${asArray(repo?.topics).join(" ")}`.toLowerCase();
    const language = String(repo?.language || "").toLowerCase();

    if (/3d|print|laser|maker|cad/.test(text)) {
      return "Maker & 3D printing";
    }

    if (/api|integration|rapidapi|sports/.test(text)) {
      return "APIs & integrations";
    }

    if (language.includes("c#") || text.includes(".net") || text.includes("console")) {
      return ".NET & developer tools";
    }

    if (language.includes("visual basic") || text.includes("windows")) {
      return "Windows utilities";
    }

    if (["javascript", "typescript", "html", "css", "scss"].includes(language)) {
      return "Web & frontend";
    }

    return "Public projects";
  }

  function projectScore(repo) {
    // Small, transparent heuristic for a self-maintaining homepage:
    // favor fresh, described, useful projects with activity and public signals;
    // down-rank archives, forks, stale metadata, and the Pages repo itself.
    let score = 0;
    const days = ageInDays(repo?.pushedAt || repo?.updatedAt);

    if (repo?.archived) {
      score -= 100;
    }

    if (repo?.fork) {
      score -= 20;
    }

    if (isPagesRepository(repo)) {
      score -= 28;
    }

    if (days <= 14) {
      score += 42;
    } else if (days <= 60) {
      score += 30;
    } else if (days <= 180) {
      score += 18;
    } else if (days <= 365) {
      score += 8;
    }

    if (repo?.description) {
      score += 12;
    } else {
      score -= 8;
    }

    if (repo?.homepageUrl) {
      score += 10;
    }

    if (repo?.latestActivity) {
      score += 8;
    }

    if (repo?.language) {
      score += 4;
    }

    if (repo?.localPreviewUrl) {
      score += 3;
    }

    score += Math.min(number(repo?.stars) * 5, 25);
    score += Math.min(number(repo?.forks) * 3, 15);
    score += Math.min(asArray(repo?.topics).length * 3, 15);

    return score;
  }

  function sortedProjects(development) {
    return asArray(development?.recentRepositories)
      .slice()
      .sort((a, b) => projectScore(b) - projectScore(a) || new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  }

  function featuredProjects(development, limit = 5) {
    const eligible = sortedProjects(development).filter((repo) => !repo?.archived && (!repo?.fork || repo?.description));
    const nonPages = eligible.filter((repo) => !isPagesRepository(repo));

    return (nonPages.length >= 3 ? nonPages : eligible).slice(0, limit);
  }

  function categorySummary(repos) {
    const categories = new Map();

    for (const repo of asArray(repos)) {
      const category = projectCategory(repo);
      categories.set(category, (categories.get(category) || 0) + 1);
    }

    return [...categories.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
  }

  function repoCard(repo, events, options = {}) {
    const activity = activityForRepo(repo, events);
    const previewUrl = repo?.localPreviewUrl ? safeUrl(repo.localPreviewUrl) : "";
    const score = projectScore(repo);
    const meta = [repo?.language, `${number(repo?.stars)} stars`, `${number(repo?.forks)} forks`]
      .filter(Boolean)
      .join(" - ");
    const title = repo?.name || "Unnamed project";
    const category = projectCategory(repo);

    return `
      <article class="presence-card presence-card--repo">
        ${
          previewUrl
            ? `<a class="presence-card__media" href="${safeUrl(repo?.url)}" aria-label="${escapeHtml(title)} repository"><img src="${previewUrl}" alt="${escapeHtml(title)} social preview" loading="lazy"></a>`
            : `<a class="presence-card__media presence-card__media--fallback" href="${safeUrl(repo?.url)}" aria-label="${escapeHtml(title)} repository"><span>${escapeHtml(title)}</span></a>`
        }
        <div class="presence-card__body">
          <div class="presence-card__topline">
            <span class="presence-status presence-status--warn">${escapeHtml(category)}</span>
            ${options.showScore ? `<span class="presence-score">Score ${Math.round(score)}</span>` : ""}
          </div>
          <h3><a href="${safeUrl(repo?.url)}">${escapeHtml(title)}</a></h3>
          <p>${escapeHtml(repo?.description || "Public GitHub repository")}</p>
          <small>${escapeHtml(meta)}</small>
          <div class="presence-card__activity">
            <a href="${safeUrl(activity.url || repo?.url)}">${escapeHtml(activity.summary || "Recent repository activity")}</a>
            ${activity.createdAt ? `<small>${escapeHtml(compactDate(activity.createdAt))}</small>` : ""}
          </div>
          <div class="presence-card__links">
            <a href="${safeUrl(repo?.url)}">GitHub</a>
            ${repo?.homepageUrl ? `<a href="${safeUrl(repo.homepageUrl)}">Homepage</a>` : ""}
          </div>
        </div>
      </article>
    `;
  }

  function domainCard(domain, options = {}) {
    const reachability = domain?.reachabilityStatus || domain?.check?.reachabilityStatus || "unknown";
    const url = safeUrl(domain?.url || `https://${domain?.base || ""}`);
    const statusText = `${domainStatusLabel(domain)} - ${reachabilityLabel(domain)}`;
    const check = domain?.check || {};
    const details = [
      check.finalUrl ? `Final URL: ${check.finalUrl}` : "",
      check.responseTimeMs ? `Response: ${check.responseTimeMs} ms` : "",
      domain?.lastCheckedAt ? `Checked: ${compactDate(domain.lastCheckedAt)}` : ""
    ].filter(Boolean);

    return `
      <article class="presence-card presence-card--site">
        <div class="presence-card__topline">
          <span class="${statusClass(reachability)}">${escapeHtml(statusText)}</span>
        </div>
        <h3><a href="${url}">${escapeHtml(domain?.name || domain?.base || "Domain")}</a></h3>
        <p>${escapeHtml(domain?.description || "Managed domain")}</p>
        <small>${escapeHtml(domain?.base || domain?.url || "")}</small>
        ${options.showDetails && details.length ? `<ul class="presence-detail-list">${details.map((detail) => `<li>${escapeHtml(detail)}</li>`).join("")}</ul>` : ""}
      </article>
    `;
  }

  function profileCard(profile, options = {}) {
    const reachability = profile?.reachabilityStatus || profile?.check?.reachabilityStatus || "unknown";
    const initial = String(profile?.name || "?").trim().charAt(0).toUpperCase() || "?";
    const latestItems = asArray(profile?.latestItems).slice(0, options.latestItems || 0);

    return `
      <article class="presence-profile-card">
        <a href="${safeUrl(profile?.url)}">
          <span aria-hidden="true">${escapeHtml(initial)}</span>
          <strong>${escapeHtml(profile?.name || "Profile")}</strong>
          <small>${escapeHtml([profile?.category, profile?.type, profileReachabilityLabel(profile)].filter(Boolean).join(" - "))}</small>
        </a>
        ${
          latestItems.length
            ? `<ul class="presence-detail-list">${latestItems
                .map(
                  (item) => `<li><a href="${safeUrl(item.url || profile?.url)}">${escapeHtml(item.title || "Recent item")}</a>${item.publishedAt ? ` <small>${escapeHtml(compactDate(item.publishedAt))}</small>` : ""}</li>`
                )
                .join("")}</ul>`
            : ""
        }
      </article>
    `;
  }

  function searchResultCard(result, provider) {
    return `
      <article class="presence-card presence-card--search">
        <h3><a href="${safeUrl(result?.url)}">${escapeHtml(result?.title || "Search result")}</a></h3>
        <p>${escapeHtml(result?.snippet || result?.url || "")}</p>
        <small>${escapeHtml([provider, result?.publishedAt].filter(Boolean).join(" - "))}</small>
      </article>
    `;
  }

  function generatedProfessionalSummary(data) {
    const development = data?.development || {};
    const domains = data?.domains || {};
    const social = data?.social || {};
    const repos = asArray(development.recentRepositories);
    const languages = asArray(development.topLanguages)
      .slice(0, 4)
      .map((item) => item.language)
      .filter(Boolean);
    const categories = categorySummary(repos).slice(0, 2).map((item) => item.category.toLowerCase());
    const profileCategories = uniqueValues(asArray(social.profiles).map((profile) => profile.category)).slice(0, 2);
    const focus = uniqueValues([
      ...languages,
      ...categories,
      domains.summary?.activeExpected ? "practical web applications" : "",
      development.summary?.publicRepos ? "open-source projects" : "",
      ...profileCategories
    ]).slice(0, 6);

    if (!focus.length) {
      return "Software developer maintaining public projects, profiles, and web properties from generated dashboard data.";
    }

    return `Software developer focused on ${focus.join(", ")}. This page summarizes public work, domains, profiles, and discovery signals from generated data.`;
  }

  window.PresenceData = {
    activityForRepo,
    asArray,
    categorySummary,
    chip,
    compactDate,
    domainCard,
    domainStatusLabel,
    escapeHtml,
    featuredProjects,
    formatDate,
    generatedProfessionalSummary,
    isPagesRepository,
    loadAllData,
    loadJson,
    newestTimestamp,
    number,
    profileCard,
    profileReachabilityLabel,
    projectCategory,
    projectScore,
    reachabilityLabel,
    renderEmpty,
    repoCard,
    safeUrl,
    searchResultCard,
    setHtml,
    setText,
    sortedProjects,
    statCard,
    statusClass
  };
})();
