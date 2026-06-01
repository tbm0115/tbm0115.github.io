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

    if (status === "skipped" || status === "pending") {
      return "presence-status presence-status--warn";
    }

    return "presence-status presence-status--error";
  }

  function renderDomains(data) {
    const summary = data.summary || {};
    const checked = summary.checked || 0;
    const reachable = summary.reachable || 0;
    const activeButUnreachable = summary.activeButUnreachable || 0;

    setField("domains-summary", `${reachable}/${checked} reachable`);
    setField(
      "domains-detail",
      activeButUnreachable === 0
        ? "All expected active domains responded."
        : `${activeButUnreachable} expected active domain${activeButUnreachable === 1 ? "" : "s"} need attention.`
    );

    return data.lastUpdatedAt;
  }

  function renderSocial(data) {
    const summary = data.summary || {};
    const checked = summary.checked || 0;
    const reachable = summary.reachable || 0;
    const feedsChecked = summary.feedsChecked || 0;

    setField("social-summary", `${reachable}/${checked} reachable`);
    setField("social-detail", `${feedsChecked} public feed${feedsChecked === 1 ? "" : "s"} refreshed.`);

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
