/**
 * PixelDisintegration — the page breaks into pixels and gets pulled into the portal.
 *
 * Approach: we do NOT screenshot the DOM (html2canvas is heavy and taints on
 * cross-origin images). Instead we walk visible elements, sample their bounding
 * boxes into a grid of coloured squares, spawn those as particles, then hide the
 * real element. Cheap, framework-free, and it reads exactly right because the
 * site is already flat-coloured panels and text.
 */
(function () {
  const CFG = () => window.WIZNERDZ_REVEAL_CONFIG;

  class PixelDisintegration {
    constructor(particleSystem) {
      this.ps = particleSystem;
      this.hidden = [];
      this.mobile = window.matchMedia("(max-width: 767px)").matches;
    }

    /** Elements worth shattering: visible, on-screen, not our own overlay. */
    _targets(root) {
      const sel = "h1,h2,h3,p,a,button,img,li,span,td,th,code,.chip,.card,.panel,.sealed-card";
      const out = [];
      root.querySelectorAll(sel).forEach((el) => {
        if (el.closest("#wz-reveal-root")) return;
        const r = el.getBoundingClientRect();
        if (r.width < 6 || r.height < 6) return;
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        if (getComputedStyle(el).visibility === "hidden") return;
        out.push({ el, rect: r });
      });
      return out;
    }

    _colorOf(el) {
      const cs = getComputedStyle(el);
      const bg = cs.backgroundColor;
      if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return bg;
      return cs.color || "#8b96a8";
    }

    /**
     * Shatter the page toward (cx, cy). Returns when all elements are hidden.
     * `progress` 0..1 controls how much of the page has gone.
     */
    run(cx, cy, durationMs, root = document.body) {
      const targets = this._targets(root);
      // shatter from the outside in, so the page collapses toward the portal
      targets.sort((a, b) => {
        const da = Math.hypot(a.rect.left + a.rect.width / 2 - cx, a.rect.top + a.rect.height / 2 - cy);
        const db = Math.hypot(b.rect.left + b.rect.width / 2 - cx, b.rect.top + b.rect.height / 2 - cy);
        return db - da;
      });

      const step = this.mobile
        ? CFG().particles.sampleStepMobile
        : CFG().particles.sampleStepDesktop;

      return new Promise((resolve) => {
        const start = performance.now();
        let idx = 0;
        const tick = (now) => {
          const p = Math.min(1, (now - start) / durationMs);
          const want = Math.floor(p * targets.length);
          while (idx < want && idx < targets.length) {
            this._shatter(targets[idx], cx, cy, step);
            idx++;
          }
          if (p < 1) requestAnimationFrame(tick);
          else {
            while (idx < targets.length) { this._shatter(targets[idx], cx, cy, step); idx++; }
            resolve();
          }
        };
        requestAnimationFrame(tick);
      });
    }

    _shatter({ el, rect }, cx, cy, step) {
      const color = this._colorOf(el);
      const cols = Math.max(1, Math.floor(rect.width / step));
      const rows = Math.max(1, Math.floor(rect.height / step));
      const cap = 34; // per-element particle cap keeps big panels affordable
      let made = 0;
      for (let r = 0; r < rows && made < cap; r++) {
        for (let c = 0; c < cols && made < cap; c++) {
          const x = rect.left + c * step + step / 2;
          const y = rect.top + r * step + step / 2;
          this.ps.spawn({
            x, y,
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5 - 0.5,
            size: Math.max(2, Math.floor(step * 0.45)),
            color,
            decay: 0.006 + Math.random() * 0.006,
            drag: 0.99,
            targetX: cx, targetY: cy,
            pull: 0.22 + Math.random() * 0.25, // sucked toward the portal
          });
          made++;
        }
      }
      el.style.transition = "opacity 160ms linear";
      el.style.opacity = "0";
      this.hidden.push(el);
    }

    /** Restore the page (used on abort / error recovery). */
    restore() {
      for (const el of this.hidden) {
        el.style.opacity = "";
        el.style.transition = "";
      }
      this.hidden.length = 0;
    }
  }

  window.WizNerdzPixelDisintegration = PixelDisintegration;
})();
