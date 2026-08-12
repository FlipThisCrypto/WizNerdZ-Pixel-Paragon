/**
 * Shared pixel particle system — one canvas, one RAF loop, reused by the spell
 * circle, disintegration, POPs and the collapse.
 *
 * Deliberately plain 2D canvas with integer-snapped rects: the art is pixel art,
 * so crisp squares are correct AND cheap. No WebGL — it would not materially
 * improve square particles and would cost compatibility.
 */
(function () {
  const CFG = () => window.WIZNERDZ_REVEAL_CONFIG;

  class ParticleSystem {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d", { alpha: true });
      this.particles = [];
      this.running = false;
      this.raf = 0;
      this.lastT = 0;
      this.mobile = window.matchMedia("(max-width: 767px)").matches;
      this.max = this.mobile ? CFG().particles.maxMobile : CFG().particles.maxDesktop;
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
    }

    spawn(opts) {
      if (this.particles.length >= this.max) {
        // drop oldest rather than unbounded growth
        this.particles.shift();
      }
      this.particles.push(
        Object.assign(
          {
            x: 0, y: 0, vx: 0, vy: 0, life: 1, decay: 0.02,
            size: 3, color: "#c9a2ff", gravity: 0, drag: 0.98,
            targetX: null, targetY: null, pull: 0,
          },
          opts
        )
      );
    }

    burst(x, y, count, opts = {}) {
      const n = Math.min(count, this.max - this.particles.length);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = (opts.speed || 3) * (0.35 + Math.random());
        this.spawn(
          Object.assign(
            {
              x, y,
              vx: Math.cos(a) * sp,
              vy: Math.sin(a) * sp,
              size: 2 + Math.floor(Math.random() * 3),
              decay: 0.015 + Math.random() * 0.02,
              color: opts.color || (Math.random() > 0.5 ? "#c9a2ff" : "#9dffb0"),
              glow: opts.glow != null ? opts.glow : 8,
            },
            opts.overrides || {}
          )
        );
      }
    }

    /** Expanding shockwave ring — the impact of a POP. */
    shockwave(x, y, opts = {}) {
      this.particles.push({
        kind: "ring",
        x, y, r: opts.r0 || 6,
        grow: opts.grow || 9,
        life: 1, decay: opts.decay || 0.045,
        color: opts.color || "#c9a2ff",
        width: opts.width || 3,
        vx: 0, vy: 0, gravity: 0, drag: 1, pull: 0, targetX: null,
      });
    }

    /** Radiating light rays behind an emerging NFT — a conic burst. */
    rays(x, y, n, opts = {}) {
      const base = Math.random() * Math.PI;
      for (let i = 0; i < n; i++) {
        const a = base + (i / n) * Math.PI * 2;
        this.particles.push({
          kind: "ray",
          x, y, a,
          len: (opts.len || 40) * (0.6 + Math.random() * 0.8),
          reach: opts.reach || 4,
          life: 1, decay: opts.decay || 0.05,
          color: opts.color || "#e8c0ff",
          width: opts.width || 2,
          vx: 0, vy: 0, gravity: 0, drag: 1, pull: 0, targetX: null,
        });
      }
    }

    start() {
      if (this.running) return;
      this.running = true;
      this.lastT = performance.now();
      const tick = (t) => {
        if (!this.running) return;
        const dt = Math.min((t - this.lastT) / 16.67, 3);
        this.lastT = t;
        this._step(dt);
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    }

    stop() {
      this.running = false;
      cancelAnimationFrame(this.raf);
    }

    clear() {
      this.particles.length = 0;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    _step(dt) {
      const ctx = this.ctx;
      const d = this.dpr;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.globalCompositeOperation = "lighter"; // additive — particles glow
      const alive = [];
      for (const p of this.particles) {
        if (p.kind === "ring") {
          p.r += p.grow * dt;
          p.life -= p.decay * dt;
          if (p.life > 0) {
            ctx.globalAlpha = Math.max(0, p.life) * 0.8;
            ctx.strokeStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 12 * d;
            ctx.lineWidth = Math.max(1, p.width * d * p.life);
            ctx.beginPath();
            ctx.arc(p.x * d, p.y * d, p.r * d, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            alive.push(p);
          }
          continue;
        }
        if (p.kind === "ray") {
          p.len += p.reach * dt;
          p.life -= p.decay * dt;
          if (p.life > 0) {
            const x0 = p.x * d, y0 = p.y * d;
            const x1 = (p.x + Math.cos(p.a) * p.len) * d;
            const y1 = (p.y + Math.sin(p.a) * p.len) * d;
            const g = ctx.createLinearGradient(x0, y0, x1, y1);
            g.addColorStop(0, p.color);
            g.addColorStop(1, "rgba(0,0,0,0)");
            ctx.globalAlpha = Math.max(0, p.life) * 0.7;
            ctx.strokeStyle = g;
            ctx.lineWidth = Math.max(1, p.width * d);
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.stroke();
            alive.push(p);
          }
          continue;
        }
        if (p.pull && p.targetX != null) {
          const dx = p.targetX - p.x;
          const dy = p.targetY - p.y;
          const dist = Math.hypot(dx, dy) || 1;
          p.vx += (dx / dist) * p.pull * dt;
          p.vy += (dy / dist) * p.pull * dt;
        }
        p.vy += p.gravity * dt;
        p.vx *= Math.pow(p.drag, dt);
        p.vy *= Math.pow(p.drag, dt);
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= p.decay * dt;
        if (p.life > 0) {
          ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
          ctx.fillStyle = p.color;
          if (p.glow) {
            ctx.shadowColor = p.color;
            ctx.shadowBlur = p.glow * d * p.life;
          }
          // integer snap keeps pixels crisp
          ctx.fillRect(
            Math.round(p.x * d), Math.round(p.y * d),
            Math.round(p.size * d), Math.round(p.size * d)
          );
          if (p.glow) ctx.shadowBlur = 0;
          alive.push(p);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      this.particles = alive;
    }

    destroy() {
      this.stop();
      window.removeEventListener("resize", this._resize);
    }
  }

  window.WizNerdzParticleSystem = ParticleSystem;
})();
