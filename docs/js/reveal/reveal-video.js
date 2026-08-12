/**
 * RevealVideo — CRT-line materialisation, playback, and hand-off to the live spell.
 *
 * Deliberately NOT a <video> with controls: no controls attr, playsinline,
 * muted (autoplay policy), pointer-events none. The user should never identify
 * where the site ended and the video began.
 *
 * Hand-off (Phase 4): `handoff` seconds before the end we start cross-fading the
 * video out while the live SpellCircle fades in at matching intensity. If the
 * video's final frames are authored per REVEAL_VIDEO_SPEC.md, the seam is
 * invisible. If they are not, it still reads as a dissolve rather than a cut.
 *
 * Every failure path (missing file, decode error, autoplay refusal, slow load)
 * resolves rather than rejects — the summon must continue to the real NFTs.
 */
(function () {
  const CFG = () => window.WIZNERDZ_REVEAL_CONFIG;

  class RevealVideo {
    constructor(container) {
      this.container = container;
      this.video = null;
      this.failed = false;
      this.reason = null;
    }

    _src(tierId) {
      const cfg = CFG();
      const tier = cfg.tiers[tierId] || cfg.tiers[cfg.fallbackTier];
      return { url: `${cfg.videoBase}/${tier.video}`, handoff: tier.handoff };
    }

    /** Preload as early as possible so the black pause is genuinely short. */
    preload(tierId) {
      const { url } = this._src(tierId);
      const v = document.createElement("video");
      v.className = "wz-reveal-video";
      v.src = url;
      v.preload = "auto";
      v.muted = true;
      v.playsInline = true;
      v.setAttribute("playsinline", "");
      v.setAttribute("webkit-playsinline", "");
      v.setAttribute("aria-hidden", "true");
      v.tabIndex = -1;
      this.video = v;
      this.container.appendChild(v);
      return v;
    }

    /** CRT line: thin horizontal sliver that flickers then opens vertically. */
    async materialise(crtMs) {
      const line = document.createElement("div");
      line.className = "wz-crt-line";
      this.container.appendChild(line);
      await raf();
      line.classList.add("wz-crt-flicker");
      await wait(crtMs * 0.45);
      line.classList.add("wz-crt-open");
      await wait(crtMs * 0.55);
      line.remove();
    }

    /**
     * Play through, resolving when the hand-off window starts.
     * Resolves `{ handedOff: bool, failed: bool }` — never rejects.
     */
    play(tierId, { onHandoff } = {}) {
      const { handoff } = this._src(tierId);
      const v = this.video;
      return new Promise((resolve) => {
        if (!v) return resolve({ failed: true, reason: "no-video-element" });

        let settled = false;
        const done = (r) => { if (!settled) { settled = true; resolve(r); } };

        // Missing/unsupported asset, or the network is having a bad day.
        v.addEventListener("error", () => {
          this.failed = true;
          this.reason = "load-error";
          done({ failed: true, reason: "load-error" });
        }, { once: true });

        // Never hang the summon on a slow video.
        const guard = setTimeout(() => {
          if (v.readyState < 2) {
            this.failed = true;
            this.reason = "timeout";
            done({ failed: true, reason: "timeout" });
          }
        }, 9000);

        let handedOff = false;
        v.addEventListener("timeupdate", () => {
          if (handedOff || !v.duration || !isFinite(v.duration)) return;
          if (v.currentTime >= v.duration - handoff) {
            handedOff = true;
            if (onHandoff) onHandoff();
            // fade the video out over exactly the configured hand-off window so
            // the dissolve matches the live spell's fade-in
            v.style.setProperty("--wz-handoff-ms", `${Math.round(handoff * 1000)}ms`);
            v.classList.add("wz-video-handoff");
            setTimeout(() => done({ handedOff: true, failed: false }), handoff * 1000);
          }
        });

        v.addEventListener("ended", () => {
          clearTimeout(guard);
          done({ handedOff, failed: false });
        }, { once: true });

        v.addEventListener("playing", () => {
          clearTimeout(guard);
          v.classList.add("wz-video-live");
        }, { once: true });

        const p = v.play();
        if (p && p.catch) {
          p.catch(() => {
            // Autoplay blocked despite muted — skip video, keep the summon.
            this.failed = true;
            this.reason = "autoplay-blocked";
            done({ failed: true, reason: "autoplay-blocked" });
          });
        }
      });
    }

    destroy() {
      if (this.video) {
        try { this.video.pause(); } catch (_) {}
        this.video.removeAttribute("src");
        this.video.remove();
        this.video = null;
      }
    }
  }

  function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }
  function raf() { return new Promise((r) => requestAnimationFrame(() => r())); }

  window.WizNerdzRevealVideo = RevealVideo;
})();
