/**
 * Live PFP nominations board — loads public GitHub Issues into the product UI.
 * No secrets. Rate-limit aware. Graceful degradation when API unavailable.
 */
(function () {
  const cfg = window.WIZNERDZ_CONFIG;
  const root = document.getElementById("noms-board");
  if (!root || !cfg) return;

  const REPO = "FlipThisCrypto/WizNerdZ-Pixel-Paragon";
  const CACHE_KEY = "wiznerdz_noms_board_v1";
  const CACHE_TTL_MS = 5 * 60 * 1000;
  const statusEl = document.getElementById("noms-board-status");
  const listEl = document.getElementById("noms-board-list");
  const refreshBtn = document.getElementById("noms-board-refresh");

  function setStatus(msg, cls) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = "muted" + (cls ? " " + cls : "");
  }

  if (window.WIZNERDZ_FLAGS && window.WIZNERDZ_FLAGS.board === false) {
    setStatus("Nominations board disabled by feature flag.", "warn");
    return;
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function parseIssue(issue) {
    const body = issue.body || "";
    const grab = (label) => {
      const re = new RegExp("\\*\\*" + label + ":\\*\\*\\s*(.+)", "i");
      const m = body.match(re);
      return m ? m[1].trim() : "";
    };
    return {
      number: issue.number,
      title: issue.title || "",
      url: issue.html_url,
      user: (issue.user && issue.user.login) || "unknown",
      created: issue.created_at,
      updated: issue.updated_at,
      state: issue.state,
      nominee: grab("Nominee") || issue.title.replace(/^\[PFP Nomination\]\s*/i, ""),
      platform: grab("Platform"),
      nominator: grab("Nominator"),
      wallet: grab("Wallet \\(optional\\)") || grab("Wallet"),
    };
  }

  function render(items, meta) {
    if (!listEl) return;
    if (!items.length) {
      listEl.innerHTML =
        "<p class='muted'>No open <code>[PFP Nomination]</code> issues yet. Be the first via the form above.</p>";
      return;
    }
    listEl.innerHTML = items
      .map((n) => {
        const when = n.created
          ? new Date(n.created).toLocaleString("en-US", {
              timeZone: "America/New_York",
              dateStyle: "medium",
              timeStyle: "short",
            }) + " ET"
          : "";
        return (
          '<article class="nom-card nom-live">' +
          '<div class="nom-live-head"><strong>#' +
          n.number +
          "</strong> · " +
          '<a href="' +
          escapeHtml(n.url) +
          '" target="_blank" rel="noopener">' +
          escapeHtml(n.title) +
          "</a></div>" +
          '<div class="muted">Nominee: <strong style="color:var(--green)">' +
          escapeHtml(n.nominee || "—") +
          "</strong>" +
          (n.platform ? " · " + escapeHtml(n.platform) : "") +
          (n.nominator ? " · by " + escapeHtml(n.nominator) : "") +
          "</div>" +
          '<div class="muted">' +
          escapeHtml(when) +
          " · opened by @" +
          escapeHtml(n.user) +
          (n.wallet && n.wallet.indexOf("not provided") === -1
            ? " · " + escapeHtml(n.wallet.slice(0, 18)) + "…"
            : "") +
          "</div></article>"
        );
      })
      .join("");
    if (meta && meta.fromCache) {
      setStatus(
        "Showing " +
          items.length +
          " open nomination(s) from cache (refreshed " +
          meta.age +
          ").",
        "warn"
      );
    } else {
      setStatus(
        "Showing " + items.length + " open nomination issue(s) from GitHub.",
        "ok"
      );
      const bc = document.getElementById("noms-board-count");
      if (bc) { bc.textContent = String(items.length); bc.hidden = false; }
    }
  }

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const o = JSON.parse(raw);
      if (!o || !Array.isArray(o.items) || !o.ts) return null;
      return o;
    } catch {
      return null;
    }
  }

  function writeCache(items) {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ ts: Date.now(), items: items })
      );
    } catch (_) {}
  }

  function nominationsWindowOpen() {
    try {
      const end = Date.parse((cfg.nomination && cfg.nomination.deadlineUtc) || "2026-08-01T04:00:00.000Z");
      return Date.now() < end;
    } catch (e) { return true; }
  }

  async function fetchIssues(force) {
    if (!nominationsWindowOpen()) {
      setStatus("Nomination window closed — historical open issues may still appear below.", "warn");
    }

    setStatus("Loading nominations from GitHub…");
    const cached = readCache();
    if (!force && cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      const ageMin = Math.round((Date.now() - cached.ts) / 60000);
      render(cached.items, {
        fromCache: true,
        age: ageMin <= 1 ? "just now" : ageMin + "m ago",
      });
      return;
    }

    const q = encodeURIComponent(
      "repo:" + REPO + " is:issue is:open in:title [PFP Nomination]"
    );
    const url =
      "https://api.github.com/search/issues?q=" + q + "&sort=created&order=desc&per_page=50";

    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
      if (res.status === 403 || res.status === 429) {
        if (cached) {
          render(cached.items, { fromCache: true, age: "rate-limited" });
          setStatus(
            "GitHub rate limit hit — showing cached nominations. Try again later.",
            "warn"
          );
          return;
        }
        throw new Error("GitHub API rate limited (HTTP " + res.status + ")");
      }
      if (!res.ok) throw new Error("GitHub API HTTP " + res.status);
      const data = await res.json();
      const items = (data.items || []).map(parseIssue);
      writeCache(items);
      render(items, { fromCache: false });
    } catch (err) {
      if (cached) {
        render(cached.items, { fromCache: true, age: "offline/error" });
        setStatus(
          "Live fetch failed (" +
            (err.message || err) +
            "). Showing last cached list.",
          "warn"
        );
      } else {
        setStatus(
          "Could not load nominations: " +
            (err.message || err) +
            ". Open GitHub issues manually.",
          "err"
        );
        if (listEl) {
          listEl.innerHTML =
            '<p class="muted"><a class="btn" href="https://github.com/' +
            REPO +
            '/issues?q=is%3Aissue+PFP+Nomination" target="_blank" rel="noopener">View issues on GitHub</a></p>';
        }
      }
    }
  }

  function exportBoardCsv() {
    const cached = readCache();
    const items = (cached && cached.items) || [];
    if (!items.length) {
      setStatus("No board data to export — refresh first.", "warn");
      return;
    }
    const headers = [
      "number",
      "title",
      "nominee",
      "platform",
      "nominator",
      "wallet",
      "user",
      "created",
      "url",
    ];
    const lines = [headers.join(",")];
    items.forEach((n) => {
      lines.push(
        headers
          .map((h) => '"' + String(n[h] == null ? "" : n[h]).replace(/"/g, '""') + '"')
          .join(",")
      );
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "wiznerdz-live-nominations.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    setStatus("Exported " + items.length + " live nomination row(s).", "ok");
    if (window.WIZNERDZ_TELEMETRY)
      WIZNERDZ_TELEMETRY.track("export_live_noms", { n: items.length });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => fetchIssues(true));
  }
  const exportLive = document.getElementById("noms-board-export");
  if (exportLive) exportLive.addEventListener("click", exportBoardCsv);

  // Load after a tick so first paint isn't blocked
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => fetchIssues(false));
  } else {
    fetchIssues(false);
  }
})();
