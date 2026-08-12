/**
 * NFTSummon — each WizNerd emerges FROM the portal and POPs toward the viewer.
 *
 * Scale curve 20% -> 130% -> 95% -> 100% via CSS keyframes so it runs on the
 * compositor (GPU transform+opacity only, no layout thrash). Rarity escalates
 * buildup, particles and screen shake.
 *
 * LegendarySummon (1/1) lives in its own module because it interrupts rather
 * than decorates.
 */
(function () {
  const CFG = () => window.WIZNERDZ_REVEAL_CONFIG;

  function rarityClassOf(nft) {
    if (nft.isOneOfOne) return "one-of-one";
    const r = String(nft.rarity || "").toLowerCase();
    const c = CFG().rarity;
    if (c.high.some((x) => r.includes(x))) return "high";
    if (c.elevated.some((x) => r.includes(x))) return "elevated";
    if (c.slight.some((x) => r.includes(x))) return "slight";
    return "normal";
  }

  class NFTSummon {
    constructor({ stage, particles, spell, audio, reduced }) {
      this.stage = stage;
      this.ps = particles;
      this.spell = spell;
      this.audio = audio;
      this.reduced = reduced;
    }

    /** Timing compresses as bundles grow so 9 NFTs never drags. */
    scaleFor(count) {
      const { compactAbove, minScale } = CFG().pacing;
      if (count <= compactAbove) return 1;
      const over = count - compactAbove;
      return Math.max(minScale, 1 - over * 0.11);
    }

    async summonOne(nft, index, total) {
      const t = CFG().timing;
      const scale = this.scaleFor(total);
      const klass = rarityClassOf(nft);

      const card = document.createElement("figure");
      card.className = `wz-nft wz-nft--${klass}`;
      card.style.setProperty("--pop-ms", `${Math.round(t.popIn * scale)}ms`);

      const frame = document.createElement("div");
      frame.className = "wz-nft-frame";

      const img = document.createElement("img");
      img.alt = nft.name || `WizNerd #${nft.id}`;
      img.decoding = "async";
      img.loading = "eager";
      // Image failure must not break the summon — show a pixel-glyph placeholder.
      img.addEventListener("error", () => {
        card.classList.add("wz-nft--noimg");
        img.remove();
        const ph = document.createElement("div");
        ph.className = "wz-nft-placeholder";
        ph.textContent = `#${nft.id}`;
        frame.prepend(ph);
      }, { once: true });
      if (nft.image) img.src = nft.image;
      else img.dispatchEvent(new Event("error"));

      const cap = document.createElement("figcaption");
      cap.innerHTML =
        `<span class="wz-nft-name">${esc(nft.name || "WizNerd #" + nft.id)}</span>` +
        (nft.rarity ? `<span class="wz-nft-rarity">${esc(nft.rarity)}</span>` : "");

      frame.appendChild(img);
      card.appendChild(frame);
      card.appendChild(cap);
      this.stage.appendChild(card);

      // buildup scales with rarity — rare gets a longer wind-up
      if (!this.reduced) {
        if (klass === "high") {
          this.spell?.setUnstable(0.5);
          this._terminal(CFG().terminal.anomaly);
          this.audio?.play(CFG().audio.cues.rare);
          await wait(520 * scale);
        } else if (klass === "elevated") {
          this.spell?.setUnstable(0.22);
          await wait(260 * scale);
        }
      }

      // light rays + aura appear a beat BEFORE the card, so the NFT emerges
      // from a burst of light rather than just appearing
      const AURA = {
        normal: "#8b2fe8", slight: "#c060ff", elevated: "#c0ff30",
        high: "#ffd479", "one-of-one": "#ffd479",
      };
      const aura = AURA[klass] || "#8b2fe8";
      card.style.setProperty("--aura", aura);

      if (!this.reduced) {
        const pre = card.getBoundingClientRect();
        const rx = pre.left + pre.width / 2;
        const ry = pre.top + pre.height / 2;
        const rayN = { normal: 8, slight: 10, elevated: 14, high: 20, "one-of-one": 28 }[klass] || 8;
        this.ps.rays(rx, ry, rayN, { color: aura, len: pre.width * 0.6, reach: 6 });
      }

      card.classList.add("wz-nft--pop");
      this.audio?.play(CFG().audio.cues.pop, { rate: 0.94 + Math.random() * 0.12 });

      if (!this.reduced) {
        const r = card.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        // shockwave lands with the POP peak (~55% of the pop keyframe)
        const t2 = CFG().timing;
        setTimeout(() => {
          this.ps.shockwave(cx, cy, { color: aura, grow: 11, width: 3, r0: r.width * 0.3 });
          const counts = { normal: 30, slight: 44, elevated: 66, high: 104, "one-of-one": 150 };
          this.ps.burst(cx, cy, counts[klass] || 30, {
            speed: klass === "high" || klass === "one-of-one" ? 7 : 4.5,
            color: aura, glow: 10,
          });
          if (klass === "high" || klass === "one-of-one") this._shake(12);
          else if (klass === "elevated") this._shake(6);
        }, t2.popIn * this.scaleFor(total) * 0.5);
      }

      await wait((t.popIn + t.popGap) * scale);
      this.spell?.setUnstable(0);
      return card;
    }

    async summonAll(nfts, { onLegendary } = {}) {
      const cards = [];
      for (let i = 0; i < nfts.length; i++) {
        const nft = nfts[i];
        if (nft.isOneOfOne && onLegendary) {
          // 1/1 interrupts the rhythm entirely, then the bundle resumes
          await onLegendary(nft, i, nfts.length);
        }
        cards.push(await this.summonOne(nft, i, nfts.length));
      }
      return cards;
    }

    _shake(px) {
      document.documentElement.style.setProperty("--wz-shake", px + "px");
      document.body.classList.add("wz-shaking");
      setTimeout(() => document.body.classList.remove("wz-shaking"), 340);
    }

    _terminal(text) {
      const el = document.querySelector("#wz-terminal");
      if (!el) return;
      el.textContent = text;
      el.classList.add("wz-terminal--show");
      setTimeout(() => el.classList.remove("wz-terminal--show"), 1400);
    }
  }

  function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  window.WizNerdzNFTSummon = NFTSummon;
  window.WizNerdzRarityClass = rarityClassOf;
})();
