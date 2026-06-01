(function () {
  const field = (name) => document.querySelector(`[data-live-field="${name}"]`);
  const list = (name) => document.querySelector(`[data-live-list="${name}"]`);

  function setField(name, value) {
    const target = field(name);
    if (target) {
      target.textContent = value;
    }
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

  function escapeText(value) {
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

  function renderList(name, items, renderer, emptyText) {
    const target = list(name);
    if (!target) {
      return;
    }

    if (!items || items.length === 0) {
      target.innerHTML = `<li>${escapeText(emptyText)}</li>`;
      return;
    }

    target.innerHTML = items.map(renderer).join("");
  }

  function renderContainer(name, items, renderer, emptyText) {
    const target = list(name);
    if (!target) {
      return;
    }

    if (!items || items.length === 0) {
      target.innerHTML = `<p>${escapeText(emptyText)}</p>`;
      return;
    }

    target.innerHTML = items.map(renderer).join("");
  }

  async function loadJson(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  function statusClass(status) {
    if (status === "ok") {
      return "presence-status presence-status--ok";
    }

    if (status === "skipped" || status === "pending" || status === "warn") {
      return "presence-status presence-status--warn";
    }

    return "presence-status presence-status--error";
  }

  function reachabilityLabel(item) {
    const status = item.reachabilityStatus || item.check?.reachabilityStatus;
    if (status === "reachable" || item.isReachable === true) {
      return "Reachable";
    }

    if (status === "unreachable") {
      return "Offline";
    }

    return "Not checked";
  }

  function reachabilityTone(item) {
    const status = item.reachabilityStatus || item.check?.reachabilityStatus;
    if (status === "reachable" || item.isReachable === true) {
      return "ok";
    }

    if (status === "unreachable") {
      return "error";
    }

    return "warn";
  }

  function domainStatusLabel(domain) {
    if (domain.statusLabel) {
      return domain.statusLabel;
    }

    if (domain.status === "in-development") {
      return "In development";
    }

    if (domain.status === "inactive" || domain.isActive === false) {
      return "Inactive";
    }

    return "Active";
  }

  function githubPreviewUrl(repo) {
    if (repo.localPreviewUrl) {
      return repo.localPreviewUrl;
    }

    return "";
  }

  function activityForRepo(repo, events) {
    if (repo.latestActivity) {
      return repo.latestActivity;
    }

    const fullName = repo.fullName || repo.name;
    const event = (events || []).find((item) => {
      return item.repo && fullName && item.repo.toLowerCase().endsWith(String(fullName).toLowerCase());
    });

    if (event) {
      return event;
    }

    return {
      summary: `Updated ${compactDate(repo.pushedAt || repo.updatedAt) || "recently"}`,
      url: repo.url,
      createdAt: repo.pushedAt || repo.updatedAt
    };
  }

  function renderDomains(data) {
    const summary = data.summary || {};
    const checked = summary.checked || 0;
    const reachable = summary.reachable || 0;
    const activeButUnreachable = summary.activeButUnreachable || 0;
    const unknown = summary.unknown || 0;

    setField("domains-summary", checked > 0 ? `${reachable}/${checked} reachable` : "Awaiting check");
    setField(
      "domains-detail",
      checked === 0
        ? "Domain inventory is ready for the next action run."
        : activeButUnreachable === 0
        ? "All expected active domains responded."
        : `${activeButUnreachable} expected active domain${activeButUnreachable === 1 ? "" : "s"} need attention; ${unknown} unknown.`
    );

    renderContainer(
      "sites",
      (data.domains || []).slice().sort((a, b) => {
        const rank = { active: 0, "in-development": 1, inactive: 2 };
        return (rank[a.status] ?? 1) - (rank[b.status] ?? 1) || String(a.name || a.base).localeCompare(String(b.name || b.base));
      }),
      (domain) => {
        const url = domain.url || `https://${domain.base}`;
        const tone = reachabilityTone(domain);
        const statusText = `${domainStatusLabel(domain)} - ${reachabilityLabel(domain)}`;

        return `
          <article class="presence-card presence-card--site">
            <div class="presence-card__topline">
              <span class="${statusClass(tone)}">${escapeText(statusText)}</span>
            </div>
            <h3><a href="${escapeText(url)}">${escapeText(domain.name || domain.base)}</a></h3>
            <p>${escapeText(domain.description || "Public domain")}</p>
            <small>${escapeText(domain.base || url)}</small>
          </article>
        `;
      },
      "No sites are configured yet."
    );

    return data.lastUpdatedAt;
  }

  function renderSocial(data) {
    const summary = data.summary || {};
    const feedsChecked = summary.feedsChecked || 0;
    const unknown = summary.unknown || 0;

    setField("social-summary", feedsChecked > 0 ? `${feedsChecked} refreshed` : "Awaiting activity");
    setField(
      "social-detail",
      `${feedsChecked} public activity source${feedsChecked === 1 ? "" : "s"} refreshed${unknown ? `; ${unknown} profile probe${unknown === 1 ? "" : "s"} inconclusive` : ""}.`
    );

    renderList(
      "updates",
      (data.recentUpdates || []).slice(0, 5),
      (item) => `
        <li>
          <a href="${escapeText(item.url || item.sourceUrl)}">${escapeText(item.title || item.source)}</a>
          <small>${escapeText(item.source || "Public source")}${item.publishedAt ? ` - ${escapeText(compactDate(item.publishedAt))}` : ""}</small>
        </li>
      `,
      "No feed updates captured yet."
    );

    return data.lastUpdatedAt;
  }

  function renderDevelopment(data) {
    const summary = data.summary || {};
    const status = data.status || "pending";
    const events = data.latestPublicEvents || [];

    setField("development-summary", `${summary.publicRepos || 0} repos`);
    setField(
      "development-detail",
      `${summary.totalStars || 0} stars, ${summary.totalForks || 0} forks, status ${status}.`
    );

    renderList(
      "github-events",
      (data.latestPublicEvents || []).slice(0, 5),
      (event) => `
        <li>
          <a href="${escapeText(event.url)}">${escapeText(event.summary || event.type)}</a>
          <small>${escapeText(event.repo || "GitHub")}${event.createdAt ? ` - ${escapeText(compactDate(event.createdAt))}` : ""}</small>
        </li>
      `,
      "No recent public GitHub events captured."
    );

    renderContainer(
      "development-repos",
      data.recentRepositories || [],
      (repo) => {
        const activity = activityForRepo(repo, events);
        const previewUrl = githubPreviewUrl(repo);
        const meta = [repo.language, `${repo.stars || 0} stars`, `${repo.forks || 0} forks`]
          .filter(Boolean)
          .join(" - ");

        return `
          <article class="presence-card presence-card--repo">
            ${
              previewUrl
                ? `<a class="presence-card__media" href="${escapeText(repo.url)}" aria-label="${escapeText(repo.name)} repository"><img src="${escapeText(previewUrl)}" alt="" loading="lazy"></a>`
                : `<a class="presence-card__media presence-card__media--fallback" href="${escapeText(repo.url)}" aria-label="${escapeText(repo.name)} repository"><span>${escapeText(repo.name)}</span></a>`
            }
            <div class="presence-card__body">
              <h3><a href="${escapeText(repo.url)}">${escapeText(repo.name)}</a></h3>
              <p>${escapeText(repo.description || "Public GitHub repository")}</p>
              <small>${escapeText(meta)}</small>
              <div class="presence-card__activity">
                <a href="${escapeText(activity.url || repo.url)}">${escapeText(activity.summary || "Recent repository activity")}</a>
                ${activity.createdAt ? `<small>${escapeText(compactDate(activity.createdAt))}</small>` : ""}
              </div>
            </div>
          </article>
        `;
      },
      "No public repositories captured yet."
    );

    return data.lastUpdatedAt;
  }

  function renderSearch(data) {
    const status = data.status || "pending";
    const provider = data.provider || "none";
    const results = data.topResults || [];

    setField("search-summary", `${results.length} result${results.length === 1 ? "" : "s"}`);
    setField("search-detail", `${provider} ${status === "ok" ? "refreshed" : status}.`);

    renderList(
      "search-results",
      results.slice(0, 5),
      (result) => `
        <li>
          <span class="${statusClass(status)}">${escapeText(status)}</span>
          <a href="${escapeText(result.url)}">${escapeText(result.title)}</a>
          <small>${escapeText(result.snippet || result.url || "")}</small>
        </li>
      `,
      data.note || "Search refresh is waiting for an API secret."
    );

    return data.lastUpdatedAt;
  }

  function newestTimestamp(values) {
    return values
      .filter(Boolean)
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => b - a)[0];
  }

  async function init() {
    try {
      const [domains, social, development, search] = await Promise.all([
        loadJson("domains.json"),
        loadJson("social-media.json"),
        loadJson("development.json"),
        loadJson("search-results.json")
      ]);

      const updatedAt = newestTimestamp([
        renderDomains(domains),
        renderSocial(social),
        renderDevelopment(development),
        renderSearch(search)
      ]);

      setField("last-updated", `Last refresh: ${formatDate(updatedAt)}`);
    } catch (error) {
      setField("last-updated", "Live data unavailable");
      setField("domains-summary", "Unavailable");
      setField("domains-detail", error.message);
      setField("social-summary", "Unavailable");
      setField("development-summary", "Unavailable");
      setField("search-summary", "Unavailable");
    }
  }

  init();
})();
