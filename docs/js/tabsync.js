(function () {
  if (!("BroadcastChannel" in window)) return;
  const bc = new BroadcastChannel("wiznerdz");
  window.WIZNERDZ_TAB = {
    post: function (type, detail) {
      try {
        bc.postMessage({ type: type, detail: detail || {}, t: Date.now() });
      } catch (e) {}
    },
  };
  bc.onmessage = function (ev) {
    const msg = ev.data || {};
    if (msg.type === "wallet" && window.WIZNERDZ_TELEMETRY) {
      WIZNERDZ_TELEMETRY.track("tab_wallet_sync", {
        has: !!(msg.detail && msg.detail.address),
      });
    }
  };
  window.addEventListener("wiznerdz:wallet", function (ev) {
    window.WIZNERDZ_TAB.post("wallet", {
      address: (ev.detail && ev.detail.address) || "",
    });
  });
})();
