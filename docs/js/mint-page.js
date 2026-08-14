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

  const CFG = window.WIZNERDZ_CONFIG || {};
  const bridge = new window.WizNerdzMintBridge({
    endpoint: (CFG.mint && CFG.mint.enabled && CFG.mint.apiBase) || null,
  });

  // A purchase is identified by its BOX, not by this browser. Remembering the
  // box id lets someone close the tab mid-delivery and still get their reveal
  // when they come back; losing it costs them nothing, because the operator
  // delivers from observed chain state either way.
  const LAST_BOX = "wiznerdz:last-box";

  function notice(html) {
    const el = document.getElementById("mint-notice");
    if (el) el.innerHTML = html;
  }

  function walletBar() {
    const host = document.getElementById("tiers");
    if (!host || document.getElementById("wz-wallet-bar")) return;
    const bar = document.createElement("div");
    bar.id = "wz-wallet-bar";
    bar.className = "wz-wallet-bar";
    bar.innerHTML = `
      <button type="button" id="wz-connect" class="summon-btn">Connect wallet</button>
      <span id="wz-wallet-state" class="muted"></span>
      <div id="wz-wc-uri" hidden></div>`;
    host.parentNode.insertBefore(bar, host);

    document.getElementById("wz-connect").addEventListener("click", async () => {
      const btn = document.getElementById("wz-connect");
      btn.disabled = true;
      setWalletState("Opening WalletConnect…");
      try {
        await window.WizNerdzWallet.connect({
          onUri: (uri) => {
            const box = document.getElementById("wz-wc-uri");
            box.hidden = false;
            box.innerHTML = "";
            const pre = document.createElement("pre");
            pre.className = "wc-uri";
            pre.textContent = uri;
            box.appendChild(pre);
          },
        });
      } catch (e) {
        setWalletState("Connect failed: " + (e.message || e));
      } finally {
        btn.disabled = false;
      }
    });
  }

  function setWalletState(text) {
    const el = document.getElementById("wz-wallet-state");
    if (el) el.textContent = text;
  }

  function refreshButtons() {
    const connected = !!(window.WizNerdzWallet && window.WizNerdzWallet.isConnected);
    document.querySelectorAll(".summon-btn[data-tier]").forEach((b) => {
      b.disabled = !bridge.hasBackend || !connected;
      b.title = !bridge.hasBackend
        ? "Mint backend not connected yet"
        : !connected
        ? "Connect a wallet to summon"
        : "Summon this tier";
    });
    const c = document.getElementById("wz-connect");
    if (c) c.textContent = connected ? "Wallet connected" : "Connect wallet";
  }

  window.addEventListener("wiznerdz:wallet-connected", () => {
    const a = window.WizNerdzWallet.address;
    setWalletState(a ? "Connected " + a.slice(0, 10) + "…" : "Connected");
    const box = document.getElementById("wz-wc-uri");
    if (box) box.hidden = true;
    refreshButtons();
  });
  window.addEventListener("wiznerdz:wallet-disconnected", () => {
    setWalletState("Disconnected");
    refreshButtons();
  });

  /**
   * The recovery path: open any box by its NFT id.
   *
   * A buyer may have taken the offer in their wallet directly, on another
   * device, or lost the tab mid-delivery. The box NFT is the purchase
   * identity, so its id alone is enough to recover the reveal — nothing
   * about the purchase lives only in this browser.
   */
  async function openBox(box, { quiet = false } = {}) {
    if (!box || !bridge.hasBackend) return false;
    box = box.trim();
    if (!/^nft1[a-z0-9]{50,70}$/.test(box)) {
      if (!quiet) notice(`<strong>That doesn't look like a box id.</strong> <span class="muted">It starts with <code>nft1</code> — find it in your wallet's NFT list.</span>`);
      return false;
    }
    try {
      const s = await bridge.checkBox(box);
      if (!s.pending && Array.isArray(s.nfts) && s.nfts.length) {
        localStorage.removeItem(LAST_BOX);
        notice("");
        const controller = new window.WizNerdzSummonController();
        await controller.reveal(bridge.normalise({
          transactionId: s.transactionId, boxId: box, tier: s.tier,
          tierLabel: s.tierLabel, nfts: s.nfts,
        }));
        return true;
      }
      if (s.state === "UNKNOWN") {
        if (!quiet) notice(`<strong>No record of that box yet.</strong> <span class="muted">If you just bought it, the sale may still be settling — try again in a few minutes.</span>`);
      } else if (!quiet) {
        notice(`<strong>Delivery in progress.</strong> <span class="muted">Box ${escapeHtml(box.slice(0, 14))}… is ${escapeHtml(s.state)}. Your WizNerdZ arrive automatically once the chain confirms — check back soon.</span>`);
      }
    } catch {
      if (!quiet) notice(`<strong>Could not reach the mint service.</strong> <span class="muted">Your box is safe — this page only reads what already happened on chain.</span>`);
    }
    return false;
  }

  /** Auto-resume: ?box=nft1... beats the remembered box from this browser. */
  async function resumePendingBox() {
    const fromUrl = new URLSearchParams(location.search).get("box");
    const box = fromUrl || localStorage.getItem(LAST_BOX);
    if (!box || !bridge.hasBackend) return;
    const input = document.getElementById("wz-box-id");
    if (input) input.value = box;
    const s = await bridge.checkBox(box).catch(() => null);
    if (!s) return;
    if (!s.pending && Array.isArray(s.nfts) && s.nfts.length) {
      notice(`<strong>Your box is ready.</strong> <button type="button" id="wz-open-ready" class="summon-btn">Open it</button>`);
      document.getElementById("wz-open-ready").addEventListener("click", () => openBox(box));
    } else if (s.state !== "UNKNOWN") {
      notice(`<strong>Delivery in progress.</strong> <span class="muted">Box ${escapeHtml(box.slice(0, 14))}… is ${escapeHtml(s.state)}. This page will open it once the chain confirms.</span>`);
    }
  }

  /** "Already have a box?" — visible recovery UI, not just an auto-resume. */
  function openBoxBar() {
    const host = document.getElementById("tiers");
    if (!host || document.getElementById("wz-open-bar")) return;
    const bar = document.createElement("div");
    bar.id = "wz-open-bar";
    bar.className = "wz-wallet-bar";
    bar.innerHTML = `
      <label for="wz-box-id" class="muted" style="flex-basis:100%">Already have a sealed box? Paste its NFT id to open it:</label>
      <input id="wz-box-id" type="text" placeholder="nft1…" spellcheck="false"
             style="flex:1;min-width:200px;min-height:44px;padding:0 12px;background:transparent;border:1px solid rgba(168,212,255,.35);border-radius:10px;color:inherit" />
      <button type="button" id="wz-open-btn" class="summon-btn">Open box</button>`;
    host.parentNode.insertBefore(bar, host.nextSibling);
    document.getElementById("wz-open-btn").addEventListener("click", () => {
      openBox(document.getElementById("wz-box-id").value);
    });
    document.getElementById("wz-box-id").addEventListener("keydown", (e) => {
      if (e.key === "Enter") openBox(e.target.value);
    });
  }

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

    root.querySelectorAll(".summon-btn[data-tier]").forEach((btn) => {
      btn.addEventListener("click", () => onSummon(btn.dataset.tier, btn));
    });
    walletBar();
    openBoxBar();
    refreshButtons();
    resumePendingBox();
  }

  /**
   * The ONLY path to a real reveal. It requires a verified result from the
   * backend — the reveal never decides what the buyer received.
   */
  const PHASES = {
    reserving: "Reserving a sealed box…",
    awaiting_approval: "Approve the offer in your wallet…",
    settling: "Payment sent. Waiting for the chain…",
    awaiting_delivery: "Settled. Your WizNerdZ are being delivered…",
  };

  async function onSummon(tier, btn) {
    if (!bridge.hasBackend) return;
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = "SUMMONING…";
    notice("");
    try {
      const raw = await bridge.purchaseAndReveal(tier, {
        onProgress: (p) => {
          if (p.boxNftId) localStorage.setItem(LAST_BOX, p.boxNftId);
          notice(`<span class="muted">${escapeHtml(PHASES[p.phase] || p.phase)}</span>`);
        },
      });
      localStorage.removeItem(LAST_BOX);
      notice("");
      const controller = new window.WizNerdzSummonController();
      await controller.reveal(bridge.normalise(raw));
    } catch (err) {
      // Blockchain correctness beats animation: report plainly, reveal nothing.
      if (err && err.name === "DeliveryPending") {
        // Bought, not yet delivered. Never animate a result we cannot prove.
        notice(
          `<strong>Your box is bought.</strong> <span class="muted">Delivery is still confirming on chain. ` +
            `You can close this page — come back and it will open automatically. ` +
            `Box <code>${escapeHtml(String(err.boxNftId).slice(0, 18))}…</code></span>`
        );
      } else {
        notice(`<strong>Summon failed.</strong> <span class="muted">${escapeHtml(String(err.message || err))}</span>`);
      }
    } finally {
      btn.textContent = original;
      refreshButtons();
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
