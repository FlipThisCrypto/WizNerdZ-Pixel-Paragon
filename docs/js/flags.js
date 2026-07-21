/**
 * Runtime feature flags — overridable via ?flag_x=0|1 or localStorage wiznerdz_flags
 */
(function () {
  const defaults = {
    board: true,
    wallet: true,
    chaos: false,
    telemetry: true,
    sw: true,
  };
  let stored = {};
  try {
    stored = JSON.parse(localStorage.getItem("wiznerdz_flags") || "{}");
  } catch (e) {}
  const params = new URLSearchParams(location.search);
  const flags = Object.assign({}, defaults, stored);
  Object.keys(defaults).forEach(function (k) {
    const v = params.get("flag_" + k);
    if (v === "0") flags[k] = false;
    if (v === "1") flags[k] = true;
  });
  window.WIZNERDZ_FLAGS = flags;
})();
