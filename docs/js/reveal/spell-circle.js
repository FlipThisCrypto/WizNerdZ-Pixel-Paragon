/**
 * SpellCircle — the signature element. An ancient magic circle drawn by a
 * computer: glowing concentric rings, sacred geometry, orbiting rune sigils, a
 * breathing energy core, a sweeping scan beam, and a vortex that opens into the
 * portal.
 *
 * This is where the reveal spends its boldness, so it is the most detailed
 * module. Everything else stays quiet around it.
 *
 * Bloom is real: layered additive strokes + canvas shadowBlur. Colours are the
 * WizNerdZ class-triplet purples and greens (see PALETTE.md), never invented.
 *
 * It also serves as the LIVE portal the prerecorded video hands off to, so its
 * closing geometry is documented in REVEAL_VIDEO_SPEC.md and must stay stable.
 */
(function () {
  const CFG = () => window.WIZNERDZ_REVEAL_CONFIG;

  const PURPLE = "#8b2fe8";
  const MAGENTA = "#ff4dff";
  const GREEN = "#28a838";
  const LIME = "#c0ff30";
  const CORE = "#e8c0ff";

  class SpellCircle {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.t = 0;
      this.intensity = 0;
      this.expand = 0;
      this.unstable = 0;
      this.legendary = 0; // 0..1 shifts palette to gold
      this.running = false;
      this.rings = this._buildRings();
      this.wisps = this._buildWisps();
      this._resize = this._resize.bind(this);
      this._resize();
      window.addEventListener("resize", this._resize, { passive: true });
    }

    _resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.floor(window.innerWidth * dpr);
      this.canvas.height = Math.floor(window.innerHeight * dpr);
      this.canvas.style.width = window.innerWidth + "px";
      this.canvas.style.height = window.innerHeight + "px";
      this.dpr = dpr;
      this.cx = window.innerWidth / 2;
      this.cy = window.innerHeight / 2;
      this.baseR = Math.min(window.innerWidth, window.innerHeight) * 0.3;
    }

    _buildRings() {
      const g = CFG().glyphs;
      const pick = () => g[Math.floor(Math.random() * g.length)];
      return [
        { r: 1.0, n: 30, speed: 0.1, dir: 1, size: 14, glyphs: Array.from({ length: 30 }, pick) },
        { r: 0.82, n: 20, speed: -0.16, dir: -1, size: 12, glyphs: Array.from({ length: 20 }, pick) },
        { r: 0.62, n: 14, speed: 0.26, dir: 1, size: 11, glyphs: Array.from({ length: 14 }, pick) },
        { r: 0.42, n: 9, speed: -0.4, dir: -1, size: 10, glyphs: Array.from({ length: 9 }, pick) },
      ];
    }

    _buildWisps() {
      // energy wisps that spiral into the vortex core
      return Array.from({ length: 12 }, (_, i) => ({
        a: (i / 12) * Math.PI * 2,
        r: 0.3 + Math.random() * 0.5,
        speed: 0.6 + Math.random() * 0.8,
        green: Math.random() > 0.5,
      }));
    }

    setIntensity(v) { this.intensity = Math.max(0, Math.min(1, v)); }
    setExpand(v) { this.expand = Math.max(0, Math.min(1, v)); }
    setUnstable(v) { this.unstable = Math.max(0, Math.min(1, v)); }
    setLegendary(v) { this.legendary = Math.max(0, Math.min(1, v)); }

    _pal(green) {
      // blend toward gold when legendary
      if (this.legendary > 0) {
        return green
          ? this._mix(LIME, "#ffe07a", this.legendary)
          : this._mix(MAGENTA, "#ffb020", this.legendary);
      }
      return green ? (Math.random() > 0.5 ? GREEN : LIME) : (Math.random() > 0.5 ? PURPLE : MAGENTA);
    }

    _mix(a, b, t) {
      const pa = this._hex(a), pb = this._hex(b);
      const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
      return `rgb(${c[0]},${c[1]},${c[2]})`;
    }
    _hex(h) {
      const n = parseInt(h.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    start() {
      if (this.running) return;
      this.running = true;
      let last = performance.now();
      const tick = (now) => {
        if (!this.running) return;
        const dt = Math.min((now - last) / 1000, 0.1);
        last = now;
        this.t += dt;
        this._draw(dt);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    stop() { this.running = false; }
    clear() { this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); }

    _draw(dt) {
      const ctx = this.ctx;
      const d = this.dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      if (this.intensity <= 0 && this.expand <= 0) return;

      const jitter = this.unstable * 7;
      const cx = (this.cx + (Math.random() - 0.5) * jitter) * d;
      const cy = (this.cy + (Math.random() - 0.5) * jitter) * d;
      const scale = (1 + this.expand * 7) * d;
      const R = this.baseR;
      const I = this.intensity;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.globalCompositeOperation = "lighter"; // additive glow stacking

      // ---- vortex core: depth rings + spiralling wisps + bright rim ------
      this._drawCore(ctx, R, scale, I);

      // ---- sacred geometry: rotating hexagram + inner triangle ----------
      if (I > 0.35) this._drawGeometry(ctx, R, scale, I);

      // ---- rings + orbiting rune sigils ---------------------------------
      for (let i = 0; i < this.rings.length; i++) {
        const ring = this.rings[i];
        const gate = i / this.rings.length;
        if (I < gate * 0.8) continue;
        const local = Math.min(1, (I - gate * 0.8) / 0.3);
        const rr = R * ring.r * scale;
        const rot = this.t * ring.speed + this.unstable * Math.sin(this.t * 22) * 0.25;
        const col = i % 2 ? this._legend(GREEN, LIME) : this._legend(PURPLE, MAGENTA);

        // glowing ring — draw twice: wide soft halo, then crisp core
        ctx.strokeStyle = col;
        ctx.shadowColor = col;
        ctx.shadowBlur = 18 * d * (0.4 + I);
        ctx.globalAlpha = local * (0.3 + I * 0.5);
        ctx.lineWidth = Math.max(1, (2.4 + I * 1.6) * d);
        ctx.beginPath();
        ctx.arc(0, 0, rr, 0, Math.PI * 2);
        ctx.stroke();

        // radial spokes tying rings together (machinery feel)
        if (i < 2 && I > 0.55) {
          ctx.globalAlpha = local * 0.18;
          ctx.lineWidth = Math.max(1, d);
          for (let s = 0; s < ring.n; s += 2) {
            const a = rot * ring.dir + (s / ring.n) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * rr * 0.72, Math.sin(a) * rr * 0.72);
            ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
            ctx.stroke();
          }
        }

        // orbiting glyphs — larger, glowing, flickering
        const shown = Math.ceil(ring.n * local);
        ctx.font = `${Math.round(ring.size * scale * 0.95)}px ui-monospace, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (let k = 0; k < shown; k++) {
          const a = rot * ring.dir + (k / ring.n) * Math.PI * 2;
          const gx = Math.cos(a) * rr;
          const gy = Math.sin(a) * rr;
          const flick = 0.5 + 0.5 * Math.sin(this.t * 6 + k * 1.7);
          ctx.fillStyle = col;
          ctx.shadowColor = col;
          ctx.shadowBlur = 12 * d;
          ctx.globalAlpha = local * (0.55 + flick * 0.45);
          ctx.save();
          ctx.translate(Math.round(gx), Math.round(gy));
          ctx.rotate(a + Math.PI / 2); // glyphs face outward along the ring
          ctx.fillText(ring.glyphs[k], 0, 0);
          ctx.restore();
        }
      }
      ctx.shadowBlur = 0;

      // ---- sweeping scan beam (radar sweep of arcane light) -------------
      if (I > 0.5 && this.expand < 0.3) this._drawSweep(ctx, R, scale, I);

      // ---- lightning ----------------------------------------------------
      const bolts = Math.floor(I * 3 + this.unstable * 6);
      for (let b = 0; b < bolts; b++) {
        if (Math.random() > 0.3) continue;
        this._drawBolt(ctx, R, scale, d);
      }

      ctx.restore();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }

    _legend(base, alt) {
      if (this.legendary > 0.01) {
        return base === GREEN
          ? this._mix(alt, "#ffe07a", this.legendary)
          : this._mix(alt, "#ffb020", this.legendary);
      }
      return Math.random() > 0.5 ? base : alt;
    }

    _drawCore(ctx, R, scale, I) {
      const coreR = R * 0.4 * scale;
      // dark well
      const well = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
      well.addColorStop(0, "rgba(2,3,8,1)");
      well.addColorStop(0.6, "rgba(6,3,18,0.9)");
      well.addColorStop(1, "rgba(6,3,18,0)");
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.fillStyle = well;
      ctx.beginPath();
      ctx.arc(0, 0, coreR, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "lighter";

      // spiralling wisps into the vortex
      ctx.lineWidth = Math.max(1, 1.5 * this.dpr);
      for (const wsp of this.wisps) {
        const a = wsp.a + this.t * wsp.speed;
        const col = this._legend(wsp.green ? GREEN : PURPLE, wsp.green ? LIME : MAGENTA);
        ctx.strokeStyle = col;
        ctx.shadowColor = col;
        ctx.shadowBlur = 10 * this.dpr;
        ctx.globalAlpha = 0.3 + I * 0.4;
        ctx.beginPath();
        for (let s = 0; s <= 10; s++) {
          const f = s / 10;
          const rr = coreR * (0.15 + wsp.r * (1 - f) * 0.9);
          const aa = a + f * 2.4; // spiral
          const x = Math.cos(aa) * rr, y = Math.sin(aa) * rr;
          s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // breathing bright core
      const pulse = 0.6 + 0.4 * Math.sin(this.t * 3.2);
      const cr = coreR * 0.16 * (0.8 + pulse * 0.4);
      const core = ctx.createRadialGradient(0, 0, 0, 0, 0, cr * 3);
      const cc = this.legendary > 0.5 ? "255,224,122" : "232,192,255";
      core.addColorStop(0, `rgba(${cc},${(0.5 + I * 0.5) * pulse})`);
      core.addColorStop(0.4, `rgba(${cc},${0.25 * pulse})`);
      core.addColorStop(1, `rgba(${cc},0)`);
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(0, 0, cr * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    _drawGeometry(ctx, R, scale, I) {
      const gr = R * 0.72 * scale;
      const rot = this.t * 0.08;
      const col = this._legend(PURPLE, MAGENTA);
      ctx.strokeStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 14 * this.dpr;
      ctx.globalAlpha = (I - 0.35) * 0.5;
      ctx.lineWidth = Math.max(1, 1.4 * this.dpr);
      // two overlaid triangles = hexagram
      for (let tri = 0; tri < 2; tri++) {
        ctx.beginPath();
        for (let p = 0; p <= 3; p++) {
          const a = rot + tri * Math.PI + (p / 3) * Math.PI * 2;
          const x = Math.cos(a) * gr, y = Math.sin(a) * gr;
          p === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      // inner counter-rotating square
      const sr = R * 0.5 * scale;
      const srot = -this.t * 0.12;
      const col2 = this._legend(GREEN, LIME);
      ctx.strokeStyle = col2;
      ctx.shadowColor = col2;
      ctx.beginPath();
      for (let p = 0; p <= 4; p++) {
        const a = srot + (p / 4) * Math.PI * 2 + Math.PI / 4;
        const x = Math.cos(a) * sr, y = Math.sin(a) * sr;
        p === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    _drawSweep(ctx, R, scale, I) {
      const a = this.t * 1.1;
      const rr = R * 1.0 * scale;
      const grad = ctx.createLinearGradient(0, 0, Math.cos(a) * rr, Math.sin(a) * rr);
      const cc = this.legendary > 0.5 ? "255,224,122" : "157,255,176";
      grad.addColorStop(0, `rgba(${cc},0)`);
      grad.addColorStop(1, `rgba(${cc},${0.25 * I})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.max(1, 2 * this.dpr);
      ctx.shadowColor = `rgb(${cc})`;
      ctx.shadowBlur = 20 * this.dpr;
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    _drawBolt(ctx, R, scale, d) {
      const col = this._legend(PURPLE, MAGENTA);
      ctx.globalAlpha = 0.4 + Math.random() * 0.5;
      ctx.strokeStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 12 * d;
      ctx.lineWidth = Math.max(1, d);
      ctx.beginPath();
      let a = Math.random() * Math.PI * 2;
      let rr = R * 0.3 * scale;
      ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      for (let s = 0; s < 5; s++) {
        a += (Math.random() - 0.5) * 0.7;
        rr += R * 0.16 * scale * Math.random();
        ctx.lineTo(Math.round(Math.cos(a) * rr), Math.round(Math.sin(a) * rr));
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    destroy() {
      this.stop();
      window.removeEventListener("resize", this._resize);
    }
  }

  window.WizNerdzSpellCircle = SpellCircle;
})();
