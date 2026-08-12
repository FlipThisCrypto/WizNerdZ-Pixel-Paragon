/**
 * Atmosphere — the arcane space the whole reveal lives in.
 *
 * Three cheap layers that turn "flat black" into "somewhere":
 *   1. a deep nebula gradient with two slowly-breathing colour blooms
 *   2. drifting arcane embers (always present, low count)
 *   3. a CRT scanline + vignette overlay (pure CSS, on its own element)
 *
 * All GPU-friendly: one canvas at half-DPR (the nebula is soft, it does not need
 * crisp pixels) plus a static CSS overlay. Colours are the WizNerdZ class-triplet
 * purples and greens, not invented.
 */
(function () {
  const PURPLE = [139, 47, 232];   // #8b2fe8 arcane primary
  const MAGENTA = [255, 77, 255];  // #ff4dff arcane accent
  const GREEN = [40, 168, 56];     // #28a838 druid/warlock primary
  const LIME = [192, 255, 48];     // #c0ff30 necro accent

  class Atmosphere {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.t = 0;
      this.running = false;
      this.intensity = 0.35; // ambient by default; controller can raise it
      this.embers = [];
      this.mobile = window.matchMedia("(max-width: 767px)").matches;
      this._resize = this._resize.bind(this);
      this._resize();
      this._seedEmbers(this.mobile ? 14 : 26);
      window.addEventListener("resize", this._resize, { passive: true });
    }

    _resize() {
      // half-DPR: the nebula is a soft gradient, crispness is wasted here
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5) * 0.5;
      this.canvas.width = Math.max(2, Math.floor(window.innerWidth * dpr));
      this.canvas.height = Math.max(2, Math.floor(window.innerHeight * dpr));
      this.canvas.style.width = window.innerWidth + "px";
      this.canvas.style.height = window.innerHeight + "px";
      this.w = this.canvas.width;
      this.h = this.canvas.height;
    }

    _seedEmbers(n) {
      for (let i = 0; i < n; i++) {
        this.embers.push(this._newEmber(true));
      }
    }

    _newEmber(anywhere) {
      const green = Math.random() > 0.55;
      const c = green ? (Math.random() > 0.5 ? GREEN : LIME) : (Math.random() > 0.5 ? PURPLE : MAGENTA);
      return {
        x: Math.random() * window.innerWidth,
        y: anywhere ? Math.random() * window.innerHeight : window.innerHeight + 10,
        vy: -(0.15 + Math.random() * 0.4),
        vx: (Math.random() - 0.5) * 0.25,
        size: 1 + Math.floor(Math.random() * 2),
        life: anywhere ? Math.random() : 1,
        decay: 0.0015 + Math.random() * 0.002,
        c,
        tw: Math.random() * Math.PI * 2, // twinkle phase
      };
    }

    setIntensity(v) { this.intensity = Math.max(0, Math.min(1, v)); }

    start() {
      if (this.running) return;
      this.running = true;
      let last = performance.now();
      const tick = (now) => {
        if (!this.running) return;
        const dt = Math.min((now - last) / 16.67, 3);
        last = now;
        this.t += dt * 0.016;
        this._draw(dt);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    stop() { this.running = false; }

    _draw(dt) {
      const ctx = this.ctx;
      const w = this.w, h = this.h;
      ctx.clearRect(0, 0, w, h);

      // base void — deep arcane purple-black, never pure black
      ctx.fillStyle = "#0a0612";
      ctx.fillRect(0, 0, w, h);

      // two breathing colour blooms drifting on lissajous paths
      const I = 0.4 + this.intensity * 0.6;
      const b1x = w * (0.5 + 0.22 * Math.sin(this.t * 0.5));
      const b1y = h * (0.42 + 0.18 * Math.cos(this.t * 0.37));
      const b2x = w * (0.5 + 0.26 * Math.cos(this.t * 0.31));
      const b2y = h * (0.55 + 0.2 * Math.sin(this.t * 0.44));
      this._bloom(b1x, b1y, Math.max(w, h) * 0.55, PURPLE, 0.16 * I);
      this._bloom(b2x, b2y, Math.max(w, h) * 0.5, GREEN, 0.1 * I);
      this._bloom(w * 0.5, h * 0.48, Math.max(w, h) * 0.35, MAGENTA, 0.06 * I);

      // embers
      ctx.save();
      const scale = w / window.innerWidth; // canvas is half-DPR
      for (const e of this.embers) {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.tw += 0.05 * dt;
        e.life -= e.decay * dt;
        if (e.life <= 0 || e.y < -10) Object.assign(e, this._newEmber(false));
        const tw = 0.5 + 0.5 * Math.sin(e.tw);
        ctx.globalAlpha = Math.max(0, e.life) * tw * (0.5 + this.intensity * 0.5);
        ctx.fillStyle = `rgb(${e.c[0]},${e.c[1]},${e.c[2]})`;
        const s = e.size * scale;
        ctx.fillRect(Math.round(e.x * scale), Math.round(e.y * scale), Math.max(1, s), Math.max(1, s));
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    _bloom(x, y, r, rgb, alpha) {
      const ctx = this.ctx;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`);
      g.addColorStop(0.5, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * 0.35})`);
      g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.w, this.h);
    }

    destroy() {
      this.stop();
      window.removeEventListener("resize", this._resize);
    }
  }

  window.WizNerdzAtmosphere = Atmosphere;
})();
