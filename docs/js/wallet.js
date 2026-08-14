/**
 * Sage / Chia WalletConnect client for static GitHub Pages.
 *
 * Security model:
 * - Browser never holds mint keys.
 * - User approves sessions + takeOffer in Sage (or any Chia WC wallet).
 * - Requires a public WalletConnect/Reown projectId in config.js.
 */
(function () {
  const cfg = window.WIZNERDZ_CONFIG;
  // Element lookups BEFORE the kill switch: this block used to read statusEl /
  // connectBtn ahead of their const declarations, so flipping ?flag_wallet=0
  // during an incident threw a TDZ ReferenceError and killed the whole IIFE —
  // the emergency brake was the one path guaranteed to crash.
  const statusEl = document.getElementById("wc-status");
  const addrEl = document.getElementById("wc-address");
  const connectBtn = document.getElementById("btn-connect");
  const disconnectBtn = document.getElementById("btn-disconnect");
  const mintBtn = document.getElementById("btn-mint");
  const qrBox = document.getElementById("wc-qr");
  if (window.WIZNERDZ_FLAGS && window.WIZNERDZ_FLAGS.wallet === false) {
    if (statusEl) {
      statusEl.textContent = "WalletConnect disabled by feature flag.";
      statusEl.className = "wc-status warn";
    }
    if (connectBtn) connectBtn.disabled = true;
    return;
  }

  let client = null;
  let session = null;

  function classifyErr(err) {
    const m = String(err && err.message ? err.message : err || "");
    if (/user reject|denied|cancel/i.test(m)) return "Request cancelled in wallet.";
    if (/network|fetch|failed to fetch/i.test(m)) return "Network error — check connection and retry.";
    if (/projectId|unauthorized/i.test(m)) return "WalletConnect project configuration error.";
    if (/timeout/i.test(m)) return "Wallet request timed out — open Sage and try again.";
    return m || "Unknown wallet error";
  }

  function setStatus(msg, cls) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = "wc-status" + (cls ? " " + cls : "");
  }

  /** Notify page listeners (e.g. nominate form) when address is known. */
  function publishAddress(addr) {
    try {
      window.dispatchEvent(
        new CustomEvent("wiznerdz:wallet", { detail: { address: addr || "" } })
      );
    } catch (_) {
      /* ignore */
    }
  }

  function shortAddr(a) {
    if (!a || a.length < 16) return a || "—";
    return a.slice(0, 10) + "…" + a.slice(-6);
  }

  function updateUi() {
    const connected = !!(session && session.topic);
    if (connectBtn) connectBtn.disabled = connected;
    if (disconnectBtn) disconnectBtn.hidden = !connected;
    if (mintBtn) {
      mintBtn.disabled = !connected || !cfg.mint.enabled;
      mintBtn.title = !cfg.mint.enabled
        ? "Mint offer not published yet"
        : connected
          ? "Take mint offer with connected wallet"
          : "Connect wallet first";
    }
    if (!connected && addrEl) addrEl.textContent = "Not connected";
  }

  async function loadSignClient() {
    // ESM CDN — no build step required for GitHub Pages
    const mod = await import(
      "https://esm.sh/@walletconnect/sign-client@2.17.3"
    );
    return mod.SignClient || mod.default?.SignClient || mod.default;
  }

  async function ensureClient() {
    if (client) return client;
    const projectId = (cfg.walletConnect.projectId || "").trim();
    if (!projectId) {
      throw new Error(
        "Missing WalletConnect projectId. Add it in js/config.js (free at cloud.reown.com)."
      );
    }
    const SignClient = await loadSignClient();
    client = await SignClient.init({
      projectId,
      metadata: cfg.walletConnect.metadata,
    });

    client.on("session_delete", () => {
      session = null;
      setStatus("Session ended.", "warn");
      updateUi();
    });

    // Restore existing session if any
    if (client.session && client.session.length) {
      session = client.session.getAll()[0];
      setStatus("Restored previous WalletConnect session.", "ok");
      await refreshAddress();
    }
    return client;
  }

  async function refreshAddress() {
    if (!session || !client) return;
    try {
      const chain = cfg.walletConnect.chainId;
      const result = await client.request({
        topic: session.topic,
        chainId: chain,
        request: {
          method: "chia_getCurrentAddress",
          params: {
            fingerprint: undefined,
            walletId: 1,
          },
        },
      });
      // Response shape varies by wallet; handle common forms
      const addr =
        typeof result === "string"
          ? result
          : result?.address || result?.data || JSON.stringify(result);
      if (addrEl) addrEl.textContent = shortAddr(String(addr));
      publishAddress(String(addr));
      setStatus("Connected via WalletConnect (Sage-compatible).", "ok");
    } catch (err) {
      console.warn("getCurrentAddress", err);
      if (addrEl) addrEl.textContent = "Connected (address RPC pending wallet support)";
      publishAddress("");
      setStatus(
        "Connected. Address read failed — wallet may use different RPC params. Mint still possible via takeOffer when enabled.",
        "warn"
      );
    }
  }

  async function connect() {
    try {
      if (connectBtn) connectBtn.disabled = true;
      setStatus("Loading WalletConnect…");
      await ensureClient();
      setStatus("Open Sage → WalletConnect, then scan or approve the session.");

      // Keep REQUIRED minimal (takeOffer only) and put everything else in
      // optional: a wallet missing an optional method still pairs, whereas a
      // missing required method kills the session.
      const optional = cfg.walletConnect.optionalNamespaces?.chia;
      const { uri, approval } = await client.connect({
        requiredNamespaces: {
          chia: {
            methods: cfg.walletConnect.requiredNamespaces.chia.methods,
            chains: [cfg.walletConnect.chainId],
            events: cfg.walletConnect.requiredNamespaces.chia.events || [],
          },
        },
        ...(optional
          ? {
              optionalNamespaces: {
                chia: {
                  methods: optional.methods,
                  chains: [cfg.walletConnect.chainId],
                  events: optional.events || [],
                },
              },
            }
          : {}),
      });

      if (uri && qrBox) {
        qrBox.hidden = false;
        qrBox.innerHTML = "";

        // Client-side QR only — never send WC URI to a third-party image API
        try {
          const QR = await import("https://esm.sh/qrcode@1.5.4");
          const canvas = document.createElement("canvas");
          canvas.className = "wc-qr-img";
          canvas.setAttribute("role", "img");
          canvas.setAttribute("aria-label", "WalletConnect QR code");
          await QR.toCanvas(canvas, uri, {
            width: 220,
            margin: 2,
            color: { dark: "#020308", light: "#f4f7fb" },
          });
          qrBox.appendChild(canvas);
        } catch (qrErr) {
          console.warn("local QR render failed", qrErr);
          const note = document.createElement("p");
          note.className = "muted";
          note.textContent =
            "QR unavailable — copy the URI into Sage WalletConnect.";
          qrBox.appendChild(note);
        }

        // Copy beats hand-selecting a ~500-char wrapped URI (which silently
        // picks up line breaks and then fails to pair).
        const copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.className = "btn";
        copyBtn.textContent = "Copy pairing link";
        copyBtn.style.margin = "8px 0";
        copyBtn.addEventListener("click", async () => {
          let ok = false;
          try {
            await navigator.clipboard.writeText(uri);
            ok = true;
          } catch (_) {
            const r = document.createRange();
            r.selectNodeContents(pre);
            const sel = getSelection();
            sel.removeAllRanges();
            sel.addRange(r);
            try { ok = document.execCommand("copy"); } catch (_) { /* manual */ }
          }
          copyBtn.textContent = ok ? "Copied ✓" : "Copy failed — select below";
          setTimeout(() => { copyBtn.textContent = "Copy pairing link"; }, 2500);
        });
        qrBox.appendChild(copyBtn);

        const pre = document.createElement("pre");
        pre.className = "wc-uri";
        pre.textContent = uri;
        qrBox.appendChild(pre);

        const copy = document.createElement("button");
        copy.type = "button";
        copy.className = "btn";
        copy.textContent = "Copy WalletConnect URI";
        copy.onclick = async () => {
          try {
            await navigator.clipboard.writeText(uri);
            setStatus("URI copied — paste into Sage WalletConnect.", "ok");
          } catch {
            setStatus("Copy failed — select the URI text manually.", "warn");
          }
        };
        qrBox.appendChild(copy);
      }

      session = await approval();
      if (qrBox) qrBox.hidden = true;
      await refreshAddress();
      updateUi();
    } catch (err) {
      console.error(err);
      setStatus(classifyErr(err), "err");
      updateUi();
    } finally {
      if (connectBtn && !(session && session.topic)) connectBtn.disabled = false;
      updateUi();
    }
  }

  async function disconnect() {
    try {
      if (client && session) {
        await client.disconnect({
          topic: session.topic,
          reason: { code: 6000, message: "User disconnected" },
        });
      }
    } catch (_) {
      /* ignore */
    }
    session = null;
    if (qrBox) qrBox.hidden = true;
    publishAddress("");
    setStatus("Disconnected.", "warn");
    updateUi();
  }

  async function mint() {
    if (mintBtn) { mintBtn.disabled = true; mintBtn.textContent = "Minting…"; }
    try {
    if (!cfg.mint.enabled) {
      setStatus("Mint is not enabled yet — offer / MintGarden link pending.", "warn");
      return;
    }
    // Prefer external MintGarden URL if set (simplest secure path)
    if (cfg.mint.mintgardenUrl) {
      window.open(cfg.mint.mintgardenUrl, "_blank", "noopener");
      setStatus("Opened MintGarden — complete mint in Sage / browser wallet.", "ok");
      return;
    }
    if (!session || !client) {
      setStatus("Connect wallet first.", "err");
      return;
    }
    if (!cfg.mint.offerUrl) {
      setStatus("No offer URL configured in js/config.js.", "err");
      return;
    }
    try {
      setStatus("Reserving a sealed box…");
      const tier = cfg.mint.tier || "blind_single";
      const url = `${cfg.mint.offerUrl}?tier=${encodeURIComponent(tier)}`;
      const offerRes = await fetch(url, { headers: { accept: "application/json" } });
      const data = await offerRes.json().catch(() => null);

      if (offerRes.status === 410) {
        setStatus("Sold out — no sealed boxes left in this tier.", "warn");
        return;
      }
      if (!offerRes.ok || !data?.offer) {
        throw new Error(data?.message || data?.error || "Could not fetch a sealed box offer");
      }

      // What the wallet shows is a generic sealed box, never the WizNerd
      // inside. Every box in a tier is identical, so there is nothing to
      // select on and no way to refuse-and-redraw for a rarer one.
      setStatus("Approve the offer in your wallet…");
      const result = await client.request({
        topic: session.topic,
        chainId: cfg.walletConnect.chainId,
        request: {
          method: "chia_takeOffer",
          params: { offer: String(data.offer).trim(), fee: 0 },
        },
      });

      // Approval means the box is bought. It does NOT mean anything has been
      // delivered, and this page must never claim otherwise or trigger
      // delivery itself: fulfillment is driven by observed chain state, so it
      // completes even if this tab is closed right now.
      console.info("takeOffer result", result, "box", data.boxNftId);
      setStatus(
        "Box purchased. Your WizNerd is delivered automatically once the sale " +
          "settles on chain — you can safely close this page.",
        "ok"
      );
    } catch (err) {
      console.error(err);
      setStatus(classifyErr(err), "err");
    } finally {
      if (mintBtn) {
        mintBtn.textContent = "Mint (after collection freeze)";
      }
      updateUi();
    }
    } catch (errOuter) {
      setStatus(classifyErr(errOuter), "err");
      if (mintBtn) mintBtn.textContent = "Mint (after collection freeze)";
      updateUi();
    }
  }

  if (connectBtn) connectBtn.addEventListener("click", connect);
  if (disconnectBtn) disconnectBtn.addEventListener("click", disconnect);
  if (mintBtn) mintBtn.addEventListener("click", mint);

  // Surface setup state on load
  const pid = (cfg.walletConnect.projectId || "").trim();
  if (!pid) {
    setStatus(
      "WalletConnect projectId not set. Add it in js/config.js (cloud.reown.com), then Connect works with Sage.",
      "warn"
    );
  } else if (!/^[a-f0-9]{32}$/i.test(pid)) {
    setStatus(
      "WalletConnect projectId looks unexpected (expected 32 hex chars). Connect may still work — verify at cloud.reown.com.",
      "warn"
    );
  } else {
    setStatus("Ready — connect Sage via WalletConnect.", "ok");
  }
  updateUi();
})();
