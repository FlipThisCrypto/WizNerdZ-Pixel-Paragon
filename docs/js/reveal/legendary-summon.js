/**
 * LegendarySummon — the 1/1 interrupt.
 *
 * This deliberately breaks the established rhythm: everything freezes, audio
 * cuts, the screen goes near-black, and a bare terminal cursor types two lines
 * before the spell destabilises and the 1/1 detonates onto the screen.
 *
 * It must feel like the system encountered something it did not expect.
 */
(function () {
  const CFG = () => window.WIZNERDZ_REVEAL_CONFIG;

  class LegendarySummon {
    constructor({ root, stage, particles, spell, audio, reduced }) {
      this.root = root;
      this.stage = stage;
      this.ps = particles;
      this.spell = spell;
      this.audio = audio;
      this.reduced = reduced;
    }

    async run(nft) {
      const T = CFG().terminal;
      const t = CFG().timing;

      if (this.reduced) {
        // Reduced motion: keep the narrative beat, drop the assault.
        const panel = this._panel();
        panel.innerHTML = `<p class="wz-leg-line">${T.unknown}</p><p class="wz-leg-line">${T.legendary}</p>`;
        await wait(900);
        panel.remove();
        return;
      }

      // 1. everything stops
      this.root.classList.add("wz-freeze");
      this.audio?.stopAll();
      this.ps.clear();
      this.spell?.setIntensity(0);
      this.spell?.setExpand(0);
      await wait(t.legendaryFreeze * 0.45);

      // 2. near-black + blinking cursor
      const panel = this._panel();
      const cursor = document.createElement("span");
      cursor.className = "wz-cursor";
      cursor.textContent = "_";
      panel.appendChild(cursor);
      await wait(t.legendaryFreeze * 0.55);

      // 3. two lines, typed
      this.audio?.resume();
      this.audio?.play(CFG().audio.cues.legendaryWarn);
      await this._type(panel, T.unknown, cursor);
      await wait(t.legendaryLines * 0.55);
      await this._type(panel, T.shouldNotBeHere, cursor);
      await wait(260);

      // 4. glitch — the spell system loses containment
      this.root.classList.add("wz-glitch");
      this.spell?.setUnstable(1);
      this.spell?.setIntensity(1);
      this.audio?.play(CFG().audio.cues.legendaryImpact);
      for (let i = 0; i < 5; i++) {
        this.ps.burst(window.innerWidth / 2, window.innerHeight / 2, 60, { speed: 9, color: "#ffd479" });
        await wait(70);
      }
      this.root.classList.remove("wz-freeze");
      panel.remove();
      this.root.classList.remove("wz-glitch");

      // 5. the banner — this is the screenshot moment
      const banner = document.createElement("div");
      banner.className = "wz-legendary-banner";
      banner.textContent = CFG().terminal.legendary;
      this.stage.appendChild(banner);
      requestAnimationFrame(() => banner.classList.add("wz-legendary-banner--in"));
      this._shake(16);
      await wait(1100);
      banner.classList.remove("wz-legendary-banner--in");
      setTimeout(() => banner.remove(), 600);
      this.spell?.setUnstable(0.25);
    }

    _panel() {
      const p = document.createElement("div");
      p.className = "wz-legendary-panel";
      this.root.appendChild(p);
      return p;
    }

    async _type(panel, text, cursor) {
      const line = document.createElement("p");
      line.className = "wz-leg-line";
      panel.insertBefore(line, cursor);
      for (let i = 0; i < text.length; i++) {
        line.textContent += text[i];
        await wait(26);
      }
    }

    _shake(px) {
      document.documentElement.style.setProperty("--wz-shake", px + "px");
      document.body.classList.add("wz-shaking");
      setTimeout(() => document.body.classList.remove("wz-shaking"), 520);
    }
  }

  function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }
  window.WizNerdzLegendarySummon = LegendarySummon;
})();
