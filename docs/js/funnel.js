/**
 * Funnel counters (local) for decision intelligence: view → start → submit → export.
 */
(function () {
  const KEY = "wiznerdz_funnel_v1";
  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "{}");
    } catch (e) {
      return {};
    }
  }
  function save(o) {
    try {
      localStorage.setItem(KEY, JSON.stringify(o));
    } catch (e) {}
  }
  function inc(step) {
    const o = load();
    o[step] = (o[step] || 0) + 1;
    o.updated = new Date().toISOString();
    save(o);
    if (window.WIZNERDZ_TELEMETRY) WIZNERDZ_TELEMETRY.track("funnel", { step: step, n: o[step] });
    return o;
  }
  window.WIZNERDZ_FUNNEL = {
    inc: inc,
    snapshot: load,
    render: function (el) {
      if (!el) return;
      const o = load();
      el.textContent =
        "Funnel (this browser): view=" +
        (o.view || 0) +
        " start=" +
        (o.start || 0) +
        " submit=" +
        (o.submit || 0) +
        " board_refresh=" +
        (o.board_refresh || 0);
    },
  };
  if (location.pathname.endsWith("/") || location.pathname.endsWith("index.html") || location.pathname.endsWith("WizNerdZ-Pixel-Paragon/")) {
    inc("view");
  }
  document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("nominate-form");
    if (form) {
      form.addEventListener(
        "focusin",
        function () {
          inc("start");
        },
        { once: true }
      );
      form.addEventListener("submit", function () {
        inc("submit");
      });
    }
    const rf = document.getElementById("noms-board-refresh");
    if (rf) rf.addEventListener("click", function () { inc("board_refresh"); });
    WIZNERDZ_FUNNEL.render(document.getElementById("funnel-stats"));
  });
})();
