/**
 * SummonController — orchestrates the whole sequence via the state machine.
 *
 * Sequence: spell_build -> consume_ui -> portal_open -> video -> summoning
 *           (-> legendary_interrupt) -> portal_collapse -> results
 *
 * Guarantees:
 *  - Animation NEVER determines blockchain truth. It receives a verified result.
 *  - Any thrown error routes to `error`, which still shows the results screen if
 *    we have NFT data. A broken animation must never cost someone their reveal.
 *  - prefers-reduced-motion skips straight to a calm results screen.
 */
(function () {
  const CFG = () => window.WIZNERDZ_REVEAL_CONFIG;

  class SummonController {
    constructor() {
      this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.machine = null;
      this.root = null;
      this.busy = false;
    }

    _buildDom() {
      const root = document.createElement("div");
      root.id = "wz-reveal-root";
      root.className = "wz-reveal-root";
      root.innerHTML = `
        <canvas class="wz-layer wz-layer--atmos" id="wz-atmos-canvas"></canvas>
        <canvas class="wz-layer wz-layer--spell" id="wz-spell-canvas"></canvas>
        <canvas class="wz-layer wz-layer--particles" id="wz-particle-canvas"></canvas>
        <div class="wz-layer wz-layer--video" id="wz-video-stage"></div>
        <div class="wz-layer wz-layer--stage" id="wz-stage"></div>
        <div class="wz-terminal" id="wz-terminal" aria-live="polite"></div>
        <div class="wz-crt" id="wz-crt" aria-hidden="true"></div>
        <div class="wz-veil" id="wz-veil"></div>
        <button type="button" class="wz-skip" id="wz-skip">SKIP ▸</button>
      `;
      document.body.appendChild(root);
      return root;
    }

    /**
     * Run the full reveal for an ALREADY-VERIFIED result.
     * @param {object} result - see mint-bridge.js for the contract
     */
    async reveal(result, { onDone } = {}) {
      if (this.busy) return;
      this.busy = true;

      const t = CFG().timing;
      const root = (this.root = this._buildDom());
      const veil = root.querySelector("#wz-veil");
      const stage = root.querySelector("#wz-stage");
      const videoStage = root.querySelector("#wz-video-stage");

      const atmos = new window.WizNerdzAtmosphere(root.querySelector("#wz-atmos-canvas"));
      const ps = new window.WizNerdzParticleSystem(root.querySelector("#wz-particle-canvas"));
      const spell = new window.WizNerdzSpellCircle(root.querySelector("#wz-spell-canvas"));
      const audio = new window.WizNerdzAudioController();
      const results = new window.WizNerdzSummonResults(root);
      const disintegration = new window.WizNerdzPixelDisintegration(ps);
      const video = new window.WizNerdzRevealVideo(videoStage);

      this.machine = new window.WizNerdzRevealStateMachine({
        onChange: (to) => {
          root.dataset.state = to;
          window.dispatchEvent(new CustomEvent("wiznerdz:reveal-state", { detail: { state: to } }));
        },
      });

      // Lock the page behind the overlay — scrolling mid-summon breaks the
      // illusion and, on mobile, fights the fixed layer.
      const scrollY = window.scrollY;
      document.body.classList.add("wz-dimmed");

      const finish = () => {
        this.busy = false;
        if (root._onEscSkip) {
          document.removeEventListener("keydown", root._onEscSkip);
          root._onEscSkip = null;
        }
        // The disintegration hid the page's own content (inline opacity 0) for
        // the summon. EVERY exit runs through here, so the page always comes
        // back — previously only the error path restored it, and a buyer who
        // paid and clicked CLOSE was left staring at a blank page.
        disintegration.restore();
        document.body.classList.remove("wz-dimmed");
        window.scrollTo(0, scrollY);
        atmos.destroy();
        spell.destroy();
        ps.destroy();
        video.destroy();
        if (onDone) onDone();
      };

      // Reduced motion: no assault, straight to the goods.
      if (this.reduced) {
        this.machine.forceTo("results");
        root.classList.add("wz-reveal-root--plain");
        results.render(result, {
          onAgain: () => { root.remove(); finish(); },
          onClose: () => { root.remove(); finish(); },
        });
        return;
      }

      // ---- skip: the ceremony is optional -------------------------------
      // ~15s of animation is a gift the first time and a toll the fifth.
      // Skip jumps through the same safe path the error handler already
      // proves out: kill the show, render the (idempotent) results.
      const doSkip = () => {
        if (root.dataset.state === "results" || root.dataset.state === "error") return;
        this.machine.forceTo("results");
        try { video.destroy(); } catch (_) {}
        veil.classList.remove("wz-veil--black");
        root.classList.add("wz-reveal-root--plain");
        spell.clear();
        ps.clear();
        results.render(result, {
          onAgain: () => { root.remove(); finish(); window.dispatchEvent(new CustomEvent("wiznerdz:summon-again")); },
          onClose: () => { root.remove(); finish(); },
        });
      };
      root.querySelector("#wz-skip")?.addEventListener("click", doSkip);
      const onEscSkip = (e) => {
        // pre-results Escape skips; the results dialog owns Escape after that
        if (e.key === "Escape" && root.dataset.state !== "results" && root.dataset.state !== "error") {
          e.preventDefault();
          doSkip();
        }
      };
      document.addEventListener("keydown", onEscSkip);
      root._onEscSkip = onEscSkip; // finish() removes this on every exit path

      audio.unlock();
      audio.preload(Object.values(CFG().audio.cues)).catch(() => {});
      atmos.start();
      ps.start();
      spell.start();

      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;

      try {
        // ---- PHASE 1: SUMMON — spark, then build the circle ---------------
        this.machine.go("transaction").go("spell_build");
        root.classList.add("wz-dim");
        audio.play(CFG().audio.cues.spark);
        ps.burst(cx, cy + 40, 26, { speed: 2.4 });
        video.preload(result); // rarity-selected; start fetching early so the black pause stays short

        await animate(t.spellBuild, (p) => {
          spell.setIntensity(easeOutCubic(p));
          atmos.setIntensity(0.35 + easeOutCubic(p) * 0.5);
          if (Math.random() < 0.16) ps.burst(cx, cy, 4, { speed: 1.6, glow: 8 });
        });
        audio.play(CFG().audio.cues.rune);

        // ---- PHASE 2: THE SPELL CONSUMES THE WEBSITE ----------------------
        this.machine.go("consume_ui");
        audio.play(CFG().audio.cues.buildup);
        await disintegration.run(cx, cy, t.consumeUi);

        // circle rushes the viewer; its dark core becomes the viewport
        this.machine.go("portal_open");
        audio.play(CFG().audio.cues.portal);
        await animate(t.portalExpand, (p) => {
          spell.setExpand(easeInCubic(p));
          spell.setIntensity(1);
        });
        veil.classList.add("wz-veil--black");
        spell.setExpand(0);
        spell.setIntensity(0);
        ps.clear();
        await wait(t.blackHold);

        // ---- PHASE 3: VIDEO MATERIALISES ---------------------------------
        this.machine.go("video_transition_in");
        this._terminal(CFG().terminal.channel);
        audio.play(CFG().audio.cues.crt);
        await video.materialise(t.crtLine);

        this.machine.go("video_playing");
        const outcome = await video.play(result, {
          onHandoff: () => {
            // PHASE 4: live spell takes over from the prerecorded ending
            spell.setIntensity(1);
            spell.start();
          },
        });

        if (this.machine.can("video_transition_out")) this.machine.go("video_transition_out");
        video.destroy();
        veil.classList.remove("wz-veil--black");

        if (outcome.failed) {
          // No video? Open the live portal directly — the summon still lands.
          spell.setIntensity(1);
          this._terminal(CFG().terminal.channel);
          await wait(t.portalSettle);
        }

        // ---- PHASE 5: SUMMON THE ACTUAL WIZNERDZ -------------------------
        this.machine.go("summoning");
        const summoner = new window.WizNerdzNFTSummon({
          stage, particles: ps, spell, audio, reduced: this.reduced,
        });
        const legendary = new window.WizNerdzLegendarySummon({
          root, stage, particles: ps, spell, audio, reduced: this.reduced,
        });
        stage.classList.add("wz-stage--active");

        atmos.setIntensity(0.85);
        await summoner.summonAll(result.nfts, {
          onLegendary: async (nft) => {
            this.machine.go("legendary_interrupt");
            spell.setLegendary(1);
            atmos.setIntensity(1);
            await legendary.run(nft);
            spell.setLegendary(0);
            atmos.setIntensity(0.85);
            this.machine.go("summoning");
          },
        });

        // ---- PHASE 6: COLLAPSE -> CLEAN RESULTS --------------------------
        this.machine.go("portal_collapse");
        audio.play(CFG().audio.cues.collapse);
        await animate(t.collapse, (p) => {
          spell.setIntensity(1 - p);
          spell.setExpand(0);
          spell.setUnstable(0);
          atmos.setIntensity(0.85 - p * 0.5);
        });
        ps.burst(cx, cy, 18, { speed: 1.2 });
        ps.clear();
        spell.clear();
        stage.classList.add("wz-stage--settled");

        this.machine.go("results");
        results.render(result, {
          onAgain: () => { root.remove(); finish(); window.dispatchEvent(new CustomEvent("wiznerdz:summon-again")); },
          onClose: () => { root.remove(); finish(); },
        });
      } catch (err) {
        // A broken animation must never cost the user their reveal.
        console.error("[reveal] sequence failed", err);
        this.machine.forceTo("error", { message: String(err && err.message) });
        disintegration.restore();
        veil.classList.remove("wz-veil--black");
        root.classList.add("wz-reveal-root--plain");
        spell.clear();
        ps.clear();
        this.machine.forceTo("results");
        results.render(result, {
          onAgain: () => { root.remove(); finish(); },
          onClose: () => { root.remove(); finish(); },
        });
      }
    }

    _terminal(text) {
      const el = document.querySelector("#wz-terminal");
      if (!el) return;
      el.textContent = text;
      el.classList.add("wz-terminal--show");
      setTimeout(() => el.classList.remove("wz-terminal--show"), 1500);
    }
  }

  function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }
  function animate(ms, onFrame) {
    return new Promise((resolve) => {
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - start) / ms);
        onFrame(p);
        if (p < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  }
  const easeOutCubic = (p) => 1 - Math.pow(1 - p, 3);
  const easeInCubic = (p) => p * p * p;

  window.WizNerdzSummonController = SummonController;
})();
