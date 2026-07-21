/**
 * Simple client-side rate limit (abuse reduction, local only).
 */
window.WIZNERDZ_RATE = {
  allow: function (key, max, windowMs) {
    key = "wiznerdz_rl_" + key;
    max = max || 5;
    windowMs = windowMs || 600000;
    try {
      var now = Date.now();
      var arr = JSON.parse(localStorage.getItem(key) || "[]").filter(function (t) {
        return now - t < windowMs;
      });
      if (arr.length >= max) {
        return { ok: false, retryMs: windowMs - (now - arr[0]) };
      }
      arr.push(now);
      localStorage.setItem(key, JSON.stringify(arr));
      return { ok: true, remaining: max - arr.length };
    } catch (e) {
      return { ok: true, remaining: max };
    }
  },
};
