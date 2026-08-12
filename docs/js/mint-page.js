/**
 * Mint page controller.
 *
 * Renders real tier data from the published sealed catalog. The SUMMON buttons
 * stay disabled while no mint backend exists — we do not fake a purchase path.
 * The reveal system is wired and ready; it will be handed a verified result the
 * moment MintBridge has a backend to talk to.
 */
(function () {
  const TIER_ORDER = ["premium_named", "elite", "rare", "standard_bundle", "blind_single"];
  const LABELS = {
    premium_named: "Named Premium",
    elite: "Elite",
    rare: "Rare",
    standard_bundle: "Standard Bundle",
    blind_single: "Blind Single",
  };

  const bridge = new window.WizNerdzMintBridge({ endpoint: null });

  async function load() {
    const base = document.body.dataset.mintBase || "mint";
    const root = document.getElementById("tiers");
    try {
      const [boxesRes, commitRes] = await Promise.all([
        fetch(`${base}/sealed_boxes.json`, { cache: "no-store" }),
        fetch(`${base}/commitment.json`, { cache: "no-store" }),
      ]);
      if (!boxesRes.ok) throw new Error("sealed_boxes.json " + boxesRes.status);
      const sealed = await boxesRes.json();

      // Same hard guard the sealed-boxes page uses: refuse a leaking feed.
      if (JSON.stringify(sealed).includes('"contents":')) {
        throw new Error("Refusing sealed feed: contents present");
      }

      if (commitRes.ok) {
        const c = await commitRes.json();
        const el = document.getElementById("commitment");
        if (el) el.textContent = c.commitment_sha256 || "—";
      }

      render(root, summarise(sealed.boxes || []));
    } catch (e) {
      root.innerHTML = `<p class="muted">Could not load the sealed catalog: ${escapeHtml(String(e.message || e))}</p>`;
    }
  }

  function summarise(boxes) {
    const byTier = new Map();
    for (const b of boxes) {
      if (!byTier.has(b.tier_id)) {
        byTier.set(b.tier_id, {
          tier_id: b.tier_id,
          price_xch: b.price_xch,
          nft_count: b.nft_count,
          guarantee: b.guarantee,
          total: 0,
          available: 0,
        });
      }
      const t = byTier.get(b.tier_id);
      t.total++;
      if (b.mint_status === "available") t.available++;
    }
    return TIER_ORDER.filter((t) => byTier.has(t)).map((t) => byTier.get(t));
  }

  function render(root, tiers) {
    if (!tiers.length) {
      root.innerHTML = `<p class="muted">No sealed boxes published yet.</p>`;
      return;
    }
    root.innerHTML = tiers
      .map(
        (t) => `
      <article class="tier-card">
        <h3>${escapeHtml(LABELS[t.tier_id] || t.tier_id)}</h3>
        <p class="price">${Number(t.price_xch)} XCH</p>
        <p class="guar">${escapeHtml(t.guarantee || "")}</p>
        <p class="muted" style="font-size:.78rem">${t.nft_count} NFT${t.nft_count === 1 ? "" : "s"} · ${t.available} of ${t.total} available</p>
        <button type="button" class="summon-btn" data-tier="${escapeHtml(t.tier_id)}" disabled>
          SUMMON
        </button>
      </article>`
      )
      .join("");

    root.querySelectorAll(".summon-btn").forEach((btn) => {
      btn.title = bridge.hasBackend
        ? "Summon this tier"
        : "Mint backend not connected yet";
      btn.addEventListener("click", () => onSummon(btn.dataset.tier, btn));
    });
  }

  /**
   * The ONLY path to a real reveal. It requires a verified result from the
   * backend — the reveal never decides what the buyer received.
   */
  async function onSummon(tier, btn) {
    if (!bridge.hasBackend) return;
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = "SUMMONING…";
    try {
      const verified = bridge.normalise(await bridge.purchaseAndReveal(tier));
      const controller = new window.WizNerdzSummonController();
      await controller.reveal(verified);
    } catch (err) {
      // Blockchain correctness beats animation: report plainly, reveal nothing.
      const notice = document.getElementById("mint-notice");
      if (notice) {
        notice.innerHTML = `<strong>Summon failed.</strong> <span class="muted">${escapeHtml(String(err.message || err))}</span>`;
      }
    } finally {
      btn.disabled = !bridge.hasBackend;
      btn.textContent = original;
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();
