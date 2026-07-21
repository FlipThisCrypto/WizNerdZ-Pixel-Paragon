/**
 * Privacy-preserving local telemetry — no network, no PII by default.
 * Ops can export ring buffer for incident diagnosis.
 */
(function () {
  const KEY = "wiznerdz_telemetry_v1";
  const MAX = 100;

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch {
      return [];
    }
  }

  function save(arr) {
    try {
      localStorage.setItem(KEY, JSON.stringify(arr.slice(-MAX)));
    } catch (_) {}
  }

  function track(event, detail) {
    const row = {
      t: new Date().toISOString(),
      e: String(event || "event"),
      d: detail && typeof detail === "object" ? detail : {},
    };
    // strip obvious wallet full addresses if present
    if (row.d.address && String(row.d.address).length > 12) {
      row.d.address =
        String(row.d.address).slice(0, 6) + "…" + String(row.d.address).slice(-4);
    }
    const arr = load();
    arr.push(row);
    save(arr);
    try {
      window.dispatchEvent(new CustomEvent("wiznerdz:telemetry", { detail: row }));
    } catch (_) {}
  }

  window.WIZNERDZ_TELEMETRY = {
    storageEstimate: async function () {
      try {
        if (navigator.storage && navigator.storage.estimate) {
          const e = await navigator.storage.estimate();
          return { usage: e.usage || 0, quota: e.quota || 0 };
        }
      } catch (e) {}
      return null;
    },

    track: track,
    dump: function () {
      return load();
    },
    clear: function () {
      localStorage.removeItem(KEY);
    },
    exportJson: function () {
      const blob = new Blob([JSON.stringify(load(), null, 2)], {
        type: "application/json",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "wiznerdz-telemetry.json";
      a.click();
      URL.revokeObjectURL(a.href);
    },
  };

  track("page_view", { path: location.pathname + location.hash });
  window.addEventListener("wiznerdz:wallet", (ev) => {
    track("wallet_event", { hasAddress: !!(ev.detail && ev.detail.address) });
  });
  window.addEventListener("wiznerdz:deadline", (ev) => {
    track("deadline", { open: !!(ev.detail && ev.detail.open) });
  });
})();
