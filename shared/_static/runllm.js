/**
 * RunLLM search/chat widget (official CDN).
 * If chat fails with "Recaptcha validation failed" / error-codes "browser-error":
 *  - Test on the real HTTPS URL (e.g. GitHub Pages), not file:// or an unregistered host.
 *  - Ask RunLLM to allowlist your exact origin for their reCAPTCHA key; ad blockers
 *    must allow www.google.com / www.gstatic.com (reCAPTCHA).
 *  - Try DevTools → Application → Local Storage → remove keys starting with runllm-.
 * REST: https://api.runllm.com
 */
document.addEventListener("DOMContentLoaded", function () {
    if (document.getElementById("runllm-widget-script")) {
        return;
    }
    var s = document.createElement("script");
    s.id = "runllm-widget-script";
    s.type = "module";
    s.src = "https://widget.runllm.com/run-llm-search-widget.es.js";
    s.setAttribute("runllm-assistant-id", "1115");
    s.setAttribute("runllm-server-address", "https://api.runllm.com");
    s.setAttribute("runllm-name", "Tenstorrent");
    s.setAttribute("runllm-theme-color", "#7d00fa");
    s.setAttribute(
        "runllm-brand-logo",
        "https://avatars.githubusercontent.com/u/64161552?s=200&v=4"
    );
    /* Bottom-left + alternate shortcut so Kapa (typically bottom-right / Mod+k) can coexist while testing. */
    s.setAttribute("runllm-position", "BOTTOM_LEFT");
    s.setAttribute("runllm-keyboard-shortcut", "Mod+Shift+l");
    document.head.appendChild(s);
});
