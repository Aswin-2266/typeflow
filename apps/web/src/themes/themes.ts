/**
 * Theme definitions.
 *
 * Every palette here was authored for this project. A theme is just a set
 * of CSS custom properties; the engine writes them onto the document root,
 * so switching is instant and requires no stylesheet reload.
 *
 * Colour roles:
 *   bg       page background
 *   main     accent — caret, active text, primary buttons, chart line
 *   caret    caret colour (defaults to `main` when omitted)
 *   sub      muted text — untyped characters, labels, inactive controls
 *   subAlt   subtle surfaces — key hints, panel backgrounds
 *   text     primary foreground — correctly typed characters
 *   error    incorrect characters
 *   errorExtra  extra (inserted) characters
 *   colorfulError  error highlight on the results chart
 */

export type Theme = {
  name: string;
  label: string;
  variant: "dark" | "light" | "contrast";
  colors: {
    bg: string;
    main: string;
    caret?: string;
    sub: string;
    subAlt: string;
    text: string;
    error: string;
    errorExtra: string;
    colorfulError: string;
  };
};

export const themes: Theme[] = [
  {
    name: "carbon",
    label: "carbon",
    variant: "dark",
    colors: {
      bg: "#1c1c1e",
      main: "#f5c518",
      sub: "#5c5c61",
      subAlt: "#252528",
      text: "#e4e4e7",
      error: "#e5484d",
      errorExtra: "#8c2f33",
      colorfulError: "#e5484d",
    },
  },
  {
    name: "midnight",
    label: "midnight",
    variant: "dark",
    colors: {
      bg: "#0f1724",
      main: "#5eead4",
      sub: "#44566b",
      subAlt: "#16202f",
      text: "#dbeafe",
      error: "#f87171",
      errorExtra: "#7f3030",
      colorfulError: "#fb7185",
    },
  },
  {
    name: "ember",
    label: "ember",
    variant: "dark",
    colors: {
      bg: "#1a1210",
      main: "#ff7a45",
      sub: "#6b4a3d",
      subAlt: "#241915",
      text: "#f5e6de",
      error: "#ff4d4f",
      errorExtra: "#8a2c2e",
      colorfulError: "#ff4d4f",
    },
  },
  {
    name: "moss",
    label: "moss",
    variant: "dark",
    colors: {
      bg: "#131a14",
      main: "#7bc96f",
      sub: "#44563f",
      subAlt: "#1b241c",
      text: "#dcecd8",
      error: "#e06c75",
      errorExtra: "#7a3b40",
      colorfulError: "#e06c75",
    },
  },
  {
    name: "plum",
    label: "plum",
    variant: "dark",
    colors: {
      bg: "#1a1320",
      main: "#c084fc",
      sub: "#5a4a68",
      subAlt: "#241a2c",
      text: "#ece4f5",
      error: "#fb7185",
      errorExtra: "#7f3a46",
      colorfulError: "#fb7185",
    },
  },
  {
    name: "slate",
    label: "slate",
    variant: "dark",
    colors: {
      bg: "#17191c",
      main: "#8ab4f8",
      sub: "#565a61",
      subAlt: "#202327",
      text: "#dfe3e8",
      error: "#ef5350",
      errorExtra: "#8a3330",
      colorfulError: "#ef5350",
    },
  },
  {
    name: "sand",
    label: "sand",
    variant: "dark",
    colors: {
      bg: "#201d18",
      main: "#d9b382",
      sub: "#6a6052",
      subAlt: "#2a2620",
      text: "#efe7da",
      error: "#cf6a5a",
      errorExtra: "#78382f",
      colorfulError: "#cf6a5a",
    },
  },
  {
    name: "ocean",
    label: "ocean",
    variant: "dark",
    colors: {
      bg: "#0d1b24",
      main: "#38bdf8",
      sub: "#3f5a68",
      subAlt: "#12242f",
      text: "#d6ecf7",
      error: "#f87171",
      errorExtra: "#7d3434",
      colorfulError: "#f87171",
    },
  },
  {
    name: "paper",
    label: "paper",
    variant: "light",
    colors: {
      bg: "#f5f3ee",
      main: "#2f7a78",
      sub: "#716d65",
      subAlt: "#e8e5dd",
      text: "#2b2a28",
      error: "#c0392b",
      errorExtra: "#e0a39b",
      colorfulError: "#c0392b",
    },
  },
  {
    name: "linen",
    label: "linen",
    variant: "light",
    colors: {
      bg: "#fdfcfa",
      main: "#d97706",
      sub: "#756f65",
      subAlt: "#f0ece4",
      text: "#33302b",
      error: "#dc2626",
      errorExtra: "#f0a8a8",
      colorfulError: "#dc2626",
    },
  },
  {
    name: "mono",
    label: "mono",
    variant: "contrast",
    colors: {
      bg: "#000000",
      main: "#ffffff",
      sub: "#666666",
      subAlt: "#141414",
      text: "#ffffff",
      error: "#ff3b30",
      errorExtra: "#99231c",
      colorfulError: "#ff3b30",
    },
  },
  {
    name: "terminal",
    label: "terminal",
    variant: "contrast",
    colors: {
      bg: "#0a0f0a",
      main: "#33ff33",
      sub: "#2f662f",
      subAlt: "#0f1a0f",
      text: "#b6ffb6",
      error: "#ff5f5f",
      errorExtra: "#8c2f2f",
      colorfulError: "#ff5f5f",
    },
  },
]

export function getTheme(name: string): Theme {
  return themes.find((t) => t.name === name) ?? themes[0]!
}
