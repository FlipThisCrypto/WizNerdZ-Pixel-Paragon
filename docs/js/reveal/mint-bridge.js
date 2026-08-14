/**
 * MintBridge — the boundary between the REAL mint system and the reveal layer.
 *
 * READ THIS BEFORE WIRING A BACKEND.
 *
 * The reveal layer is a consumer of already-verified results. It must never
 * decide, guess, or fabricate what a buyer received. Today there is no mint
 * backend (see docs/mint-pipeline/MINT_SYSTEM_ASSESSMENT.md): no offer creation,
 * no on-chain payment verification, no NFT fulfilment. So this file deliberately
 * ships with NO working purchase path — only the contract a real backend must
 * satisfy, plus a clearly-labelled simulator for development.
 *
 * The verified result shape the backend must eventually return:
 *
 *   {
 *     transactionId: string|null,   // on-chain reference, null if unknown
 *     boxId:         string,
 *     tier:          "premium_named"|"elite"|"rare"|"standard_bundle"|"blind_single",
 *     tierLabel:     string,
 *     nfts: [{
 *       id:               number,
 *       name:             string,
 *       image:            string,   // resolved URL
 *       rarity:           string|null,
 *       rarityRank:       number|null,
 *       raritySeriesTotal:number|null,
 *       special:          string|null,
 *       isOneOfOne:       boolean,
 *       tokenUrl:         string|null
 *     }]
 *   }
 *
 * Fulfilment truth comes from the chain + mint_system, never from this file.
 */
(function () {
  const TIER_LABELS = {
    premium_named: "Named Premium",
    elite: "Elite",
    rare: "Rare",
    standard_bundle: "Standard Bundle",
    blind_single: "Blind Single",
  };

  /** Paid for, but the chain has not yet confirmed what was delivered. */
  class DeliveryPending extends Error {
    constructor(boxNftId, state) {
      super("Your box is bought. Delivery is still settling on chain.");
      this.name = "DeliveryPending";
      this.boxNftId = boxNftId;
      this.state = state;
    }
  }

  class MintBridge {
    constructor({ endpoint = null } = {}) {
      // Base of the mint API, e.g. https://<site>/api
      this.endpoint = endpoint;
    }

    get hasBackend() {
      return !!this.endpoint;
    }

    /** Reserve a sealed box and hand back the offer the wallet must approve. */
    async fetchOffer(tier) {
      const res = await fetch(`${this.endpoint}/mint-offer?tier=${encodeURIComponent(tier)}`, {
        headers: { accept: "application/json" },
      });
      const data = await res.json().catch(() => null);
      if (res.status === 410) throw new Error("Sold out — no sealed boxes left in this tier.");
      if (!res.ok || !data?.offer) {
        throw new Error(data?.message || data?.error || "Could not reserve a sealed box.");
      }
      return data;
    }

    /** What the operator has published about one box. Read-only truth. */
    async checkBox(boxNftId) {
      const res = await fetch(`${this.endpoint}/mint-status?box=${encodeURIComponent(boxNftId)}`, {
        headers: { accept: "application/json" },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Could not read box status.");
      return data;
    }

    /**
     * Wait for DELIVERY to be confirmed — not for the purchase to succeed.
     *
     * Approving the offer only buys a sealed box. What is inside is not known
     * to the wallet, the browser, or this file, and is not decided by any of
     * them: it was committed before the box went on sale and is published only
     * once the delivery is on chain.
     */
    async waitForDelivery(boxNftId, { onProgress, timeoutMs = 10 * 60 * 1000 } = {}) {
      const started = Date.now();
      let delay = 3000;
      let last = null;
      while (Date.now() - started < timeoutMs) {
        const s = await this.checkBox(boxNftId).catch(() => null);
        if (s) {
          last = s;
          if (!s.pending && Array.isArray(s.nfts)) return s;
          if (onProgress) onProgress({ phase: "awaiting_delivery", state: s.state, boxNftId });
        }
        await new Promise((r) => setTimeout(r, delay));
        delay = Math.min(delay * 1.4, 20000); // ease off; delivery is not instant
      }
      throw new DeliveryPending(boxNftId, last?.state || "UNKNOWN");
    }

    /**
     * The full buy path: reserve a sealed box, have the wallet approve it, then
     * wait for the operator to publish a chain-verified delivery.
     *
     * This never fabricates a result. If delivery has not confirmed by the time
     * we stop waiting it raises DeliveryPending carrying the box id, so the
     * page can tell the buyer to come back rather than invent a reveal.
     */
    async purchaseAndReveal(tier, { onProgress } = {}) {
      if (!this.hasBackend) {
        throw new Error("No mint backend configured.");
      }
      const wallet = window.WizNerdzWallet;
      if (!wallet || !wallet.isConnected) throw new Error("Connect a wallet first.");

      if (onProgress) onProgress({ phase: "reserving" });
      const offer = await this.fetchOffer(tier);

      if (onProgress) onProgress({ phase: "awaiting_approval", boxNftId: offer.boxNftId });
      await wallet.takeOffer(offer.offer, { fee: 0 });

      if (onProgress) onProgress({ phase: "settling", boxNftId: offer.boxNftId });
      const status = await this.waitForDelivery(offer.boxNftId, { onProgress });

      return {
        transactionId: status.transactionId ?? null,
        boxId: offer.boxNftId,
        tier: status.tier || tier,
        tierLabel: status.tierLabel || TIER_LABELS[tier],
        nfts: status.nfts || [],
      };
    }

    /** Normalise whatever the backend returns into the documented shape. */
    normalise(raw) {
      const nfts = (raw.nfts || []).map((n) => ({
        id: n.id,
        name: n.name || `WizNerd #${n.id}`,
        image: n.image || null,
        rarity: n.rarity ?? null,
        rarityRank: n.rarityRank ?? null,
        raritySeriesTotal: n.raritySeriesTotal ?? null,
        special: n.special ?? null,
        isOneOfOne: !!n.isOneOfOne,
        tokenUrl: n.tokenUrl ?? null,
      }));
      return {
        transactionId: raw.transactionId ?? null,
        boxId: raw.boxId ?? null,
        tier: raw.tier || "blind_single",
        tierLabel: raw.tierLabel || TIER_LABELS[raw.tier] || "Summon",
        nfts,
      };
    }
  }

  window.WizNerdzMintBridge = MintBridge;
  window.WizNerdzDeliveryPending = DeliveryPending;
  window.WIZNERDZ_TIER_LABELS = TIER_LABELS;
})();
