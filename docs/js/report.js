(function () {
  const btn = document.getElementById("btn-report-abuse");
  if (!btn) return;
  btn.addEventListener("click", function () {
    const title = encodeURIComponent("[Site Report] WizNerdZ issue");
    const body = encodeURIComponent(
      [
        "## Report",
        "",
        "**What happened:**",
        "",
        "**URL:** " + location.href,
        "**Time (UTC):** " + new Date().toISOString(),
        "**Online:** " + navigator.onLine,
        "",
        "Do not include private keys or seed phrases.",
      ].join("\n")
    );
    window.open(
      "https://github.com/FlipThisCrypto/WizNerdZ-Pixel-Paragon/issues/new?title=" +
        title +
        "&body=" +
        body,
      "_blank",
      "noopener"
    );
  });
})();
