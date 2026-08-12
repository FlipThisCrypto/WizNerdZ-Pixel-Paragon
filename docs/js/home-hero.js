/**
 * Landing hero — boots the ambient arcane background and fills the art band.
 *
 * Reuses the reveal system's Atmosphere + SpellCircle at LOW intensity, so the
 * homepage is visibly the same world as the summon. Both degrade to a static
 * dark hero if the modules are absent or motion is reduced.
 *
 * Only real collection data is displayed: the 23 class accent colours come from
 * the published palette, and the band uses real token art.
 */
(function () {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /** The 23 class accent colours, straight from docs/PALETTE.md triplets. */
  const CLASS_ACCENTS = [
    "#e0a030", "#8b2fe8", "#c81010", "#e02890", "#e8b828", "#f0c828",
    "#18a8b8", "#2860d8", "#28a838", "#d06020", "#4080f5", "#18b0a8",
    "#a838f0", "#c0ff30", "#f02800", "#6888a8", "#f0b020", "#5840c0",
    "#d8d8f0", "#20d0ff", "#ff2850", "#2828b0", "#189028",
  ];

  function spectrum() {
    const el = document.getElementById("hz-spectrum");
    if (!el) return;
    el.innerHTML = CLASS_ACCENTS.map(
      (c) => `<span style="color:${c}"></span>`
    ).join("");
  }

  /** Featured art: named 1/1s first, then a spread of the collection. */
  function band() {
    const track = document.getElementById("hz-band-track");
    if (!track) return;
    const named = [42, 787, 2264, 3736, 5625, 6146, 7462, 8483, 8700];
    const spread = [111, 900, 1500, 2400, 3100, 4200, 5000, 6300, 7100, 8100];
    const ids = named.concat(spread);
    const cell = (id) =>
      `<img src="images/${id}.png" alt="WizNerd #${id}" loading="lazy" decoding="async"
        onerror="this.style.display='none'">`;
    // duplicated once so the -50% marquee loops seamlessly
    track.innerHTML = ids.map(cell).join("") + ids.map(cell).join("");
  }

  function ambient() {
    if (reduced) return;
    const atmosCanvas = document.getElementById("hz-atmos");
    const spellCanvas = document.getElementById("hz-spell");
    if (!atmosCanvas || !window.WizNerdzAtmosphere) return;

    const hero = document.querySelector(".hz-hero");
    const atmos = new window.WizNerdzAtmosphere(atmosCanvas);
    atmos.setIntensity(0.5);
    atmos.start();

    let spell = null;
    if (spellCanvas && window.WizNerdzSpellCircle) {
      spell = new window.WizNerdzSpellCircle(spellCanvas);
      spell.setIntensity(0.62); // ambient, not the full summon
      spell.start();
    }

    // Stop painting when the hero scrolls away — no wasted frames.
    if ("IntersectionObserver" in window && hero) {
      new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) { atmos.start(); spell && spell.start(); }
            else { atmos.stop(); spell && spell.stop(); }
          }
        },
        { threshold: 0.02 }
      ).observe(hero);
    }

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) { atmos.stop(); spell && spell.stop(); }
      else { atmos.start(); spell && spell.start(); }
    });
  }

  function init() {
    spectrum();
    band();
    ambient();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
