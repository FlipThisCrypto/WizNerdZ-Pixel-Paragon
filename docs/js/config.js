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
    id: "wiznerdz-chia-gen1",
    seriesTotal: 8888,
    website: "https://flipthiscrypto.github.io/WizNerdZ-Pixel-Paragon/",
    twitter: "https://x.com/FiendStudios",
    github: "https://github.com/FlipThisCrypto/WizNerdZ-Pixel-Paragon",
    repoIssues: "https://github.com/FlipThisCrypto/WizNerdZ-Pixel-Paragon/issues/new",
    /** Collection art freezes after community 1:1 nominations close and are minted into the set. */
    collectionFrozen: false,
    statusMessage:
      "Baseline generative set is ready. Full collection freezes after community 1:1 PFPs are added (nominations open until deadline).",
  },

  /**
   * Community PFP nomination window (US Eastern).
   * Midnight end of July 31, 2026 = 2026-08-01T00:00:00 America/New_York (EDT = UTC−4)
   */
  nomination: {
    enabled: true,
    deadlineIsoEastern: "2026-08-01T00:00:00",
    deadlineUtc: "2026-08-01T04:00:00.000Z",
    timezone: "America/New_York",
    label: "Midnight July 31, 2026 (US Eastern / EDT)",
    pfpSlotsTarget: "Open — nominate Chia community members until the deadline",
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
   */
  mintSplits: {
    developer: {
      pct: 40,
      label: "Developer",
      address:
        "xch1qsclhhahfzs85xeemjye65yck2u6g9dpps0jtkwgjemzzndlu63qjej0te",
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
    requiredNamespaces: {
      chia: {
        methods: [
          "chia_getCurrentAddress",
          "chia_getWallets",
          "chia_getNextAddress",
          "chia_signMessageByAddress",
          "chia_takeOffer",
          "chia_getNfts",
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
    enabled: false,
    priceXch: null,
    mintgardenUrl: "",
    offerUrl: "",
    statusNote:
      "Mint arms after community 1:1 PFPs are locked into the set. Connect Sage anytime; takeOffer goes live when offers publish.",
  },
});
