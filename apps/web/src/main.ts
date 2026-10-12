/**
 * Application entry point.
 *
 * Boots the app once the DOM is parsed and surfaces any fatal startup
 * error as visible text rather than a blank page.
 */

import "./styles/main.scss"
import { App } from "./ui/app"

function boot(): void {
  try {
    const app = new App()

    // Expose the instance in development for console debugging.
    if (import.meta.env.DEV) {
      (window as unknown as { app: App }).app = app
    }
  } catch (error) {
    console.error("[typeflow] failed to start", error)

    const root = document.querySelector("#app")
    if (root) {
      root.textContent =
        "Something went wrong while starting the app. Check the browser console for details."
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true })
} else {
  boot()
}
