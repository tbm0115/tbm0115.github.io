(function () {
  let domains = [];

  function matchesFilter(domain, filter) {
    if (!filter) {
      return true;
    }

    const text = [
      domain.name,
      domain.base,
      domain.description,
      domain.status,
      domain.statusLabel,
      domain.reachabilityStatus
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return text.includes(filter.toLowerCase());
  }

  function renderSummary(data) {
    const U = window.PresenceData;
    const summary = data.summary || {};
    U.setText("[data-domains-updated]", `Last refresh: ${U.formatDate(data.lastUpdatedAt)}`);
    U.setHtml(
      "[data-domain-page-summary]",
      [
        U.statCard("Tracked", U.number(summary.checked) || domains.length, "managed domains"),
        U.statCard("Reachable", U.number(summary.reachable), "responded successfully"),
        U.statCard("Unreachable", U.number(summary.unreachable), "offline or error status"),
        U.statCard("Unknown", U.number(summary.unknown), "blocked or inconclusive checks"),
        U.statCard("Active expected", U.number(summary.activeExpected), "active or in development"),
        U.statCard("Active issues", U.number(summary.activeButUnreachable), "active but unreachable")
      ].join("")
    );
  }

  function renderDomains(filter = "") {
    const U = window.PresenceData;
    const visible = domains.filter((domain) => matchesFilter(domain, filter));
    U.setHtml(
      "[data-domain-list]",
      visible.length
        ? visible.map((domain) => U.domainCard(domain, { showDetails: true })).join("")
        : U.renderEmpty("No domains match the current filter.")
    );
  }

  async function init() {
    const U = window.PresenceData;
    const data = await U.loadJson("/domains.json", { domains: [], summary: {} });
    domains = U.asArray(data.domains).slice().sort((a, b) => {
      const rank = { active: 0, "in-development": 1, inactive: 2 };
      return (rank[a.status] ?? 1) - (rank[b.status] ?? 1) || String(a.name || a.base).localeCompare(String(b.name || b.base));
    });

    renderSummary(data);
    renderDomains();

    const filter = document.querySelector("[data-domain-filter]");
    if (filter) {
      filter.addEventListener("input", () => renderDomains(filter.value));
    }
  }

  init();
})();
