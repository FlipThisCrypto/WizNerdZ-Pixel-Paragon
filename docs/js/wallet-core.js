/**
 * WizNerdzWallet — WalletConnect for Chia, with no DOM of its own.
 *
 * Exists so the mint page can connect and take an offer without inheriting the
 * landing page's markup. js/wallet.js stays exactly as it is and keeps owning
 * the hero connect widget; this is the reusable half.
 *
 * Only chia_takeOffer is REQUIRED. Sage and several other wallets do not expose
 * chia_getWallets / chia_getNFTs, and WalletConnect refuses a session outright
 * when a required method is missing — which is what made pairing fail with
 * "could not list wallets". Address reads are best-effort and never block a
 * purchase.
 */
(function () {
  const cfg = () => window.WIZNERDZ_CONFIG;

  let client = null;
  let session = null;
  let address = "";

  async function loadSignClient() {
    const mod = await import("https://esm.sh/@walletconnect/sign-client@2.17.3");
    return mod.SignClient || mod.default?.SignClient || mod.default;
  }

  async function ensureClient() {
    if (client) return client;
    const c = cfg();
    const SignClient = await loadSignClient();
    client = await SignClient.init({
      projectId: (c.walletConnect.projectId || "").trim(),
      metadata: c.walletConnect.metadata,
    });
    client.on("session_delete", () => {
      session = null;
      address = "";
      emit("disconnected", {});
    });
    if (client.session && client.session.length) {
      session = client.session.getAll()[0];
      emit("connected", { restored: true });
      refreshAddress().catch(() => {});
    }
    return client;
  }

  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent("wiznerdz:wallet-" + name, { detail }));
  }

  /** Best effort only. A wallet that cannot report an address can still buy. */
  async function refreshAddress() {
    if (!session || !client) return "";
    try {
      const res = await client.request({
        topic: session.topic,
        chainId: cfg().walletConnect.chainId,
        request: { method: "chia_getCurrentAddress", params: { walletId: 1 } },
      });
      address = typeof res === "string" ? res : res?.address || res?.data || "";
    } catch {
      address = "";
    }
    return address;
  }

  async function connect({ onUri } = {}) {
    const c = cfg();
    await ensureClient();
    if (session) return session;

    const req = c.walletConnect.requiredNamespaces?.chia;
    const opt = c.walletConnect.optionalNamespaces?.chia;

    const { uri, approval } = await client.connect({
      requiredNamespaces: {
        chia: {
          methods: req?.methods || ["chia_takeOffer"],
          chains: [c.walletConnect.chainId],
          events: req?.events || [],
        },
      },
      ...(opt
        ? {
            optionalNamespaces: {
              chia: {
                methods: opt.methods,
                chains: [c.walletConnect.chainId],
                events: opt.events || [],
              },
            },
          }
        : {}),
    });

    if (uri && onUri) onUri(uri);
    session = await approval();
    emit("connected", {});
    refreshAddress().catch(() => {});
    return session;
  }

  async function takeOffer(offerText, { fee = 0 } = {}) {
    if (!session || !client) throw new Error("Connect a wallet first.");
    if (!offerText || !String(offerText).startsWith("offer1")) {
      throw new Error("That does not look like a Chia offer.");
    }
    return client.request({
      topic: session.topic,
      chainId: cfg().walletConnect.chainId,
      request: {
        method: "chia_takeOffer",
        params: { offer: String(offerText).trim(), fee },
      },
    });
  }

  async function disconnect() {
    try {
      if (client && session) {
        await client.disconnect({
          topic: session.topic,
          reason: { code: 6000, message: "User disconnected" },
        });
      }
    } catch {
      /* already gone */
    }
    session = null;
    address = "";
    emit("disconnected", {});
  }

  window.WizNerdzWallet = {
    connect,
    disconnect,
    takeOffer,
    refreshAddress,
    get isConnected() {
      return !!session;
    },
    get address() {
      return address;
    },
  };
})();
