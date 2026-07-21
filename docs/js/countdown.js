/**
 * EST/Eastern countdown to nomination deadline.
 * Uses America/New_York so DST is correct (EDT in July).
 */
(function () {
  const cfg = window.WIZNERDZ_CONFIG;
  if (!cfg) return;

  const el = {
    banner: document.getElementById("countdown-banner"),
    days: document.getElementById("cd-days"),
    hours: document.getElementById("cd-hours"),
    mins: document.getElementById("cd-mins"),
    secs: document.getElementById("cd-secs"),
    status: document.getElementById("cd-status"),
    stamp: document.getElementById("cd-stamp"),
  };

  /**
   * End of July 31, 2026 US Eastern = 2026-08-01 00:00 America/New_York.
   * In July Eastern is on EDT (UTC−4) → fixed UTC instant below.
   * [CONFIRMED] EDT offset for this calendar date.
   */
  const end = Date.parse(
    cfg.nomination.deadlineUtc || "2026-08-01T04:00:00.000Z"
  );

  function pad(n) {
    return String(Math.max(0, n)).padStart(2, "0");
  }

  function tick() {
    const now = Date.now();
    let diff = end - now;
    if (diff <= 0) {
      if (el.days) el.days.textContent = "00";
      if (el.hours) el.hours.textContent = "00";
      if (el.mins) el.mins.textContent = "00";
      if (el.secs) el.secs.textContent = "00";
      if (el.status) {
        el.status.textContent =
          "Nomination window closed — community PFP list is locked.";
        el.status.classList.add("closed");
      }
      if (el.banner) el.banner.classList.add("closed");
      try {
        window.dispatchEvent(new CustomEvent("wiznerdz:deadline", { detail: { open: false } }));
      } catch (_) {}
      return;
    }
    const sec = Math.floor(diff / 1000);
    const days = Math.floor(sec / 86400);
    const hours = Math.floor((sec % 86400) / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    if (el.days) el.days.textContent = pad(days);
    if (el.hours) el.hours.textContent = pad(hours);
    if (el.mins) el.mins.textContent = pad(mins);
    if (el.secs) el.secs.textContent = pad(secs);

    // Live Eastern clock stamp for clarity
    if (el.stamp) {
      el.stamp.textContent =
        "Now (Eastern): " +
        new Intl.DateTimeFormat("en-US", {
          timeZone: cfg.nomination.timezone,
          dateStyle: "medium",
          timeStyle: "medium",
          hour12: true,
        }).format(now) +
        " · Deadline: " +
        cfg.nomination.label;
    }
  }

  tick();
  setInterval(tick, 1000);
})();
