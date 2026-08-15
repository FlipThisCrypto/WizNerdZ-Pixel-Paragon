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

  function notice(html, { reveal = false, urgent = false } = {}) {
    const el = document.getElementById("mint-notice");
    if (!el) return;
    // role=status announces changes politely; a purchase failure must
    // interrupt instead - the buyer just spent money and needs to hear it.
    el.setAttribute("role", urgent ? "alert" : "status");
    el.innerHTML = html;
    // The notice sits above the tier grid; a buyer who clicked a button far
    // below would otherwise see "nothing happen" while the answer sat
    // off-screen at the top of the page.
    if (reveal && html) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /** Announce availability-state TRANSITIONS only (never periodic refreshes)
   *  through a visually hidden status line - live tier counts would spam a
   *  screen reader every poll; losing/regaining live data is worth hearing. */
  function announceAvailability(text) {
    let el = document.getElementById("wz-avail-status");
    if (!el) {
      el = document.createElement("span");
      el.id = "wz-avail-status";
      el.setAttribute("role", "status");
      el.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;";
      document.body.appendChild(el);
    }
    el.textContent = text;
  }

  /** Per-tier availability from the live stats API → button labels. */
  async function refreshAvailability() {
    if (!bridge.hasBackend) return;
    try {
      const res = await fetch(`${CFG.mint.apiBase}/mint-stats`, { headers: { accept: "application/json" } });
      if (!res.ok) return;
      const stats = await res.json();
      // the tier cards' availability line states the LIVE truth - the static
      // catalog said "2,941 of 2,941 available" while two boxes were buyable
      // "SOLD OUT" is a claim: it says boxes existed and buyers took them
      // all. A tier that has never had inventory must not make it - false
      // scarcity is exactly the kind of lie this site refuses elsewhere.
      document.querySelectorAll("[data-avail]").forEach((el) => {
        const t = stats.byTier?.[el.dataset.avail];
        const base = el.textContent.split("·").slice(0, 2).map(x => x.trim());
        const tail = t ? `${t.dispensable.toLocaleString()} buyable now` : "not yet on sale";
        el.textContent = `${base[0]} · ${base[1]} · ${tail}`;
      });
      document.querySelectorAll(".summon-btn[data-tier]").forEach((b) => {
        const t = stats.byTier?.[b.dataset.tier];
        if (!t) {
          b.dataset.soldOut = "";
          b.textContent = "NOT YET ON SALE";
          b.disabled = true;
        } else if (t.dispensable === 0) {
          b.dataset.soldOut = "1";
          b.textContent = "SOLD OUT";
          b.disabled = true;
        } else if (b.textContent === "SOLD OUT" || b.textContent === "NOT YET ON SALE") {
          b.dataset.soldOut = "";
          b.textContent = "SUMMON";
          refreshButtons();
        }
      });
      // fresh truth arrived: clear any staleness annotation
      const wasStale = document.querySelector("[data-avail][data-stale]");
      document.querySelectorAll("[data-avail][data-stale]").forEach((el) => {
        el.removeAttribute("data-stale");
        el.textContent = el.textContent.replace(/ · live status unavailable$/, "");
      });
      if (wasStale) announceAvailability("Live availability restored.");
    } catch (_) {
      // The API is unreachable. Keeping "N buyable now" as if current would
      // show yesterday's truth as fresh - the quiet-degradation posture the
      // rest of the system refuses. Say so instead.
      const newlyStale = document.querySelector("[data-avail]:not([data-stale])");
      document.querySelectorAll("[data-avail]:not([data-stale])").forEach((el) => {
        el.setAttribute("data-stale", "1");
        el.textContent += " · live status unavailable";
      });
      if (newlyStale) announceAvailability("Live availability unavailable - showing last known counts.");
    }
  }
  // small public surface: ops debugging + failure-path testing
  window.WizNerdzMintPage = { refreshAvailability };

  function walletBar() {
    const host = document.getElementById("tiers");
    if (!host || document.getElementById("wz-wallet-bar")) return;
    const bar = document.createElement("div");
    bar.id = "wz-wallet-bar";
    bar.className = "wz-wallet-bar";
    bar.innerHTML = `
      <button type="button" id="wz-connect" class="summon-btn">Connect wallet</button>
      <span id="wz-wallet-state" class="muted" role="status"></span>
      <div id="wz-wc-uri" hidden></div>`;
    host.parentNode.insertBefore(bar, host);

    document.getElementById("wz-connect").addEventListener("click", async () => {
      const btn = document.getElementById("wz-connect");
      btn.disabled = true;
      setWalletState("Opening WalletConnect…");
      try {
        await window.WizNerdzWallet.connect({ onUri: showWcUri });
      } catch (e) {
        setWalletState("Connect failed: " + (e.message || e));
      } finally {
        btn.disabled = false;
      }
    });
  }

  /**
   * Show the pairing both ways a wallet can consume it:
   *  - QR code for Sage mobile (rendered locally — the pairing secret never
   *    leaves this page; no third-party QR service ever sees it)
   *  - copy button for Sage desktop (Settings → WalletConnect → paste),
   *    because hand-copying a ~500-char URI out of wrapped text is exactly
   *    how pairing "mysteriously" fails
   */
  async function showWcUri(uri) {
    const box = document.getElementById("wz-wc-uri");
    if (!box) return;
    box.hidden = false;
    box.innerHTML = "";

    try {
      const QR = await import("https://esm.sh/qrcode@1.5.4");
      const canvas = document.createElement("canvas");
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", "WalletConnect pairing QR code");
      canvas.style.cssText = "display:block;margin:0 0 10px;border-radius:10px";
      await QR.toCanvas(canvas, uri, {
        width: 220, margin: 2,
        color: { dark: "#020308", light: "#f4f7fb" },
      });
      box.appendChild(canvas);
    } catch (_) {
      /* QR lib unreachable — copy path below still works */
    }

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "summon-btn";
    copyBtn.textContent = "Copy pairing link";
    copyBtn.addEventListener("click", async () => {
      let ok = false;
      try {
        await navigator.clipboard.writeText(uri);
        ok = true;
      } catch (_) {
        // clipboard API blocked — select the fallback textarea instead
        ta.hidden = false;
        ta.select();
        try { ok = document.execCommand("copy"); } catch (_) { /* manual copy */ }
      }
      copyBtn.textContent = ok ? "Copied ✓" : "Copy failed — select the text below";
      if (!ok) ta.hidden = false;
      setTimeout(() => { copyBtn.textContent = "Copy pairing link"; }, 2500);
    });
    box.appendChild(copyBtn);

    const ta = document.createElement("textarea");
    ta.readOnly = true;
    ta.value = uri;
    ta.hidden = true;
    ta.setAttribute("aria-label", "WalletConnect pairing link");
    ta.style.cssText = "width:100%;min-height:70px;margin-top:8px;font-size:.68rem;" +
      "background:transparent;color:inherit;border:1px solid rgba(168,212,255,.35);border-radius:10px;padding:8px";
    box.appendChild(ta);

    const hint = document.createElement("p");
    hint.className = "muted";
    hint.style.cssText = "font-size:.78rem;margin:8px 0 0";
    hint.textContent =
      "Sage mobile: scan the QR. Sage desktop: copy the link, then Sage → Settings → WalletConnect → paste. " +
      "Pairing links expire after a few minutes — click Connect wallet again for a fresh one.";
    box.appendChild(hint);
  }

  function setWalletState(text) {
    const el = document.getElementById("wz-wallet-state");
    if (el) el.textContent = text;
  }

  function refreshButtons() {
    const connected = !!(window.WizNerdzWallet && window.WizNerdzWallet.isConnected);
    document.querySelectorAll(".summon-btn[data-tier]").forEach((b) => {
      // sold-out wins over everything — connecting a wallet must not re-arm
      // a tier with no inventory
      if (b.dataset.soldOut === "1") {
        b.disabled = true;
        b.title = "Sold out";
        return;
      }
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
        // The most common cause: the buyer pasted the WIZNERD's id, which
        // sits right beside the box in their wallet after delivery.
        if (!quiet) notice(
          `<strong>No record of that id.</strong> <span class="muted">Check you pasted the ` +
          `<em>sealed box's</em> NFT id — after delivery your wallet holds both the box and the ` +
          `WizNerd from it, and only the box id opens the reveal. If you bought moments ago, ` +
          `settling can take a few minutes.</span>`);
      } else if (!quiet) {
        notice(pendingCopy(s, box), { reveal: true });
      }
    } catch {
      if (!quiet) notice(`<strong>Could not reach the mint service.</strong> <span class="muted">Your box is safe — this page only reads what already happened on chain.</span>`);
    }
    return false;
  }


  /** "sold 25 minutes ago" / "sold 3 hours ago" - or "" when the timestamp is
   *  missing/unparseable, so the caller degrades to copy without a bad age. */
  function saleAge(updatedAt) {
    const t = new Date(updatedAt ?? NaN).getTime();
    if (!Number.isFinite(t)) return "";
    const min = Math.max(1, Math.round((Date.now() - t) / 60000));
    if (min < 90) return `sold ${min} minute${min === 1 ? "" : "s"} ago`;
    const h = Math.round(min / 60);
    return `sold ${h} hour${h === 1 ? "" : "s"} ago`;
  }

  /** Honest expectation line for a paid-but-undelivered box. */
  function pendingCopy(s, box) {
    const age = saleAge(s.updatedAt);
    return (
      `<strong>Delivery in progress.</strong> <span class="muted">Box ${escapeHtml(box.slice(0, 14))}… ` +
      `is ${escapeHtml(s.state)}${age ? " — " + age : ""}. Deliveries are completed by the operator ` +
      `and typically land within a few hours; this page opens your reveal automatically once the ` +
      `chain confirms. Your WizNerdZ cannot be lost — contents were committed before sale and ` +
      `delivery follows your settled purchase.</span>`
    );
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
      notice(pendingCopy(s, box));
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
      <label for="wz-box-id" class="muted" style="flex-basis:100%">Already have a sealed box? Paste the <em>box's</em> NFT id
        (the item named “WizNerdZ Sealed Box” in your wallet — not the WizNerd delivered from it):</label>
      <input id="wz-box-id" type="text" placeholder="nft1…" spellcheck="false"
             style="flex:1;min-width:200px" />
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
    } finally {
      // These must exist even when the catalog fetch fails: a buyer with a
      // paid, undelivered box recovers it through the open-box bar, and that
      // recovery cannot depend on an unrelated JSON file loading.
      walletBar();
      openBoxBar();
      refreshButtons();
      refreshAvailability();
      setInterval(refreshAvailability, 30000);
      resumePendingBox();
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
        <p class="muted" style="font-size:.78rem" data-avail="${escapeHtml(t.tier_id)}">${t.nft_count} NFT${t.nft_count === 1 ? "" : "s"} · ${t.total.toLocaleString()} in tier</p>
        <button type="button" class="summon-btn" data-tier="${escapeHtml(t.tier_id)}" disabled>
          SUMMON
        </button>
      </article>`
      )
      .join("");

    root.querySelectorAll(".summon-btn[data-tier]").forEach((btn) => {
      btn.addEventListener("click", () => onSummon(btn.dataset.tier, btn));
    });
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
            `Box <code>${escapeHtml(String(err.boxNftId).slice(0, 18))}…</code></span>`,
          { reveal: true }
        );
      } else {
        notice(`<strong>Summon failed.</strong> <span class="muted">${escapeHtml(String(err.message || err))}</span>`, { reveal: true, urgent: true });
        refreshAvailability(); // a sold-out failure should mark the button too
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
