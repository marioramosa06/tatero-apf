(function () {
  var retryBtn = document.getElementById("offline-retry-btn");
  var statusBadge = document.getElementById("offline-status-badge");

  function updateStatus() {
    if (!statusBadge) return;
    if (navigator.onLine) {
      statusBadge.textContent = "Connexion rétablie";
      statusBadge.classList.add("is-online");
    } else {
      statusBadge.textContent = "Connexion hors ligne";
      statusBadge.classList.remove("is-online");
    }
  }

  if (retryBtn) {
    retryBtn.addEventListener("click", function () {
      window.location.reload();
    });
  }

  window.addEventListener("online", function () {
    updateStatus();
  });

  window.addEventListener("offline", updateStatus);
  updateStatus();
})();
