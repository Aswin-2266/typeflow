/**
 * Transient notifications.
 *
 * Toasts are informational only — nothing in the app depends on a toast
 * being seen or acted upon.
 */

const DURATION = 2600;

let stack: HTMLElement | null = null;

export function initToasts(container: HTMLElement): void {
  stack = container;
}

export function toast(message: string, variant: "info" | "error" = "info"): void {
  if (!stack) return;

  const el = document.createElement("div");
  el.className = `toast${variant === "error" ? " toast--error" : ""}`;
  el.textContent = message;
  el.setAttribute("role", variant === "error" ? "alert" : "status");

  stack.appendChild(el);

  window.setTimeout(() => {
    el.classList.add("is-leaving");
    // Remove only after the leave animation has finished.
    el.addEventListener("animationend", () => el.remove(), { once: true });
    // Safety net in case the animation never fires (reduced motion).
    window.setTimeout(() => el.remove(), 400);
  }, DURATION);
}
