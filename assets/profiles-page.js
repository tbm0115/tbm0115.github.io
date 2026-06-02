(function () {
  function groupByCategory(profiles) {
    return profiles.reduce((groups, profile) => {
      const key = profile.category || "Public profiles";
      groups[key] = groups[key] || [];
      groups[key].push(profile);
      return groups;
    }, {});
  }

  async function init() {
    const U = window.PresenceData;
    const data = await U.loadJson("/social-media.json", {
      profiles: [],
      recentUpdates: [],
      summary: {}
    });
    const profiles = U.asArray(data.profiles);
    const summary = data.summary || {};
    const groups = groupByCategory(profiles);
    const updates = U.asArray(data.recentUpdates).slice(0, 12);

    U.setText("[data-profiles-updated]", `Last refresh: ${U.formatDate(data.lastUpdatedAt)}`);
    U.setHtml(
      "[data-profiles-summary]",
      [
        U.statCard("Profiles", profiles.length, "configured links"),
        U.statCard("Reachable", U.number(summary.reachable), "confirmed by check"),
        U.statCard("Inconclusive", U.number(summary.unknown), "often blocked by profile sites"),
        U.statCard("Activity sources", U.number(summary.feedsChecked), "feeds or APIs refreshed")
      ].join("")
    );

    U.setHtml(
      "[data-profile-groups]",
      Object.keys(groups).length
        ? Object.entries(groups)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(
              ([category, items]) => `
                <section class="presence-group" aria-labelledby="profile-category-${category.replace(/[^a-z0-9]+/gi, "-")}">
                  <h3 id="profile-category-${category.replace(/[^a-z0-9]+/gi, "-")}">${U.escapeHtml(category)}</h3>
                  <div class="presence-profile-grid">
                    ${items.map((profile) => U.profileCard(profile, { latestItems: 2 })).join("")}
                  </div>
                </section>
              `
            )
            .join("")
        : U.renderEmpty("No public profiles are configured yet.")
    );

    U.setHtml(
      "[data-profile-updates]",
      updates.length
        ? updates
            .map(
              (item) => `
                <li>
                  <a href="${U.safeUrl(item.url || item.sourceUrl)}">${U.escapeHtml(item.title || "Public update")}</a>
                  <small>${U.escapeHtml([item.source, U.compactDate(item.publishedAt)].filter(Boolean).join(" - "))}</small>
                </li>
              `
            )
            .join("")
        : "<li>No recent public profile updates captured.</li>"
    );
  }

  init();
})();
