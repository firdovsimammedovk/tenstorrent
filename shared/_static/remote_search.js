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

    const escapedQuery = query.replace(/[<>&"]/g, (char) => {
      const table = { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" };
      return table[char] || char;
    });

    resultsRoot.innerHTML = query
      ? `<p>Searching remotely for <strong>${escapedQuery}</strong>...</p>`
      : "<p>Enter a search term in the sidebar search box.</p>";

    if (!query) {
      return;
    }

    const url = `${apiBase.replace(/\/+$/, "")}/v1/search?q=${encodeURIComponent(query)}&source_id=${encodeURIComponent(sourceId)}`;

    fetch(url, { method: "GET" })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Remote search request failed (${response.status}).`);
        }
        return response.json();
      })
      .then((payload) => {
        const hits = Array.isArray(payload?.hits) ? payload.hits : [];
        const total = payload?.total?.value ?? hits.length;

        if (!hits.length) {
          resultsRoot.innerHTML = `<p>No remote search results for <strong>${escapedQuery}</strong>.</p>`;
          return;
        }

        const list = hits
          .map((hit) => {
            const title = (hit?.title || hit?.url || "Untitled result").replace(/[<>&"]/g, (char) => {
              const table = { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" };
              return table[char] || char;
            });
            const rawUrl = hit?.url || "#";
            const href = normalizeUrl(rawUrl, siteBaseUrl).replace(/"/g, "&quot;");
            const source = hit?.source ? ` <small>(${hit.source})</small>` : "";
            return `<li><a href="${href}">${title}</a>${source}</li>`;
          })
          .join("");

        resultsRoot.innerHTML = `<p>Found <strong>${total}</strong> result(s).</p><ul>${list}</ul>`;
      })
      .catch((error) => {
        resultsRoot.innerHTML = `<p>Remote search is unavailable right now. ${error.message}</p>`;
      });
  }

  document.addEventListener("DOMContentLoaded", renderRemoteSearch);
})();
