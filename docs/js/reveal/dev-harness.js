/**
 * Dev harness — iterate on the reveal without spending XCH.
 *
 * SAFETY: this only builds SIMULATED result objects for animation testing. It
 * cannot purchase, cannot mark anything sold, and cannot touch the chain. It is
 * gated behind an explicit opt-in (?dev=1 or localhost) so production visitors
 * never see it, and every simulated result is stamped `simulated: true` so it is
 * impossible to confuse with a verified mint.
 */
(function () {
  const QS = new URLSearchParams(location.search);
  const IS_LOCAL = ["localhost", "127.0.0.1", ""].includes(location.hostname);
  const ENABLED = QS.get("dev") === "1" || IS_LOCAL;
  if (!ENABLED) return;

  const RARITIES = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];
  const IMG_BASE = "images";

  function nft(id, opts = {}) {
    return Object.assign(
      {
        id,
        name: `WizNerd #${id}`,
        image: `${IMG_BASE}/${id}.png`,
        rarity: RARITIES[Math.floor(Math.random() * 3)],
        rarityRank: 1 + Math.floor(Math.random() * 8817),
        raritySeriesTotal: 8888,
        special: "Standard",
        isOneOfOne: false,
        tokenUrl: `token.html?id=${id}`,
      },
      opts
    );
  }

  function result(tier, nfts, extra = {}) {
    return Object.assign(
      {
        simulated: true,
        transactionId: null, // we do NOT invent chain data
        boxId: "DEV-SIMULATED",
        tier,
        tierLabel: (window.WIZNERDZ_TIER_LABELS || {})[tier] || tier,
        nfts,
      },
      extra
    );
  }

  const rnd = () => 1 + Math.floor(Math.random() * 8888);

  const SCENARIOS = {
    "1 normal": () => result("blind_single", [nft(rnd())]),
    "3 (elite)": () => result("elite", [nft(rnd(), { rarity: "Legendary" }), nft(rnd()), nft(rnd())]),
    "5 (standard)": () => result("standard_bundle", Array.from({ length: 5 }, () => nft(rnd()))),
    "9 large bundle": () => result("premium_named", Array.from({ length: 9 }, () => nft(rnd()))),
    "rare": () => result("rare", [nft(rnd(), { rarity: "Rare" })]),
    "high rarity": () => result("elite", [nft(rnd(), { rarity: "Legendary" })]),
    "1 of 1": () =>
      result("premium_named", [
        nft(42, { name: "Tom · WizNerdz #42", rarity: "1 of 1", special: "Named", isOneOfOne: true }),
      ]),
    "1/1 mid-bundle": () =>
      result("premium_named", [
        nft(rnd()),
        nft(rnd(), { rarity: "Epic" }),
        nft(787, { name: "Fiend · WizNerdz #787", rarity: "1 of 1", special: "Named", isOneOfOne: true }),
        nft(rnd()),
        nft(rnd()),
      ]),
    "video failure": () => {
      const r = result("blind_single", [nft(rnd())]);
      const cfg = window.WIZNERDZ_REVEAL_CONFIG;
      const orig = cfg.tiers.blind_single.video;
      cfg.tiers.blind_single = Object.assign({}, cfg.tiers.blind_single, { video: "__missing__.mp4" });
      setTimeout(() => { cfg.tiers.blind_single.video = orig; }, 30000);
      return r;
    },
    "image failure": () =>
      result("elite", [
        nft(rnd(), { image: "images/__missing__.png" }),
        nft(rnd(), { image: "images/__missing__.png" }),
      ]),
  };

  function panel() {
    const el = document.createElement("div");
    el.id = "wz-dev-panel";
    el.innerHTML = `
      <style>
        #wz-dev-panel{position:fixed;right:12px;bottom:12px;z-index:99999;background:#0a0c12;
          border:1px solid #6b3fa0;border-radius:12px;padding:10px;font:12px ui-monospace,monospace;
          color:#e8eef6;max-width:250px;box-shadow:0 8px 30px rgba(0,0,0,.6)}
        #wz-dev-panel h4{margin:0 0 8px;font-size:11px;letter-spacing:.16em;color:#c9a2ff}
        #wz-dev-panel button{display:block;width:100%;margin:3px 0;padding:6px 8px;background:#10141c;
          color:#e8eef6;border:1px solid #2a3f5f;border-radius:6px;cursor:pointer;text-align:left;font:inherit}
        #wz-dev-panel button:hover{border-color:#c9a2ff;background:#151a24}
        #wz-dev-panel .wz-dev-note{margin-top:8px;color:#5c6778;font-size:10px;line-height:1.4}
        #wz-dev-panel .wz-dev-close{position:absolute;top:6px;right:8px;width:auto;padding:0 4px;border:0;background:none;color:#5c6778}
      </style>
      <button class="wz-dev-close" title="hide">×</button>
      <h4>REVEAL DEV</h4>
      <div id="wz-dev-list"></div>
      <div class="wz-dev-note">Simulated animation data only.<br>No chain calls. No purchases.</div>
    `;
    document.body.appendChild(el);

    const list = el.querySelector("#wz-dev-list");
    Object.keys(SCENARIOS).forEach((name) => {
      const b = document.createElement("button");
      b.textContent = name;
      b.addEventListener("click", () => run(SCENARIOS[name]()));
      list.appendChild(b);
    });
    el.querySelector(".wz-dev-close").addEventListener("click", () => el.remove());
    return el;
  }

  function run(res) {
    const controller = new window.WizNerdzSummonController();
    controller.reveal(res);
  }

  window.WizNerdzDev = { SCENARIOS, run, nft, result };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", panel);
  } else {
    panel();
  }
})();
