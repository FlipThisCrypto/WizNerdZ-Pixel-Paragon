/**
 * Opt-in chaos mode for resilience drills.
 * Enable: localStorage.wiznerdz_chaos = '1' or ?chaos=1
 */
(function () {
  const params = new URLSearchParams(location.search);
  const on =
    params.get("chaos") === "1" ||
    localStorage.getItem("wiznerdz_chaos") === "1";
  if (!on) {
    window.WIZNERDZ_CHAOS = { enabled: false };
    return;
  }
  const mode = params.get("chaosMode") || localStorage.getItem("wiznerdz_chaos_mode") || "board";
  window.WIZNERDZ_CHAOS = {
    enabled: true,
    mode: mode,
    shouldFail: function (channel) {
      if (mode === "all") return true;
      return mode === channel;
    },
  };
  console.warn("[WizNerdZ chaos] enabled mode=" + mode);
  const banner = document.createElement("div");
  banner.setAttribute("role", "status");
  banner.style.cssText =
    "position:fixed;top:0;left:0;right:0;z-index:9999;background:#4a1d1d;color:#ffc9c9;padding:8px;text-align:center;font:12px system-ui";
  banner.textContent =
    "CHAOS MODE ON (" + mode + ") — resilience drill. Disable: localStorage.removeItem('wiznerdz_chaos')";
  document.addEventListener("DOMContentLoaded", function () {
    document.body.prepend(banner);
  });
  // Monkey-patch fetch for selected channels
  const orig = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const url = String(input && input.url ? input.url : input);
    const ch =
      url.indexOf("health.json") >= 0
        ? "health"
        : url.indexOf("metadata/") >= 0
          ? "metadata"
          : "other";
    if (window.WIZNERDZ_CHAOS.shouldFail(ch) || (mode === "all" && ch !== "other")) {
      return Promise.reject(new Error("CHAOS injected failure for " + ch));
    }
    return orig(input, init);
  };
})();
