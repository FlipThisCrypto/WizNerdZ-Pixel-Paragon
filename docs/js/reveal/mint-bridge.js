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

  class MintBridge {
    constructor({ endpoint = null } = {}) {
      this.endpoint = endpoint; // set when a real backend exists
    }

    get hasBackend() {
      return !!this.endpoint;
    }

    /**
     * Purchase + reveal against the real backend.
     * Intentionally throws while no backend exists — we do not fake mints.
     */
    async purchaseAndReveal() {
      throw new Error(
        "No mint backend configured. The reveal layer only consumes verified " +
        "results; it cannot create a purchase. See docs/mint-pipeline/P0_DECISIONS.md."
      );
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
  window.WIZNERDZ_TIER_LABELS = TIER_LABELS;
})();
