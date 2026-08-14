/**
 * WizNerdZ sealed-box client (public data only).
 * Loads mint/sealed_boxes.json + mint/commitment.json — never private contents.
 */
(function () {
  const STATE = {
    boxes: [],
    commitment: null,
    filterTier: "all",
    loaded: false,
    error: null,
    // Live counters from /api/mint-stats — the catalog is a static file and
    // can never know a box sold. null until (and unless) the API answers;
    // the page must still work without it.
    stats: null,
  };

  const API = (window.WIZNERDZ_CONFIG && window.WIZNERDZ_CONFIG.mint && window.WIZNERDZ_CONFIG.mint.apiBase) || null;

  async function loadStats() {
    if (!API) return;
    try {
      const res = await fetch(`${API}/mint-stats`, { headers: { accept: "application/json" } });
      if (!res.ok) return;
      STATE.stats = await res.json();
      render();
    } catch (_) {
      /* counter is best-effort; the page stays honest without it */
    }
  }

  function $(sel) {
    return document.querySelector(sel);
  }

  async function loadSealed() {
    const base = document.body.dataset.mintBase || "mint";
    try {
      const [boxesRes, commitRes] = await Promise.all([
        fetch(`${base}/sealed_boxes.json`, { cache: "no-store" }),
        fetch(`${base}/commitment.json`, { cache: "no-store" }),
      ]);
      if (!boxesRes.ok) throw new Error("sealed_boxes.json " + boxesRes.status);
      if (!commitRes.ok) throw new Error("commitment.json " + commitRes.status);
      const sealed = await boxesRes.json();
      const commit = await commitRes.json();
      // Hard client guard: refuse data that leaks contents
      const blob = JSON.stringify(sealed);
      if (blob.includes('"contents":')) {
        throw new Error("Refusing sealed feed: contents field present (leak)");
      }
      STATE.boxes = sealed.boxes || [];
      STATE.commitment = commit.commitment_sha256 || sealed.commitment_sha256;
      STATE.loaded = true;
      STATE.error = null;
      render();
    } catch (e) {
      STATE.error = String(e.message || e);
      STATE.loaded = false;
      render();
    }
  }

  function tierLabel(t) {
    const map = {
      premium_named: "Named Premium",
      elite: "Elite",
      rare: "Rare",
      standard_bundle: "Standard Bundle",
      blind_single: "Blind Single",
    };
    return map[t] || t;
  }

  function filtered() {
    if (STATE.filterTier === "all") return STATE.boxes;
    return STATE.boxes.filter((b) => b.tier_id === STATE.filterTier);
  }

  function summarize() {
    const counts = {};
    for (const b of STATE.boxes) {
      counts[b.tier_id] = (counts[b.tier_id] || 0) + 1;
    }
    return counts;
  }

  function render() {
    const root = $("#sealed-root");
    if (!root) return;
    if (STATE.error) {
      root.innerHTML = `<p class="err">Failed to load sealed boxes: ${escapeHtml(STATE.error)}</p>`;
      return;
    }
    if (!STATE.loaded) {
      root.innerHTML = `<p>Loading sealed boxes…</p>`;
      return;
    }
    const counts = summarize();
    const list = filtered().slice(0, 48);
    // Live numbers: catalog total minus chain-observed sales. Falls back to
    // catalog-only counts when the stats API is unreachable.
    const total = STATE.boxes.length;
    const sold = STATE.stats?.totals?.sold ?? 0;
    const opened = STATE.stats?.totals?.opened ?? 0;
    const avail = Math.max(0, total - sold);
    const live = STATE.stats
      ? ` · Sold: <strong>${sold}</strong> · Opened: <strong>${opened}</strong>`
      : ` <span class="muted">(live counts unavailable)</span>`;
    root.innerHTML = `
      <div class="sealed-meta">
        <p><strong>Allocation commitment:</strong> <code>${escapeHtml(STATE.commitment || "")}</code></p>
        <p>Sealed boxes: <strong>${total}</strong> · Available: <strong>${avail}</strong>${live}</p>
        <p class="muted">Contents are hidden until purchase + open. Opening uses the pre-committed allocation — no re-draw.</p>
        <div class="tier-counts">${Object.entries(counts)
          .map(([k, v]) => `<span class="chip">${escapeHtml(tierLabel(k))}: ${v}</span>`)
          .join(" ")}</div>
        <label>Filter
          <select id="tier-filter">
            <option value="all">All tiers</option>
            ${Object.keys(counts)
              .map(
                (k) =>
                  `<option value="${escapeHtml(k)}" ${STATE.filterTier === k ? "selected" : ""}>${escapeHtml(tierLabel(k))}</option>`
              )
              .join("")}
          </select>
        </label>
      </div>
      <div class="sealed-grid">
        ${list
          .map(
            (b) => `
          <article class="sealed-card" data-box="${escapeHtml(b.box_id)}">
            <div class="seal">🔒 SEALED</div>
            <h3>${escapeHtml(b.box_id)}</h3>
            <p class="tier">${escapeHtml(tierLabel(b.tier_id))}</p>
            <p>${escapeHtml(b.guarantee || "")}</p>
            <p><strong>${Number(b.price_xch)} XCH</strong> · ${b.nft_count} NFT(s)</p>
            <p class="status">${escapeHtml(b.mint_status)}</p>
            <a class="buy-btn" href="mint.html">Buy on the mint page</a>
          </article>`
          )
          .join("")}
      </div>
      <p class="muted">Showing ${list.length} of ${filtered().length}. Buying happens on the mint page — approve one offer in any Chia wallet. The WizNerdZ inside are delivered automatically after the sale settles on chain.</p>
    `;
    const sel = $("#tier-filter");
    if (sel) {
      sel.addEventListener("change", () => {
        STATE.filterTier = sel.value;
        render();
      });
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  window.WizNerdzSealedBoxes = { loadSealed, STATE };
  function boot() {
    loadSealed();
    loadStats();
    // counters track the chain, not the browser — refresh keeps them honest
    setInterval(loadStats, 30000);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
