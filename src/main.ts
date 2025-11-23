import { initRouter } from "@lib";

// Initialize the router when the app starts
document.addEventListener("DOMContentLoaded", () => {
  initRouter();
});

// Also initialize when the script loads (fallback)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initRouter();
  });
} else {
  // DOM is already loaded
  initRouter();
}
