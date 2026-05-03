/**
 * Loads exactly one docs assistant widget based on URL query:
 *   ?docs_ai=kapa   — Kapa only (no RunLLM scripts)
 *   ?docs_ai=runllm — RunLLM only (no Kapa scripts)
 * Omit or use another value → neither widget loads.
 *
 * Aliases for the same parameter name: tt_ai (same values).
 */
(function () {
    var params = new URLSearchParams(window.location.search);
    var raw = (
        params.get("docs_ai") ||
        params.get("tt_ai") ||
        ""
    )
        .trim()
        .toLowerCase();
    var mode = raw === "kapa" || raw === "runllm" ? raw : "";

    var cfg = window.TT_DOCS_AI_WIDGET || {};
    var base = (cfg.staticBase || "_static/").replace(/\/?$/, "/");

    function loadCss(name) {
        var link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = base + name;
        document.head.appendChild(link);
    }

    /* async=false so order is preserved; kapa/runllm use readyState so they run if injected after DOMContentLoaded */
    function loadScript(name) {
        var s = document.createElement("script");
        s.src = base + name;
        s.async = false;
        document.head.appendChild(s);
    }

    if (mode === "kapa") {
        loadCss("kapa.css");
        loadScript("kapa.js");
        return;
    }

    if (mode === "runllm") {
        var pairs = [
            ["https://www.google.com", false],
            ["https://www.gstatic.com", true],
        ];
        for (var i = 0; i < pairs.length; i++) {
            var p = document.createElement("link");
            p.rel = "preconnect";
            p.href = pairs[i][0];
            if (pairs[i][1]) {
                p.crossOrigin = "";
            }
            document.head.appendChild(p);
        }
        loadScript("runllm.js");
        return;
    }
})();
