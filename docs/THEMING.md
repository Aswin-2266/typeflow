# Theming

## How it works

A theme is a set of colour values. Applying one writes CSS custom properties
onto `document.documentElement`:

```ts
root.style.setProperty("--main-color", theme.colors.main);
```

Every stylesheet in the app reads **only** from these variables — no rule
hardcodes a palette colour. A single write therefore restyles the whole
interface with no stylesheet reload, no class swapping, and no reflow.

## Colour roles

| Variable | Role | Used by |
|---|---|---|
| `--bg-color` | Page background | `body`, command panel |
| `--main-color` | Accent | Caret, active controls, primary buttons, stat values, chart line |
| `--caret-color` | Caret (falls back to `main`) | Caret |
| `--sub-color` | Muted text | Untyped characters, labels, inactive controls |
| `--sub-alt-color` | Subtle surface | Config bar, cards, `kbd`, inputs |
| `--text-color` | Primary foreground | Correctly typed characters, headings |
| `--error-color` | Error | Incorrect characters |
| `--error-extra-color` | Secondary error | Extra (inserted) characters |
| `--colorful-error-color` | Error highlight | Word underline, chart error markers |

### The role that matters most

`--sub-color` against `--text-color` is the single most important contrast
pair. Untyped text uses `sub`; typed-correct text uses `text`. If these are too
close, the user cannot see their position in the text at a glance. If `sub` is
too dim, upcoming words become hard to read.

A ratio of roughly **2:1 to 3:1** between them works well in practice.

## Adding a theme

Append to the `themes` array in `src/themes/themes.ts`:

```ts
{
  name: "my-theme",        // stable id, persisted in localStorage
  label: "my theme",       // shown in UI
  variant: "dark",         // "dark" | "light" | "contrast"
  colors: {
    bg: "#101014",
    main: "#7aa2f7",
    sub: "#4a5168",
    subAlt: "#181820",
    text: "#e0e2ea",
    error: "#f7768e",
    errorExtra: "#8c3f4d",
    colorfulError: "#f7768e",
  },
}
```

It appears in the settings theme grid and the command palette automatically.
No other file needs changing.

`variant` drives `color-scheme`, which tells the browser how to render
scrollbars and form controls. Setting it incorrectly produces light scrollbars
on a dark theme.

## Design guidance

**Contrast.** Aim for WCAG AA (4.5:1) between `text` and `bg`. The `contrast`
variants target AAA.

**Accent restraint.** `main` appears on the caret, which is in constant
motion. A highly saturated accent that works on a static button can become
fatiguing as a moving caret.

**Error distinction.** `error` and `errorExtra` must be distinguishable from
each other *and* from `main`. If `main` is red-ish, errors need a clearly
different hue.

**Surface separation.** `subAlt` should be a few percent lighter (dark themes)
or darker (light themes) than `bg` — enough to delineate panels, not enough to
draw attention.

## Live preview

The settings theme grid renders each card using that theme's own `bg` and
`text`, so the picker shows real palettes rather than labels. The three dots
are `main`, `text`, and `sub`.

## Chart integration

`src/ui/chart.ts` reads theme colours at render time with
`getComputedStyle(document.documentElement)` rather than importing the theme
object. This means the chart always matches the active theme without needing a
subscription to theme changes.

## Font configuration

Font family and size are config values, not theme values — a user's preferred
reading size should not change when they switch palette.

```ts
root.style.setProperty("--font-size-test", `${config.fontSize}rem`);
root.style.setProperty("--font-mono", config.fontFamily);
```

Sizes range 1–3 rem. The caret height derives from `--font-size-test`, so it
scales automatically.
