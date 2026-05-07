/**
 * InKeep widget bootstrap for Sphinx docs.
 *
 * Config is read from window.TT_DOCS_INKEEP.
 * Expected shape (minimum):
 *   {
 *     apiKey: "PUBLIC_API_KEY",
 *     organizationDisplayName: "Tenstorrent",
 *     primaryBrandColor: "#5164e0",
 *     aiAssistantName: "Tenstorrent Docs",
 *     label: "Ask AI" // optional
 *   }
 */
(function () {
  var cfg = window.TT_DOCS_INKEEP || {};
  var apiKey = (cfg.apiKey || "").trim();
  if (!apiKey) {
    // Avoid throwing on prod if not configured yet.
    return;
  }

  function ensureModuleScript(src) {
    var existing = document.querySelector('script[type="module"][src="' + src + '"]');
    if (existing) return existing;
    var s = document.createElement("script");
    s.type = "module";
    s.src = src;
    s.defer = true;
    document.head.appendChild(s);
    return s;
  }

  // Load Inkeep embed runtime (module).
  var embedSrc = cfg.embedSrc || "https://cdn.jsdelivr.net/npm/@inkeep/cxkit-js@0.5/dist/embed.js";
  var embedScript = ensureModuleScript(embedSrc);

  // Initialize ChatButton after embed is available.
  function init() {
    // Inkeep exposes global `Inkeep` from the embed module.
    // If it's not ready yet, retry a bit.
    if (!window.Inkeep || typeof window.Inkeep.ChatButton !== "function") {
      return false;
    }

    var config = {
      baseSettings: {
        apiKey: apiKey,
        organizationDisplayName: cfg.organizationDisplayName || "Tenstorrent",
        primaryBrandColor: cfg.primaryBrandColor || "#5164e0",
        theme: {
          styles: [
            {
              key: "tt-inkeep-z-index",
              type: "style",
              value:
                ".ikp-chat-button__container{z-index:2147483647 !important;}",
            },
          ],
        },
      },
      aiChatSettings: {
        aiAssistantName: cfg.aiAssistantName || "Docs Assistant",
        exampleQuestions: cfg.exampleQuestions || ["How do I get started?"],
      },
      label: cfg.label || "Ask AI",
      defaultView: cfg.defaultView || "chat",
      canToggleView: cfg.canToggleView !== false,
    };

    try {
      window.__ttInkeepChatButton = window.Inkeep.ChatButton(config);
    } catch (_e) {
      // no-op
    }
    return true;
  }

  function retry(maxMs) {
    var start = Date.now();
    (function tick() {
      if (init()) return;
      if (Date.now() - start > maxMs) return;
      setTimeout(tick, 50);
    })();
  }

  // Best-effort init: after DOM is ready and module has had a chance to load.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      retry(3000);
    });
  } else {
    retry(3000);
  }

  // If the embed script loads late, retry again.
  embedScript.addEventListener("load", function () {
    retry(3000);
  });
})();

