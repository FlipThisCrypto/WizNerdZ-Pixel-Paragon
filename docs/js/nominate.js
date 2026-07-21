/**
 * Community PFP nomination — client-side form.
 * Submits as a prefilled GitHub Issue (public, no private backend).
 * Also keeps a local session copy for the nominator.
 */
(function () {
  const cfg = window.WIZNERDZ_CONFIG;
  const form = document.getElementById("nominate-form");
  const out = document.getElementById("nominate-result");
  const listEl = document.getElementById("local-noms");
  if (!form || !cfg) return;

  const KEY = "wiznerdz_pfp_nominations_v1";
  const MAX_LOCAL = 50;

  /** Bech32-style xch addresses: xch1 + ~58 data chars (mainnet). */
  const XCH_RE = /^xch1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{50,90}$/i;

  function loadLocal() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveLocal(arr) {
    localStorage.setItem(KEY, JSON.stringify(arr.slice(-MAX_LOCAL)));
  }

  function showErr(msg) {
    if (!out) return;
    out.innerHTML = "<p class='err' role='alert'>" + escapeHtml(msg) + "</p>";
    out.focus && out.setAttribute("tabindex", "-1");
  }

  function renderLocal() {
    if (!listEl) return;
    const arr = loadLocal();
    const badge = document.getElementById("local-nom-count");
    if (badge) {
      badge.textContent = String(arr.length);
      badge.hidden = arr.length === 0;
    }
    if (!arr.length) {
      listEl.innerHTML =
        "<p class='muted'>No nominations saved in this browser yet. Submit the form to open a GitHub issue and keep a local copy.</p>";
      return;
    }
    listEl.innerHTML = arr
      .slice()
      .reverse()
      .map(
        (n) =>
          `<div class="nom-card"><strong>${escapeHtml(n.nomineeHandle)}</strong> nominated by ${escapeHtml(n.nominatorHandle || "anon")}<br/><span class="muted">${escapeHtml(n.createdAt)} · ${escapeHtml(n.wallet || "no wallet")}</span>${n.notes ? "<br/>" + escapeHtml(n.notes) : ""}</div>`
      )
      .join("");
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function deadlinePassed() {
    const end = Date.parse(
      (cfg.nomination && cfg.nomination.deadlineUtc) ||
        "2026-08-01T04:00:00.000Z"
    );
    return Date.now() >= end;
  }

  function validateWallet(w) {
    if (!w) return null;
    if (!XCH_RE.test(w)) {
      return "Wallet must be a valid mainnet Chia address starting with xch1 (or leave blank).";
    }
    return null;
  }

  function validatePfpUrl(u) {
    if (!u) return null;
    try {
      const parsed = new URL(u);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return "PFP URL must start with http:// or https://.";
      }
      return null;
    } catch {
      return "PFP / reference URL is not a valid URL.";
    }
  }

  const notes = form.notes;
  const notesCount = document.getElementById("notes-count");
  if (notes && notesCount) {
    const syncNotes = () => {
      notesCount.textContent = notes.value.length + "/800";
    };
    notes.addEventListener("input", syncNotes);
    syncNotes();
  }

  // Live wallet hint
  const walletInput = form.wallet;
  if (walletInput) {
    walletInput.addEventListener("input", () => {
      const w = walletInput.value.trim();
      if (!w) {
        walletInput.setCustomValidity("");
        return;
      }
      walletInput.setCustomValidity(
        XCH_RE.test(w) ? "" : "Enter a valid xch1… address or leave blank."
      );
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (deadlinePassed()) {
      showErr(
        "The nomination window is closed (after midnight July 31, 2026 US Eastern)."
      );
      return;
    }

    const data = {
      nomineeHandle: form.nomineeHandle.value.trim(),
      nomineePlatform: form.nomineePlatform.value,
      nominatorHandle: form.nominatorHandle.value.trim(),
      wallet: form.wallet.value.trim(),
      pfpUrl: form.pfpUrl.value.trim(),
      notes: form.notes.value.trim(),
      createdAt: new Date().toISOString(),
      type: "WizNerdZ community PFP 1:1 nomination",
    };

    if (!data.nomineeHandle || data.nomineeHandle.length < 2) {
      showErr("Nominee handle is required (at least 2 characters).");
      form.nomineeHandle.focus();
      return;
    }
    if (data.nomineeHandle.length > 80) {
      showErr("Nominee handle is too long (max 80 characters).");
      return;
    }

    // Local duplicate protection (same device / same handle+platform)
    const dedupeKey =
      data.nomineeHandle.toLowerCase() + "|" + data.nomineePlatform.toLowerCase();
    const prior = loadLocal().find(
      (n) =>
        (n.nomineeHandle || "").toLowerCase() +
          "|" +
          (n.nomineePlatform || "").toLowerCase() ===
        dedupeKey
    );
    if (prior) {
      const ok = window.confirm(
        "You already nominated " +
          data.nomineeHandle +
          " (" +
          data.nomineePlatform +
          ") on this device. Submit another issue anyway?"
      );
      if (!ok) return;
    }

    const wErr = validateWallet(data.wallet);
    if (wErr) {
      showErr(wErr);
      form.wallet.focus();
      return;
    }

    const uErr = validatePfpUrl(data.pfpUrl);
    if (uErr) {
      showErr(uErr);
      form.pfpUrl.focus();
      return;
    }

    const arr = loadLocal();
    arr.push(data);
    saveLocal(arr);
    renderLocal();

    const title = encodeURIComponent(
      `[PFP Nomination] ${data.nomineeHandle} (${data.nomineePlatform})`
    );
    const body = encodeURIComponent(
      [
        "## Community PFP → WizNerdZ 1:1 nomination",
        "",
        `**Nominee:** ${data.nomineeHandle}`,
        `**Platform:** ${data.nomineePlatform}`,
        `**Nominator:** ${data.nominatorHandle || "(not provided)"}`,
        `**Wallet (optional):** ${data.wallet || "(not provided)"}`,
        `**PFP / reference URL:** ${data.pfpUrl || "(not provided)"}`,
        "",
        "### Notes",
        data.notes || "(none)",
        "",
        `Submitted (UTC): ${data.createdAt}`,
        "",
        "_Theme: convert nominated user PFP into a WizNerdZ wizard 1:1 for collection visibility._",
      ].join("\n")
    );

    const issueUrl = `${cfg.collection.repoIssues}?title=${title}&body=${body}&labels=pfp-nomination`;

    if (out) {
      out.innerHTML = `
        <p class="ok" role="status">Saved on this device. Completing the GitHub issue is the official nomination.</p>
        <p><a class="btn primary" href="${issueUrl}" target="_blank" rel="noopener">Finish on GitHub (opens issue form)</a></p>
        <p class="muted">Log into GitHub if prompted, then click <strong>Create</strong> on the prefilled issue. That is how Fiend Studios receives your nomination.</p>`;
    }

    const win = window.open(issueUrl, "_blank", "noopener");
    if (!win && out) {
      out.innerHTML +=
        "<p class='warn' role='status'>Popup blocked — use the button above to open the GitHub issue form.</p>";
    }
  });

  function exportCsv() {
    const arr = loadLocal();
    if (!arr.length) {
      showErr("No local nominations to export on this device.");
      return;
    }
    const headers = [
      "createdAt",
      "nomineeHandle",
      "nomineePlatform",
      "nominatorHandle",
      "wallet",
      "pfpUrl",
      "notes",
    ];
    const rows = [headers.join(",")];
    arr.forEach((n) => {
      rows.push(
        headers
          .map((h) => {
            const v = String(n[h] == null ? "" : n[h]);
            return '"' + v.replace(/"/g, '""') + '"';
          })
          .join(",")
      );
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      "wiznerdz-pfp-nominations-" +
      new Date().toISOString().slice(0, 10) +
      ".csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    if (out) {
      out.innerHTML =
        "<p class='ok' role='status'>Downloaded CSV of " +
        arr.length +
        " local nomination(s).</p>";
    }
  }

  function setFormOpen(open) {
    const controls = form.querySelectorAll("input, select, textarea, button[type='submit']");
    controls.forEach((c) => {
      c.disabled = !open;
    });
    if (!open) {
      showErr(
        "The nomination window is closed (after midnight July 31, 2026 US Eastern)."
      );
    }
  }

  if (deadlinePassed()) setFormOpen(false);
  window.addEventListener("wiznerdz:deadline", (ev) => {
    if (ev.detail && ev.detail.open === false) setFormOpen(false);
  });

  const exportBtn = document.getElementById("btn-export-noms");
  if (exportBtn) exportBtn.addEventListener("click", exportCsv);

  // Optional: prefill claim wallet from connected Sage session
  window.addEventListener("wiznerdz:wallet", (ev) => {
    const addr = (ev.detail && ev.detail.address) || "";
    if (!form.wallet) return;
    if (!addr) return;
    if (form.wallet.value.trim()) return; // do not overwrite user input
    if (XCH_RE.test(addr)) {
      form.wallet.value = addr;
      form.wallet.setCustomValidity("");
    }
  });

  renderLocal();
})();
