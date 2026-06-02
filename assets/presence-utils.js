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
    let score = 0;
    const days = ageInDays(repo?.pushedAt || repo?.updatedAt);

    if (repo?.archived) {
      score -= 100;
    }

    if (repo?.fork) {
      score -= 20;
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
    return sortedProjects(development)
      .filter((repo) => !repo?.archived && (!repo?.fork || repo?.description))
      .slice(0, limit);
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
        </div>
      </article>
    `;
  }

  function domainCard(domain) {
    const reachability = domain?.reachabilityStatus || domain?.check?.reachabilityStatus || "unknown";
    const url = safeUrl(domain?.url || `https://${domain?.base || ""}`);
    const statusText = `${domainStatusLabel(domain)} - ${reachabilityLabel(domain)}`;

    return `
      <article class="presence-card presence-card--site">
        <div class="presence-card__topline">
          <span class="${statusClass(reachability)}">${escapeHtml(statusText)}</span>
        </div>
        <h3><a href="${url}">${escapeHtml(domain?.name || domain?.base || "Domain")}</a></h3>
        <p>${escapeHtml(domain?.description || "Managed domain")}</p>
        <small>${escapeHtml(domain?.base || domain?.url || "")}</small>
      </article>
    `;
  }

  function profileCard(profile) {
    const reachability = profile?.reachabilityStatus || profile?.check?.reachabilityStatus || "unknown";
    const initial = String(profile?.name || "?").trim().charAt(0).toUpperCase() || "?";

    return `
      <a class="presence-profile-card" href="${safeUrl(profile?.url)}">
        <span aria-hidden="true">${escapeHtml(initial)}</span>
        <strong>${escapeHtml(profile?.name || "Profile")}</strong>
        <small>${escapeHtml([profile?.category, profile?.type, reachabilityLabel(profile)].filter(Boolean).join(" - "))}</small>
      </a>
    `;
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
    loadAllData,
    loadJson,
    newestTimestamp,
    number,
    profileCard,
    projectCategory,
    projectScore,
    reachabilityLabel,
    renderEmpty,
    repoCard,
    safeUrl,
    setHtml,
    setText,
    sortedProjects,
    statCard,
    statusClass
  };
})();
