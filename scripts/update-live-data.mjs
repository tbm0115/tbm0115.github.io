#!/usr/bin/env node

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const flags = new Set(process.argv.slice(2));
const dryRun = flags.has("--dry-run");
const offline = flags.has("--offline") || process.env.LIVE_DATA_OFFLINE === "1";
const checkedAt = new Date().toISOString();

const dataFiles = [
  "domains.json",
  "social-media.json",
  "development.json",
  "search-results.json"
];

const previewDirectory = "assets/repo-previews";

function filePath(fileName) {
  return path.join(repoRoot, fileName);
}

async function readJson(fileName, fallback) {
  const target = filePath(fileName);
  if (!existsSync(target)) {
    return structuredClone(fallback);
  }

  const content = await readFile(target, "utf8");
  return JSON.parse(content);
}

async function writeJson(fileName, value) {
  const content = `${JSON.stringify(value, null, 2)}\n`;

  if (dryRun) {
    console.log(`[dry-run] Would write ${fileName}`);
    return;
  }

  await writeFile(filePath(fileName), content, "utf8");
  console.log(`Updated ${fileName}`);
}

async function writeBinary(fileName, value) {
  if (dryRun) {
    console.log(`[dry-run] Would write ${fileName}`);
    return;
  }

  await mkdir(path.dirname(filePath(fileName)), { recursive: true });
  await writeFile(filePath(fileName), value);
  console.log(`Updated ${fileName}`);
}

function userAgent() {
  return "tbm0115.github.io live data updater";
}

function requestHeaders(extra = {}) {
  return {
    "User-Agent": userAgent(),
    ...extra
  };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      redirect: "follow",
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeUrl(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed.replace(/^\/+/, "")}`;
}

function classifyReachability(response) {
  if (!response) {
    return "unknown";
  }

  if (response.status >= 200 && response.status < 400) {
    return "reachable";
  }

  if ([401, 403, 429].includes(response.status)) {
    return "unknown";
  }

  return "unreachable";
}

function responseToCheck(response, started) {
  const reachabilityStatus = classifyReachability(response);

  return {
    ok: reachabilityStatus === "reachable",
    reachabilityStatus,
    statusCode: response.status,
    statusText: response.statusText,
    finalUrl: response.url,
    responseTimeMs: Date.now() - started,
    checkedAt
  };
}

function requestErrorMessage(error) {
  return error.name === "AbortError" ? "Request timed out" : error.message;
}

function fallbackUrls(url, allowHttpFallback) {
  if (!url || !allowHttpFallback || !url.startsWith("https://")) {
    return [url];
  }

  return [url, `http://${url.slice("https://".length)}`];
}

async function checkUrl(url, options = {}) {
  const timeoutMs = options.timeoutMs ?? 15000;
  const preferGet = options.preferGet === true;
  const allowHttpFallback = options.allowHttpFallback === true;
  const started = Date.now();

  if (!url) {
    return {
      ok: false,
      statusCode: null,
      statusText: "Missing URL",
      finalUrl: null,
      responseTimeMs: 0,
      checkedAt,
      reachabilityStatus: "unreachable",
      error: "Missing URL"
    };
  }

  const methods = preferGet ? ["GET"] : ["HEAD", "GET"];
  let lastCheck = null;
  let lastError = null;

  for (const candidateUrl of fallbackUrls(url, allowHttpFallback)) {
    for (const method of methods) {
      try {
        const response = await fetchWithTimeout(
          candidateUrl,
          {
            method,
            headers: requestHeaders({
              Accept:
                method === "HEAD"
                  ? "*/*"
                  : "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
            })
          },
          timeoutMs
        );
        const check = responseToCheck(response, started);

        if (check.ok || method === "GET") {
          return check;
        }

        lastCheck = check;
      } catch (error) {
        lastError = error;
      }
    }
  }

  return (
    lastCheck || {
      ok: false,
      reachabilityStatus: "unknown",
      statusCode: null,
      statusText: "Request failed",
      finalUrl: url,
      responseTimeMs: Date.now() - started,
      checkedAt,
      error: lastError ? requestErrorMessage(lastError) : "Request failed"
    }
  );
}

function isReachable(item) {
  return item.check?.reachabilityStatus === "reachable" || item.check?.ok === true;
}

function isUnreachable(item) {
  return item.check?.reachabilityStatus === "unreachable";
}

function isUnknownReachability(item) {
  return item.check?.reachabilityStatus === "unknown";
}

function isActiveDomain(domain) {
  return domain.isActive !== false && domain.status !== "inactive";
}

function statusLabel(status, isActive) {
  if (status === "in-development") {
    return "In development";
  }

  if (status === "inactive" || isActive === false) {
    return "Inactive";
  }

  return "Active";
}

async function fetchJson(url, options = {}) {
  const { timeoutMs = 15000, headers = {}, ...fetchOptions } = options;
  const response = await fetchWithTimeout(
    url,
    {
      ...fetchOptions,
      headers: requestHeaders(headers)
    },
    timeoutMs
  );

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} from ${url}`);
  }

  return response.json();
}

async function fetchText(url, options = {}) {
  const { timeoutMs = 15000, headers = {}, ...fetchOptions } = options;
  const response = await fetchWithTimeout(
    url,
    {
      ...fetchOptions,
      headers: requestHeaders(headers)
    },
    timeoutMs
  );

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} from ${url}`);
  }

  return response.text();
}

function countWhere(items, predicate) {
  return items.reduce((count, item) => count + (predicate(item) ? 1 : 0), 0);
}

async function updateDomains() {
  const data = await readJson("domains.json", { domains: [] });
  const domains = Array.isArray(data.domains) ? data.domains : [];

  const checkedDomains = await Promise.all(
    domains.map(async (domain) => {
      const url = normalizeUrl(domain.url || domain.base);
      const check = await checkUrl(url, { allowHttpFallback: true });

      return {
        ...domain,
        url,
        statusLabel: domain.statusLabel || statusLabel(domain.status, domain.isActive),
        isReachable: check.ok,
        reachabilityStatus: check.reachabilityStatus,
        lastCheckedAt: checkedAt,
        check
      };
    })
  );

  return {
    ...data,
    lastUpdatedAt: checkedAt,
    summary: {
      checked: checkedDomains.length,
      reachable: countWhere(checkedDomains, isReachable),
      unreachable: countWhere(checkedDomains, isUnreachable),
      unknown: countWhere(checkedDomains, isUnknownReachability),
      activeExpected: countWhere(checkedDomains, isActiveDomain),
      activeButUnreachable: countWhere(
        checkedDomains,
        (domain) => isActiveDomain(domain) && isUnreachable(domain)
      )
    },
    domains: checkedDomains
  };
}

function decodeEntities(value) {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    quot: "\""
  };

  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => named[name] ?? match);
}

function stripMarkup(value) {
  return decodeEntities(
    value
      .replace(/^<!\[CDATA\[/, "")
      .replace(/\]\]>$/, "")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function escapedTag(tagName) {
  return tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function blocksFor(xml, tagName) {
  const tag = escapedTag(tagName);
  const expression = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const blocks = [];
  let match = expression.exec(xml);

  while (match) {
    blocks.push(match[1]);
    match = expression.exec(xml);
  }

  return blocks;
}

function tagText(block, tagName) {
  const tag = escapedTag(tagName);
  const match = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(block);
  return match ? stripMarkup(match[1]) : null;
}

function linkForFeedBlock(block) {
  const atomLink = /<link\b[^>]*href=["']([^"']+)["'][^>]*>/i.exec(block);
  if (atomLink) {
    return decodeEntities(atomLink[1]);
  }

  return tagText(block, "link");
}

function parseFeed(xml, limit = 5) {
  const blocks = blocksFor(xml, "entry").length > 0 ? blocksFor(xml, "entry") : blocksFor(xml, "item");

  return blocks
    .slice(0, limit)
    .map((block) => ({
      title: tagText(block, "title"),
      url: linkForFeedBlock(block),
      publishedAt:
        tagText(block, "updated") ||
        tagText(block, "published") ||
        tagText(block, "pubDate") ||
        tagText(block, "dc:date")
    }))
    .filter((item) => item.title || item.url);
}

async function fetchGitHubActivityItems(username, limit = 5) {
  const events = await fetchGitHubApi(`/users/${encodeURIComponent(username)}/events/public?per_page=${limit}`);
  return Array.isArray(events)
    ? events.slice(0, limit).map((event) => {
        const summary = summarizeGitHubEvent(event);
        return {
          title: summary.summary,
          url: summary.url,
          publishedAt: summary.createdAt
        };
      })
    : [];
}

async function fetchStackExchangeTimelineItems(profile, limit = 5) {
  const url = new URL(
    `https://api.stackexchange.com/2.3/users/${encodeURIComponent(profile.stackExchangeUserId)}/timeline`
  );
  url.searchParams.set("site", profile.stackExchangeSite);
  url.searchParams.set("pagesize", String(limit));

  if (process.env.STACK_EXCHANGE_KEY) {
    url.searchParams.set("key", process.env.STACK_EXCHANGE_KEY);
  }

  const data = await fetchJson(url.toString(), {
    headers: { Accept: "application/json" },
    timeoutMs: 20000
  });

  return (data.items || []).slice(0, limit).map((item) => ({
    title: item.title || `${item.timeline_type || "Activity"} on ${profile.name}`,
    url: item.link || profile.url,
    publishedAt: item.creation_date ? new Date(item.creation_date * 1000).toISOString() : null
  }));
}

async function updateSocialMedia() {
  const data = await readJson("social-media.json", { profiles: [], recentUpdates: [] });
  const profiles = Array.isArray(data.profiles) ? data.profiles : [];

  const checkedProfiles = await Promise.all(
    profiles.map(async (profile) => {
      const url = normalizeUrl(profile.url);
      const check = await checkUrl(url, { preferGet: true, timeoutMs: 20000 });
      let latestItems = Array.isArray(profile.latestItems) ? profile.latestItems : [];
      let feedStatus = profile.feedUrl ? "pending" : "not-configured";
      let feedError = null;

      if (profile.activitySource === "github-events") {
        try {
          latestItems = await fetchGitHubActivityItems(profile.githubUsername || "tbm0115", 5);
          feedStatus = "ok";
        } catch (error) {
          feedStatus = "error";
          feedError = error.message;
        }
      } else if (profile.activitySource === "stackexchange-timeline") {
        try {
          latestItems = await fetchStackExchangeTimelineItems(profile, 5);
          feedStatus = "ok";
        } catch (error) {
          feedStatus = "error";
          feedError = error.message;
        }
      }

      if ((!latestItems || latestItems.length === 0) && profile.feedUrl) {
        try {
          const feedXml = await fetchText(profile.feedUrl, {
            headers: {
              Accept: "application/atom+xml,application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.8"
            }
          });
          latestItems = parseFeed(feedXml, 5);
          feedStatus = "ok";
        } catch (error) {
          feedStatus = "error";
          feedError = error.message;
        }
      }

      return {
        ...profile,
        url,
        isReachable: check.ok,
        reachabilityStatus: check.reachabilityStatus,
        lastCheckedAt: checkedAt,
        check,
        feedStatus,
        ...(feedError ? { feedError } : {}),
        latestItems
      };
    })
  );

  const recentUpdates = checkedProfiles
    .flatMap((profile) =>
      (profile.latestItems || []).map((item) => ({
        source: profile.name,
        sourceUrl: profile.url,
        title: item.title,
        url: item.url,
        publishedAt: item.publishedAt
      }))
    )
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
    .slice(0, 10);

  return {
    ...data,
    lastUpdatedAt: checkedAt,
    summary: {
      checked: checkedProfiles.length,
      reachable: countWhere(checkedProfiles, isReachable),
      unreachable: countWhere(checkedProfiles, isUnreachable),
      unknown: countWhere(checkedProfiles, isUnknownReachability),
      feedsChecked: countWhere(checkedProfiles, (profile) => profile.feedStatus === "ok"),
      feedErrors: countWhere(checkedProfiles, (profile) => profile.feedStatus === "error")
    },
    profiles: checkedProfiles,
    recentUpdates
  };
}

function githubHeaders() {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

async function fetchGitHubApi(apiPath) {
  return fetchJson(`https://api.github.com${apiPath}`, {
    headers: githubHeaders(),
    timeoutMs: 20000
  });
}

async function fetchAllGitHubPages(apiPath, maxPages = 10) {
  const results = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const separator = apiPath.includes("?") ? "&" : "?";
    const pageItems = await fetchGitHubApi(`${apiPath}${separator}page=${page}`);

    if (!Array.isArray(pageItems) || pageItems.length === 0) {
      break;
    }

    results.push(...pageItems);

    if (pageItems.length < 100) {
      break;
    }
  }

  return results;
}

function eventTypeLabel(type) {
  return type.replace(/Event$/, "").replace(/([a-z])([A-Z])/g, "$1 $2");
}

function actionLabel(action) {
  if (!action) {
    return "Updated";
  }

  return `${action.charAt(0).toUpperCase()}${action.slice(1)}`;
}

function summarizeGitHubEvent(event) {
  const payload = event.payload || {};
  const repoName = event.repo?.name || null;
  let summary = eventTypeLabel(event.type);
  let url = repoName ? `https://github.com/${repoName}` : "https://github.com/tbm0115";

  if (event.type === "PushEvent") {
    const commitCount = Array.isArray(payload.commits) ? payload.commits.length : 0;
    const branch = payload.ref ? payload.ref.split("/").pop() : "a branch";
    summary =
      commitCount > 0
        ? `Pushed ${commitCount} commit${commitCount === 1 ? "" : "s"} to ${branch}`
        : `Updated ${branch}`;
  } else if (event.type === "CreateEvent") {
    summary = `Created ${payload.ref_type || "resource"}${payload.ref ? ` ${payload.ref}` : ""}`;
  } else if (event.type === "DeleteEvent") {
    summary = `Deleted ${payload.ref_type || "resource"}${payload.ref ? ` ${payload.ref}` : ""}`;
  } else if (event.type === "PullRequestEvent" && payload.pull_request) {
    const title = payload.pull_request.title || repoName || "pull request";
    summary = `${actionLabel(payload.action)} PR #${payload.pull_request.number}: ${title}`;
    url = payload.pull_request.html_url || url;
  } else if (event.type === "IssuesEvent" && payload.issue) {
    summary = `${actionLabel(payload.action)} issue #${payload.issue.number}: ${payload.issue.title}`;
    url = payload.issue.html_url || url;
  } else if (event.type === "IssueCommentEvent" && payload.comment) {
    summary = `${actionLabel(payload.action)} an issue comment`;
    url = payload.comment.html_url || url;
  } else if (event.type === "ReleaseEvent" && payload.release) {
    summary = `${actionLabel(payload.action)} release ${payload.release.name || payload.release.tag_name}`;
    url = payload.release.html_url || url;
  } else if (event.type === "WatchEvent") {
    summary = "Starred a repository";
  } else if (event.type === "ForkEvent") {
    summary = "Forked a repository";
    url = payload.forkee?.html_url || url;
  }

  return {
    type: eventTypeLabel(event.type),
    repo: repoName,
    summary,
    url,
    createdAt: event.created_at
  };
}

function repoPreviewUrl(repo, checkedAtValue) {
  const fullName = repo.full_name || `${repo.owner?.login || "tbm0115"}/${repo.name}`;
  const [owner, name] = fullName.split("/");
  const cacheKey = String(repo.updated_at || checkedAtValue).replace(/[^0-9A-Za-z]/g, "") || "latest";

  return `https://opengraph.githubassets.com/${cacheKey}/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
}

function repoPreviewFileName(repo) {
  const fullName = repo.full_name || `${repo.owner?.login || "tbm0115"}/${repo.name}`;
  const slug = fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${previewDirectory}/${slug || repo.name}.png`;
}

async function cacheRepoPreview(repo, sourceUrl) {
  const localPath = repoPreviewFileName(repo);

  if (existsSync(filePath(localPath))) {
    return {
      localPreviewUrl: localPath,
      previewStatus: "cached"
    };
  }

  try {
    const response = await fetchWithTimeout(
      sourceUrl,
      {
        method: "GET",
        headers: requestHeaders({
          Accept: "image/avif,image/webp,image/png,image/*;q=0.8,*/*;q=0.5"
        })
      },
      20000
    );

    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.startsWith("image/")) {
      return {
        localPreviewUrl: null,
        previewStatus: "unavailable",
        previewError: `${response.status} ${response.statusText}`
      };
    }

    await writeBinary(localPath, Buffer.from(await response.arrayBuffer()));

    return {
      localPreviewUrl: localPath,
      previewStatus: "cached"
    };
  } catch (error) {
    return {
      localPreviewUrl: null,
      previewStatus: "unavailable",
      previewError: requestErrorMessage(error)
    };
  }
}

function latestActivityForRepo(repo, events) {
  const fullName = repo.full_name || `${repo.owner?.login || "tbm0115"}/${repo.name}`;
  const latestEvent = events.find((event) => event.repo?.toLowerCase() === fullName.toLowerCase());

  if (latestEvent) {
    return latestEvent;
  }

  return {
    type: "Repository",
    repo: fullName,
    summary: `Repository updated ${repo.pushed_at ? "from a recent push" : "recently"}`,
    url: repo.html_url,
    createdAt: repo.pushed_at || repo.updated_at
  };
}

function languageSummary(repos) {
  const byLanguage = new Map();

  for (const repo of repos) {
    if (!repo.language) {
      continue;
    }

    const current = byLanguage.get(repo.language) || {
      language: repo.language,
      repositories: 0,
      stars: 0
    };

    current.repositories += 1;
    current.stars += repo.stargazers_count || 0;
    byLanguage.set(repo.language, current);
  }

  return [...byLanguage.values()]
    .sort((a, b) => b.repositories - a.repositories || b.stars - a.stars || a.language.localeCompare(b.language))
    .slice(0, 8);
}

async function updateDevelopment() {
  const existing = await readJson("development.json", { githubUsername: "tbm0115" });
  const username = process.env.GITHUB_USERNAME || existing.githubUsername || "tbm0115";

  try {
    const [user, repos, events] = await Promise.all([
      fetchGitHubApi(`/users/${encodeURIComponent(username)}`),
      fetchAllGitHubPages(`/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated&type=owner`),
      fetchGitHubApi(`/users/${encodeURIComponent(username)}/events/public?per_page=30`)
    ]);
    const latestPublicEvents = Array.isArray(events) ? events.slice(0, 10).map(summarizeGitHubEvent) : [];
    const eventPool = Array.isArray(events) ? events.map(summarizeGitHubEvent) : [];

    const recentRepositories = await Promise.all(
      repos.slice(0, 8).map(async (repo) => {
        const socialPreviewSourceUrl = repoPreviewUrl(repo, checkedAt);
        const preview = await cacheRepoPreview(repo, socialPreviewSourceUrl);

        return {
          name: repo.name,
          fullName: repo.full_name || `${username}/${repo.name}`,
          description: repo.description,
          url: repo.html_url,
          homepageUrl: repo.homepage || null,
          socialPreviewSourceUrl,
          localPreviewUrl: preview.localPreviewUrl,
          previewStatus: preview.previewStatus,
          ...(preview.previewError ? { previewError: preview.previewError } : {}),
          language: repo.language,
          stars: repo.stargazers_count || 0,
          forks: repo.forks_count || 0,
          updatedAt: repo.updated_at,
          pushedAt: repo.pushed_at || null,
          latestActivity: latestActivityForRepo(repo, eventPool)
        };
      })
    );

    return {
      ...existing,
      lastUpdatedAt: checkedAt,
      status: "ok",
      githubUsername: username,
      profileUrl: user.html_url,
      summary: {
        publicRepos: user.public_repos || repos.length,
        followers: user.followers || 0,
        following: user.following || 0,
        totalStars: repos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0),
        totalForks: repos.reduce((sum, repo) => sum + (repo.forks_count || 0), 0)
      },
      topLanguages: languageSummary(repos),
      recentRepositories,
      latestPublicEvents,
      error: null
    };
  } catch (error) {
    return {
      ...existing,
      lastUpdatedAt: checkedAt,
      status: "error",
      githubUsername: username,
      error: error.message
    };
  }
}

function normalizeSearchResult(result) {
  return {
    title: result.title || result.name || "Untitled result",
    url: result.url || result.link,
    snippet: result.description || result.snippet || result.snippet_highlighted_words?.join(" ") || null,
    publishedAt: result.age || result.date || null
  };
}

async function searchWithBrave(query) {
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", "5");
  url.searchParams.set("country", process.env.SEARCH_COUNTRY || "US");
  url.searchParams.set("search_lang", process.env.SEARCH_LANGUAGE || "en");

  const data = await fetchJson(url.toString(), {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY
    },
    timeoutMs: 20000
  });

  return (data.web?.results || []).slice(0, 5).map(normalizeSearchResult);
}

async function searchWithSerpApi(query) {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("num", "5");
  url.searchParams.set("api_key", process.env.SERPAPI_KEY);

  const data = await fetchJson(url.toString(), {
    headers: { Accept: "application/json" },
    timeoutMs: 20000
  });

  return (data.organic_results || []).slice(0, 5).map(normalizeSearchResult);
}

async function searchWithBing(query) {
  const url = new URL("https://api.bing.microsoft.com/v7.0/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", "5");
  url.searchParams.set("mkt", process.env.SEARCH_MARKET || "en-US");

  const data = await fetchJson(url.toString(), {
    headers: {
      Accept: "application/json",
      "Ocp-Apim-Subscription-Key": process.env.BING_SEARCH_API_KEY
    },
    timeoutMs: 20000
  });

  return (data.webPages?.value || []).slice(0, 5).map(normalizeSearchResult);
}

async function updateSearchResults() {
  const existing = await readJson("search-results.json", {
    query: "\"Trais McAllister\" OR \"tbm0115\"",
    topResults: []
  });
  const query = process.env.SEARCH_QUERY || existing.query;

  try {
    if (process.env.BRAVE_SEARCH_API_KEY) {
      return {
        ...existing,
        lastUpdatedAt: checkedAt,
        status: "ok",
        provider: "Brave Search",
        query,
        topResults: await searchWithBrave(query),
        error: null,
        note: null
      };
    }

    if (process.env.SERPAPI_KEY) {
      return {
        ...existing,
        lastUpdatedAt: checkedAt,
        status: "ok",
        provider: "SerpAPI Google",
        query,
        topResults: await searchWithSerpApi(query),
        error: null,
        note: null
      };
    }

    if (process.env.BING_SEARCH_API_KEY) {
      return {
        ...existing,
        lastUpdatedAt: checkedAt,
        status: "ok",
        provider: "Bing Web Search",
        query,
        topResults: await searchWithBing(query),
        error: null,
        note: null
      };
    }

    return {
      ...existing,
      lastUpdatedAt: checkedAt,
      status: "skipped",
      provider: "none",
      query,
      topResults: existing.topResults || [],
      note: "Set BRAVE_SEARCH_API_KEY, SERPAPI_KEY, or BING_SEARCH_API_KEY in repository secrets to refresh search results."
    };
  } catch (error) {
    return {
      ...existing,
      lastUpdatedAt: checkedAt,
      status: "error",
      query,
      error: error.message
    };
  }
}

async function validateJsonFiles() {
  for (const fileName of dataFiles) {
    await readJson(fileName, {});
    console.log(`Validated ${fileName}`);
  }
}

async function main() {
  if (offline) {
    await validateJsonFiles();
    console.log("Offline validation complete.");
    return;
  }

  await writeJson("domains.json", await updateDomains());
  await writeJson("social-media.json", await updateSocialMedia());
  await writeJson("development.json", await updateDevelopment());
  await writeJson("search-results.json", await updateSearchResults());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
