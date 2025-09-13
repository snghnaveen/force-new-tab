function toastMessage(message, duration = 4000) {
  let toast = document.getElementById("force-new-tab-toast");
  
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "force-new-tab-toast";
    toast.className = "force-new-tab-toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
}
