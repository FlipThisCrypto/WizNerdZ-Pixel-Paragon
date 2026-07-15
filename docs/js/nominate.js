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

  function loadLocal() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveLocal(arr) {
    localStorage.setItem(KEY, JSON.stringify(arr));
  }

  function renderLocal() {
    if (!listEl) return;
    const arr = loadLocal();
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

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (deadlinePassed()) {
      if (out) {
        out.innerHTML =
          "<p class='err'>The nomination window is closed (after midnight July 31, 2026 US Eastern).</p>";
      }
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

    if (!data.nomineeHandle) {
      if (out) out.innerHTML = "<p class='err'>Nominee handle is required.</p>";
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
        <p class="ok">Saved on this device. Completing the GitHub issue is the official nomination.</p>
        <p><a class="btn primary" href="${issueUrl}" target="_blank" rel="noopener">Finish on GitHub (opens issue form)</a></p>
        <p class="muted">Log into GitHub if prompted, then click <strong>Create</strong> on the prefilled issue. That is how Fiend Studios receives your nomination.</p>`;
    }

    // Open prefilled issue form (user confirms Create — no write API key needed)
    window.open(issueUrl, "_blank", "noopener");
  });

  renderLocal();
})();
