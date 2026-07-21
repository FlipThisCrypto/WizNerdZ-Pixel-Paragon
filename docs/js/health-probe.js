/**
 * Client health probe — samples critical static assets and surfaces ops status.
 */
(function () {
  const el = document.getElementById("ops-health");
  if (!el) return;

  const checks = [
    { name: "health.json", url: "health.json" },
    { name: "collection.json", url: "collection.json" },
    { name: "specials.json", url: "specials.json" },
    { name: "metadata #1", url: "metadata/1.json" },
    { name: "image #1", url: "images/1.png", binary: true },
    { name: "config", url: "js/config.js" },
    { name: "special_placements", url: "special_placements.json" },
    { name: "rarity.csv", url: "rarity.csv" },
  ];

  async function probe() {
    const results = [];
    let ok = 0;
    for (const c of checks) {
      const t0 = performance.now();
      try {
        const res = await fetch(c.url, { cache: "no-store", method: "GET" });
        const ms = Math.round(performance.now() - t0);
        if (!res.ok) throw new Error("HTTP " + res.status);
        if (!c.binary) {
          const text = await res.text();
          if (!text || text.length < 2) throw new Error("empty body");
          if (c.url.endsWith(".json")) JSON.parse(text);
        }
        results.push({ name: c.name, ok: true, ms });
        ok++;
      } catch (e) {
        results.push({
          name: c.name,
          ok: false,
          ms: Math.round(performance.now() - t0),
          err: String(e.message || e),
        });
      }
    }
    const mint =
      window.WIZNERDZ_CONFIG && window.WIZNERDZ_CONFIG.mint
        ? window.WIZNERDZ_CONFIG.mint.enabled
        : false;
    el.innerHTML =
      '<p class="' +
      (ok === checks.length ? "ok" : "warn") +
      '">' +
      ok +
      "/" +
      checks.length +
      " critical assets OK · mint " +
      (mint ? "ARMED" : "disarmed") +
      "</p><ul class='muted' style='margin:8px 0 0;padding-left:18px;font-size:0.8rem'>" +
      results
        .map(
          (r) =>
            "<li>" +
            r.name +
            ": " +
            (r.ok ? "ok " + r.ms + "ms" : "FAIL " + (r.err || "")) +
            "</li>"
        )
        .join("") +
      "</ul>";
  }

  probe();
})();
