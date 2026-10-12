/**
 * Theme application.
 *
 * Writes a theme's palette onto the document root as CSS custom properties.
 * Every stylesheet in the app reads from these variables exclusively, so a
 * single write here restyles the entire interface with no reflow of rules.
 */

import { getTheme, themes, type Theme } from "./themes";

/** Map a theme colour role to its CSS custom property name. */
const CSS_VAR: Record<keyof Theme["colors"], string> = {
  bg: "--bg-color",
  main: "--main-color",
  caret: "--caret-color",
  sub: "--sub-color",
  subAlt: "--sub-alt-color",
  text: "--text-color",
  error: "--error-color",
  errorExtra: "--error-extra-color",
  colorfulError: "--colorful-error-color",
};

export function applyTheme(name: string): Theme {
  const theme = getTheme(name);
  const root = document.documentElement;

  for (const [role, value] of Object.entries(theme.colors)) {
    const cssVar = CSS_VAR[role as keyof Theme["colors"]];
    if (cssVar && value) root.style.setProperty(cssVar, value);
  }

  // Caret falls back to the accent colour when a theme does not specify one.
  if (!theme.colors.caret) {
    root.style.setProperty("--caret-color", theme.colors.main);
  }

  root.dataset["theme"] = theme.name;
  root.dataset["themeVariant"] = theme.variant;

  // Keep the browser UI (address bar, scrollbars) in step with the theme.
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = theme.colors.bg;
  root.style.colorScheme = theme.variant === "light" ? "light" : "dark";

  return theme;
}

export function listThemes(): Theme[] {
  return themes;
}
