const UI = {
  init() {
    console.log("[UI] Interface initialisée");
  },
  
  updateLoaderMessage(msg) {
    const el = document.getElementById("loader-text");
    if (el) el.textContent = msg;
  }
};
