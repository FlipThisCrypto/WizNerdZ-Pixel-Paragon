/**
 * SummonResults — the clean modern screen after the chaos.
 *
 * Intentional contrast: the magic is retro/pixel/CRT, the ownership interface is
 * modern, calm and legible. Uses the site's existing design tokens so it looks
 * like the rest of WizNerdZ, not like part of the spell.
 *
 * Shows ONLY fields present on the verified result. Nothing is invented — if we
 * do not have a rarity rank or a transaction id, we do not render one.
 */
(function () {
  class SummonResults {
    constructor(container) {
      this.container = container;
    }

    render(result, { onAgain, onClose } = {}) {
      const nfts = result.nfts || [];
      const el = document.createElement("section");
      el.className = "wz-results";
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-modal", "true");
      el.setAttribute("aria-label", "Your summon results");

      const oneOfOnes = nfts.filter((n) => n.isOneOfOne).length;

      el.innerHTML = `
        <header class="wz-results-head">
          <p class="wz-results-kicker">YOUR SUMMON</p>
          <h2>${nfts.length} WizNerd${nfts.length === 1 ? "" : "Z"} summoned</h2>
          ${result.tierLabel ? `<p class="wz-results-sub">${esc(result.tierLabel)}</p>` : ""}
          ${oneOfOnes ? `<p class="wz-results-badge">${oneOfOnes} × 1 of 1</p>` : ""}
          ${result.transactionId ? `<p class="wz-results-tx"><span>Transaction</span> <code>${esc(result.transactionId)}</code></p>` : ""}
        </header>
        <div class="wz-results-grid">
          ${nfts.map((n) => this._card(n)).join("")}
        </div>
        <footer class="wz-results-actions">
          <button type="button" class="wz-btn wz-btn--primary" data-act="again">SUMMON AGAIN</button>
          <button type="button" class="wz-btn" data-act="share">SHARE SUMMON</button>
          <button type="button" class="wz-btn wz-btn--ghost" data-act="close">CLOSE</button>
        </footer>
      `;

      this.container.appendChild(el);
      requestAnimationFrame(() => el.classList.add("wz-results--in"));

      // ---- true modal semantics -------------------------------------------
      // The page behind this dialog is at inline opacity:0 (the summon's
      // disintegration) but its links and buttons are still focusable: a
      // keyboard user could Tab out of the dialog into an INVISIBLE page at
      // the exact climax of a purchase. Trap focus, close on Escape, make the
      // background inert, and hand focus back where it came from.
      const opener = document.activeElement;
      const inerted = [];
      for (const sib of document.body.children) {
        // never inert the dialog's own ancestor chain — wherever it mounted
        if (!sib.contains(el) && !sib.hasAttribute("inert")) {
          sib.setAttribute("inert", "");
          inerted.push(sib);
        }
      }

      const teardown = () => {
        for (const sib of inerted) sib.removeAttribute("inert");
        document.removeEventListener("keydown", onKey, true);
        if (opener && document.contains(opener) && typeof opener.focus === "function") {
          opener.focus();
        }
      };

      const doClose = () => {
        teardown();
        el.classList.remove("wz-results--in");
        setTimeout(() => { el.remove(); onClose && onClose(); }, 320);
      };

      const onKey = (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          doClose();
          return;
        }
        if (e.key !== "Tab") return;
        const focusables = [...el.querySelectorAll(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )].filter((f) => f.offsetParent !== null);
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !el.contains(document.activeElement))) {
          e.preventDefault();
          first.focus();
        }
      };
      document.addEventListener("keydown", onKey, true);

      el.querySelector('[data-act="again"]')?.addEventListener("click", () => {
        teardown();
        onAgain && onAgain();
      });
      el.querySelector('[data-act="close"]')?.addEventListener("click", doClose);
      el.querySelector('[data-act="share"]')?.addEventListener("click", () => this._share(result));

      // focus for keyboard users
      el.querySelector(".wz-btn")?.focus();
      return el;
    }

    _card(n) {
      const rank =
        n.rarityRank != null
          ? `<span class="wz-card-rank">Rank ${esc(n.rarityRank)}${n.raritySeriesTotal ? " / " + esc(n.raritySeriesTotal) : ""}</span>`
          : "";
      const rarity = n.rarity ? `<span class="wz-card-rarity">${esc(n.rarity)}</span>` : "";
      const special = n.special && n.special !== "Standard" ? `<span class="wz-card-special">${esc(n.special)}</span>` : "";
      const one = n.isOneOfOne ? `<span class="wz-card-one">1 OF 1</span>` : "";
      const link = n.tokenUrl
        ? `<a class="wz-btn wz-btn--sm" href="${esc(n.tokenUrl)}">VIEW WIZNERD</a>`
        : "";
      return `
        <article class="wz-card${n.isOneOfOne ? " wz-card--one" : ""}">
          <div class="wz-card-img">
            ${n.image ? `<img src="${esc(n.image)}" alt="${esc(n.name || "WizNerd #" + n.id)}" loading="lazy" decoding="async"
                 onerror="this.closest('.wz-card-img').classList.add('wz-card-img--fail');this.remove()">` : ""}
            <span class="wz-card-fallback">#${esc(n.id)}</span>
          </div>
          <div class="wz-card-body">
            <h3>${esc(n.name || "WizNerd #" + n.id)}</h3>
            <div class="wz-card-tags">${one}${rarity}${special}${rank}</div>
            ${link}
          </div>
        </article>`;
    }

    async _share(result) {
      const n = (result.nfts || []).length;
      const text = `I just summoned ${n} WizNerd${n === 1 ? "" : "Z"} on Chia.`;
      const url = (window.WIZNERDZ_CONFIG && window.WIZNERDZ_CONFIG.collection.website) || location.href;
      try {
        if (navigator.share) {
          await navigator.share({ title: "WizNerdZ Summon", text, url });
        } else {
          await navigator.clipboard.writeText(`${text} ${url}`);
          this._toast("Copied to clipboard");
        }
      } catch (_) {
        /* user cancelled share — nothing to do */
      }
    }

    _toast(msg) {
      const t = document.createElement("div");
      t.className = "wz-toast";
      t.textContent = msg;
      this.container.appendChild(t);
      requestAnimationFrame(() => t.classList.add("wz-toast--in"));
      setTimeout(() => { t.classList.remove("wz-toast--in"); setTimeout(() => t.remove(), 300); }, 1800);
    }
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  window.WizNerdzSummonResults = SummonResults;
})();
