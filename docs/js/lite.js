(function () {
  const params = new URLSearchParams(location.search);
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const lite =
    params.get("lite") === "1" ||
    localStorage.getItem("wiznerdz_lite") === "1" ||
    (conn && conn.saveData);
  window.WIZNERDZ_LITE = !!lite;
  if (!lite) return;
  document.documentElement.classList.add("lite");
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".wiz-band-inner a:nth-child(n+7)").forEach(function (a) {
      a.remove();
    });
  });
})();
