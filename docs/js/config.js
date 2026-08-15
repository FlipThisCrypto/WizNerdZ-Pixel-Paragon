/**
 * WizNerdZ Pixel Paragon — public mint / site config
 *
 * SECURITY:
 * - Never put private keys, mnemonics, or offer secrets here.
 * - Only public xch addresses and public WalletConnect project ID.
 */
window.WIZNERDZ_CONFIG = Object.freeze({
  collection: {
    name: "WizNerdZ Pixel Paragon",
    id: "a86a2b4a-9668-5cf9-a193-9783a0cf889d",
    legacyId: "wiznerdz-chia-gen1",
    seriesTotal: 8888,
    website: "https://flipthiscrypto.github.io/WizNerdZ-Pixel-Paragon/",
    twitter: "https://x.com/FiendStudios",
    github: "https://github.com/FlipThisCrypto/WizNerdZ-Pixel-Paragon",
    repoIssues: "https://github.com/FlipThisCrypto/WizNerdZ-Pixel-Paragon/issues/new",
    /** Full set including named + community 1-of-1s is in place. */
    collectionFrozen: true,
    statusMessage:
      "Collection art is complete — 8,888 WizNerdZ including 71 one-of-ones (10 named specials + 61 community). Drop coming soon. Follow @FiendStudios for mint day.",
  },

  /** Nominations closed — community 1-of-1s are already in the set. */
  nomination: {
    enabled: false,
    deadlineIsoEastern: "2026-08-01T00:00:00",
    deadlineUtc: "2026-08-01T04:00:00.000Z",
    timezone: "America/New_York",
    label: "Nominations closed",
    pfpSlotsTarget: "Closed — community 1-of-1s locked into the collection",
  },

  /**
   * Public mint + royalty receive wallet (single address for now).
   * Split policy still 40% / 40% / 20% — distribute off this wallet or set distinct addresses later.
   */
  treasuryWallet:
    "xch1qsclhhahfzs85xeemjye65yck2u6g9dpps0jtkwgjemzzndlu63qjej0te",

  /**
   * Primary sale splits (predetermined).
   * 40% developer · 40% wizards · 20% Bepe.Love pool
   * Of the developer 40%: half (50%) is reserved for $JUICE liquidity
   * (= 20% of total primary mint proceeds).
   */
  mintSplits: {
    developer: {
      pct: 40,
      label: "Developer",
      address:
        "xch1qsclhhahfzs85xeemjye65yck2u6g9dpps0jtkwgjemzzndlu63qjej0te",
      /** Share of the developer bucket used for $JUICE liquidity. */
      juiceLiquidityOfDeveloperPct: 50,
      /** Effective share of total primary mint → $JUICE liquidity. */
      juiceLiquidityOfTotalPct: 20,
      note:
        "50% of the developer portion funds $JUICE liquidity (20% of primary mint proceeds).",
    },
    wizards: {
      pct: 40,
      label: "Wizards",
      address:
        "xch1qsclhhahfzs85xeemjye65yck2u6g9dpps0jtkwgjemzzndlu63qjej0te",
    },
    bepeLove: {
      pct: 20,
      label: "Bepe.Love pool",
      address:
        "xch1qsclhhahfzs85xeemjye65yck2u6g9dpps0jtkwgjemzzndlu63qjej0te",
    },
  },

  /**
   * Secondary royalties: 10% of sale, same split of that 10%.
   * Effective share of secondary sale: 4% / 4% / 2%.
   */
  royalties: {
    totalPct: 10,
    developer: { pctOfRoyalty: 40, effectiveOfSale: 4 },
    wizards: { pctOfRoyalty: 40, effectiveOfSale: 4 },
    bepeLove: { pctOfRoyalty: 20, effectiveOfSale: 2 },
  },

  walletConnect: {
    projectId: "52a9997711dde5c4f822e5b08ea8f275",
    chainId: "chia:mainnet",
    // Taking an offer is the ONE capability every Chia wallet implements, and
    // it is the only thing a buyer actually has to do. So it is the only
    // required method.
    //
    // Requiring more than this is what broke Sage pairing ("could not list
    // wallets"): WalletConnect rejects a session outright if the wallet cannot
    // satisfy every REQUIRED method, and Sage does not reliably expose
    // chia_getWallets / chia_getNFTs. chia_mintNFT is gone entirely — the
    // browser never mints; WizNerdZ are pushed after settlement.
    requiredNamespaces: {
      chia: {
        methods: ["chia_takeOffer"],
        chains: ["chia:mainnet"],
        events: [],
      },
    },
    // Used opportunistically when a wallet offers them. Never a precondition.
    optionalNamespaces: {
      chia: {
        methods: [
          "chia_getCurrentAddress",
          "chia_getNextAddress",
          "chia_signMessageByAddress",
          "chia_getWallets",
          "chia_getNfts",
          "chia_getNFTs",
        ],
        chains: ["chia:mainnet"],
        events: [],
      },
    },
    metadata: {
      name: "WizNerdZ Pixel Paragon",
      description: "Mint generative pixel wizards on Chia — Fiend Studios",
      url: "https://flipthiscrypto.github.io/WizNerdZ-Pixel-Paragon/",
      icons: [
        "https://flipthiscrypto.github.io/WizNerdZ-Pixel-Paragon/assets/logo_mark.png",
      ],
    },
  },

  mint: {
    enabled: true,
    priceXch: 0.0000001, // live test price (100,000 mojos)
    mintgardenUrl: "",
    // Mint API root. /mint-offer dispenses a sealed box; /mint-status reports
    // what was actually delivered once the chain confirms it.
    apiBase: "https://wiznerdz-pixel-paragon.netlify.app/api",
    // Dispenses a SEALED BOX offer. Returns JSON, not raw offer text:
    // { tier, offer, boxNftId, priceXch, claimToken, sealed }
    offerUrl: "https://wiznerdz-pixel-paragon.netlify.app/api/mint-offer",
    tier: "blind_single",
  },
});
