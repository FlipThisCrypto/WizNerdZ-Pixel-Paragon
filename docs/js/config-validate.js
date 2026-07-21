(function () {
  const cfg = window.WIZNERDZ_CONFIG;
  if (!cfg) return;
  const problems = [];
  if (!cfg.treasuryWallet || !/^xch1[a-z0-9]+$/i.test(cfg.treasuryWallet)) {
    problems.push("treasuryWallet");
  }
  if (!cfg.walletConnect || !/^[a-f0-9]{32}$/i.test(cfg.walletConnect.projectId || "")) {
    problems.push("walletConnect.projectId");
  }
  if (!cfg.nomination || !cfg.nomination.deadlineUtc) problems.push("nomination.deadlineUtc");
  if (cfg.mint && cfg.mint.enabled && !cfg.mint.mintgardenUrl && !cfg.mint.offerUrl) {
    problems.push("mint.enabled without offer URL");
  }
  window.WIZNERDZ_CONFIG_OK = problems.length === 0;
  if (problems.length) {
    console.warn("[WizNerdZ] config validation issues:", problems);
    if (window.WIZNERDZ_TELEMETRY) {
      WIZNERDZ_TELEMETRY.track("config_invalid", { problems: problems });
    }
  }
})();
