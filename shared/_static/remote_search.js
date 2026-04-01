(() => {
  const DEFAULT_CONFIG = {
    apiBase: "https://csl860x2oj.execute-api.us-east-2.amazonaws.com/prod",
    sourceId: "docs-tenstorrent",
    siteBaseUrl: "https://firdovsimammedovk.github.io/tenstorrent/",
  };

  function getConfig() {
    const runtimeConfig = window.TT_DOCS_REMOTE_SEARCH || {};
    return {
      apiBase: runtimeConfig.apiBase || DEFAULT_CONFIG.apiBase,
      sourceId: runtimeConfig.sourceId || DEFAULT_CONFIG.sourceId,
      siteBaseUrl: runtimeConfig.siteBaseUrl || DEFAULT_CONFIG.siteBaseUrl,
    };
  }

  function normalizeUrl(rawUrl, siteBaseUrl) {
    if (!rawUrl) {
      return "#";
    }

    const siteBase = new URL(siteBaseUrl);
    const rootPath = siteBase.pathname.replace(/\/+$/, "");
    const rootPathPrefix = rootPath ? `${rootPath}/` : "/";

    try {
      const input = new URL(rawUrl, siteBaseUrl);

      if (input.hostname === "docs.tenstorrent.com") {
        return `${siteBase.origin}${rootPath}${input.pathname}${input.search}${input.hash}`;
      }

      if (input.hostname === siteBase.hostname && !input.pathname.startsWith(rootPathPrefix)) {
        return `${siteBase.origin}${rootPath}${input.pathname}${input.search}${input.hash}`;
      }

      return input.toString();
    } catch (_error) {
      return rawUrl;
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[<>&"]/g, (char) => {
      const table = { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" };
      return table[char] || char;
    });
  }

  function cleanTitle(title) {
    const raw = (title || "").trim();
    if (!raw) {
      return "";
    }
    return raw.replace(/\s+[—-]\s+.*documentation$/i, "").trim() || raw;
  }

  function getRelativePathLabel(url, siteBaseUrl) {
    try {
      const normalized = new URL(url, siteBaseUrl);
      const siteBase = new URL(siteBaseUrl);
      let path = normalized.pathname;
      const basePath = siteBase.pathname.replace(/\/+$/, "");
      if (basePath && path.startsWith(basePath)) {
        path = path.slice(basePath.length);
      }
      path = path.replace(/^\/+/, "");
      if (!path) {
        return "Home";
      }
      return decodeURIComponent(path);
    } catch (_error) {
      return "";
    }
  }

  function getSearchResultsUrl(query, apiBase, sourceId, size) {
    const limit = Number.isFinite(size) ? `&size=${size}` : "";
    return `${apiBase.replace(/\/+$/, "")}/v1/search?q=${encodeURIComponent(query)}&source=${encodeURIComponent(sourceId)}${limit}`;
  }

  function fetchSearchHits(query, apiBase, sourceId, size) {
    const url = getSearchResultsUrl(query, apiBase, sourceId, size);
    return fetch(url, { method: "GET" }).then((response) => {
      if (!response.ok) {
        throw new Error(`Remote search request failed (${response.status}).`);
      }
      return response.json();
    });
  }

  function getHitDisplay(hit, siteBaseUrl) {
    const rawUrl = hit?.url || "#";
    const normalizedUrl = normalizeUrl(rawUrl, siteBaseUrl);
    const href = normalizedUrl.replace(/"/g, "&quot;");
    const preferredTitle = cleanTitle(hit?.title);
    const fallbackTitle = getRelativePathLabel(normalizedUrl, siteBaseUrl) || "Untitled result";
    const title = escapeHtml(preferredTitle || fallbackTitle);
    const pathLabel = escapeHtml(getRelativePathLabel(normalizedUrl, siteBaseUrl));
    const source = hit?.source ? `<span class="remote-search-source">${escapeHtml(hit.source)}</span>` : "";
    return { href, title, pathLabel, source };
  }

  function getViewAllUrl(siteBaseUrl, query) {
    return `${siteBaseUrl.replace(/\/+$/, "")}/search.html?q=${encodeURIComponent(query)}`;
  }

  function renderRemoteSearch() {
    if (!window.location.pathname.endsWith("/search.html")) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const query = (params.get("q") || "").trim();
    const { apiBase, sourceId, siteBaseUrl } = getConfig();

    const resultsRoot = document.querySelector("#search-results");
    if (!resultsRoot) {
      return;
    }

    const escapedQuery = escapeHtml(query);

    resultsRoot.innerHTML = query
      ? `<p>Searching remotely for <strong>${escapedQuery}</strong>...</p>`
      : "<p>Enter a search term in the sidebar search box.</p>";

    if (!query) {
      return;
    }

    fetchSearchHits(query, apiBase, sourceId)
      .then((payload) => {
        const hits = Array.isArray(payload?.hits) ? payload.hits : [];
        const total = payload?.total?.value ?? hits.length;

        if (!hits.length) {
          resultsRoot.innerHTML = `<p>No remote search results for <strong>${escapedQuery}</strong>.</p>`;
          return;
        }

        const list = hits
          .map((hit) => {
            const { href, title, pathLabel, source } = getHitDisplay(hit, siteBaseUrl);
            return `<li><a href="${href}">${title}</a><div class="context">${pathLabel}${source}</div></li>`;
          })
          .join("");

        resultsRoot.innerHTML = `
          <p class="search-summary">Found <strong>${total}</strong> result(s) for <strong>${escapedQuery}</strong>.</p>
          <ul class="search remote-search-results">
            ${list}
          </ul>
        `;
      })
      .catch((error) => {
        resultsRoot.innerHTML = `<p>Remote search is unavailable right now. ${error.message}</p>`;
      });
  }

  function initLiveSearch() {
    const form = document.querySelector("#rtd-search-form");
    const input = form?.querySelector('input[name="q"]');
    const { apiBase, sourceId, siteBaseUrl } = getConfig();
    if (!form || !input) {
      return;
    }

    const panel = document.createElement("div");
    panel.className = "remote-search-live-panel";
    panel.hidden = true;
    form.appendChild(panel);

    let currentToken = 0;
    let debounceTimer = null;

    function hidePanel() {
      panel.hidden = true;
      panel.innerHTML = "";
    }

    function renderPanelLoading(query) {
      const safeQuery = escapeHtml(query);
      panel.innerHTML = `<div class="remote-search-live-status">Searching for <strong>${safeQuery}</strong>...</div>`;
      panel.hidden = false;
    }

    function renderPanelResults(query, hits, total) {
      const safeQuery = escapeHtml(query);
      const items = hits
        .map((hit) => {
          const { href, title, pathLabel } = getHitDisplay(hit, siteBaseUrl);
          return `<li><a href="${href}">${title}</a><div class="context">${pathLabel}</div></li>`;
        })
        .join("");
      const viewAllUrl = getViewAllUrl(siteBaseUrl, query).replace(/"/g, "&quot;");
      panel.innerHTML = `
        <div class="remote-search-live-status">Top ${hits.length} result(s) for <strong>${safeQuery}</strong></div>
        <ul class="remote-search-live-results">${items || "<li class=\"remote-search-live-empty\">No matches found.</li>"}</ul>
        <a class="remote-search-live-view-all" href="${viewAllUrl}">View All (${total})</a>
      `;
      panel.hidden = false;
    }

    function renderPanelError(query, message) {
      const safeQuery = escapeHtml(query);
      const viewAllUrl = getViewAllUrl(siteBaseUrl, query).replace(/"/g, "&quot;");
      panel.innerHTML = `
        <div class="remote-search-live-status">Could not load live results for <strong>${safeQuery}</strong>.</div>
        <div class="remote-search-live-error">${escapeHtml(message)}</div>
        <a class="remote-search-live-view-all" href="${viewAllUrl}">View All</a>
      `;
      panel.hidden = false;
    }

    function runSearch() {
      const query = input.value.trim();
      if (query.length < 2) {
        hidePanel();
        return;
      }

      currentToken += 1;
      const token = currentToken;
      renderPanelLoading(query);
      fetchSearchHits(query, apiBase, sourceId, 3)
        .then((payload) => {
          if (token !== currentToken) {
            return;
          }
          const hits = Array.isArray(payload?.hits) ? payload.hits.slice(0, 3) : [];
          const total = payload?.total?.value ?? hits.length;
          renderPanelResults(query, hits, total);
        })
        .catch((error) => {
          if (token !== currentToken) {
            return;
          }
          renderPanelError(query, error.message);
        });
    }

    function scheduleSearch() {
      if (debounceTimer) {
        window.clearTimeout(debounceTimer);
      }
      debounceTimer = window.setTimeout(runSearch, 220);
    }

    input.addEventListener("input", scheduleSearch);
    input.addEventListener("focus", scheduleSearch);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        hidePanel();
      }
    });

    document.addEventListener("click", (event) => {
      if (!form.contains(event.target)) {
        hidePanel();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderRemoteSearch();
    initLiveSearch();
  });
})();
