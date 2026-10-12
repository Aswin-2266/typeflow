/**
 * Settings page.
 *
 * The page is generated from a declarative schema, so adding a setting is
 * a one-line change here rather than new markup plus new event wiring.
 */

import { configStore, defaultConfig } from "@/state/config"
import { listThemes } from "@/themes/themeEngine"
import type { Config } from "@/types"

type OptionSetting<K extends keyof Config> = {
  kind: "options";
  key: K;
  title: string;
  desc: string;
  options: { value: Config[K]; label: string }[];
};

type ThemeSetting = {
  kind: "theme";
  title: string;
  desc: string;
};

type AnySetting = OptionSetting<keyof Config> | ThemeSetting;

type Section = {
  title: string;
  settings: AnySetting[];
};

function opts<K extends keyof Config>(
  key: K,
  title: string,
  desc: string,
  options: { value: Config[K]; label: string }[]
): OptionSetting<keyof Config> {
  return { kind: "options", key, title, desc, options } as OptionSetting<keyof Config>
}

const onOff = [
  { value: true, label: "on" },
  { value: false, label: "off" },
]

const schema: Section[] = [
  {
    title: "behaviour",
    settings: [
      opts("punctuation", "punctuation", "Include punctuation marks in generated text.", onOff as never),
      opts("numbers", "numbers", "Mix numeric tokens into generated text.", onOff as never),
      opts("stopOnError", "stop on error", "Halt at the first mistake, either per letter or per word.", [
        { value: "off", label: "off" },
        { value: "word", label: "word" },
        { value: "letter", label: "letter" },
      ] as never),
      opts("confidenceMode", "confidence mode", "Restrict backspace. 'on' locks completed words; 'max' disables backspace entirely.", [
        { value: "off", label: "off" },
        { value: "on", label: "on" },
        { value: "max", label: "max" },
      ] as never),
      opts("lazyMode", "lazy mode", "Treat accented characters as their plain equivalents.", onOff as never),
      opts("blindMode", "blind mode", "Hide all correctness feedback until the test ends.", onOff as never),
    ],
  },
  {
    title: "appearance",
    settings: [
      opts("focusMode", "focus mode", "Fade the interface while typing so only the text remains.", onOff as never),
      opts("smoothCaret", "smooth caret", "Animate the caret between characters.", onOff as never),
      opts("caretStyle", "caret style", "Shape of the caret.", [
        { value: "off", label: "off" },
        { value: "line", label: "line" },
        { value: "block", label: "block" },
        { value: "outline", label: "outline" },
        { value: "underline", label: "underline" },
      ] as never),
      opts("fontSize", "font size", "Size of the test text, in rem.", [
        { value: 1, label: "1" },
        { value: 1.25, label: "1.25" },
        { value: 1.5, label: "1.5" },
        { value: 2, label: "2" },
        { value: 2.5, label: "2.5" },
        { value: 3, label: "3" },
      ] as never),
      opts("timerStyle", "timer style", "How the timer and progress are displayed.", [
        { value: "bar", label: "bar" },
        { value: "text", label: "text" },
        { value: "mini", label: "mini" },
      ] as never),
      opts("showLiveWpm", "live wpm", "Show words per minute during the test.", onOff as never),
      opts("showLiveAccuracy", "live accuracy", "Show accuracy during the test.", onOff as never),
      opts("showKeyTips", "key tips", "Show keyboard shortcut hints below the test.", onOff as never),
    ],
  },
  {
    title: "sound",
    settings: [
      opts("soundOnClick", "sound on click", "Play a click on each keystroke.", onOff as never),
      opts("soundVolume", "sound volume", "Click volume.", [
        { value: 0.1, label: "quiet" },
        { value: 0.3, label: "medium" },
        { value: 0.6, label: "loud" },
      ] as never),
    ],
  },
  {
    title: "theme",
    settings: [{ kind: "theme", title: "theme", desc: "Colour palette for the entire interface." }],
  },
]

export class SettingsPage {
  constructor(private container: HTMLElement) {
    // Re-render on any config change so the active states stay in sync.
    configStore.subscribe(() => {
      if (!this.container.closest("[hidden]")) this.render()
    })
  }

  render(): void {
    const config = configStore.get()
    this.container.replaceChildren()

    for (const section of schema) {
      const sectionEl = document.createElement("section")
      sectionEl.className = "settings-section"

      const heading = document.createElement("h3")
      heading.className = "section-title"
      heading.textContent = section.title.replace(/^./, (letter) => letter.toUpperCase())
      sectionEl.appendChild(heading)

      for (const setting of section.settings) {
        sectionEl.appendChild(
          setting.kind === "theme"
            ? this.buildThemeSetting(setting, config)
            : this.buildOptionSetting(setting, config)
        )
      }

      this.container.appendChild(sectionEl)
    }

    this.container.appendChild(this.buildResetRow())
  }

  private buildRow(title: string, desc: string): {
    row: HTMLElement;
    control: HTMLElement;
  } {
    const row = document.createElement("div")
    row.className = "setting"

    const info = document.createElement("div")
    info.className = "setting__info"

    const titleEl = document.createElement("div")
    titleEl.className = "setting__title"
    titleEl.textContent = title.replace(/^./, (letter) => letter.toUpperCase())

    const descEl = document.createElement("div")
    descEl.className = "setting__desc"
    descEl.textContent = desc

    info.append(titleEl, descEl)

    const control = document.createElement("div")
    control.className = "setting__control"

    row.append(info, control)
    return { row, control }
  }

  private buildOptionSetting(
    setting: OptionSetting<keyof Config>,
    config: Readonly<Config>
  ): HTMLElement {
    const { row, control } = this.buildRow(setting.title, setting.desc)
    const current = config[setting.key]

    for (const option of setting.options) {
      const btn = document.createElement("button")
      btn.className = `option-btn${option.value === current ? " is-active" : ""}`
      btn.textContent = option.label.replace(/^./, (letter) => letter.toUpperCase())
      btn.setAttribute("aria-pressed", String(option.value === current))
      btn.setAttribute("aria-label", `${setting.title}: ${option.label}`)
      btn.addEventListener("click", () => {
        configStore.set(setting.key, option.value)
      })
      control.appendChild(btn)
    }

    return row
  }

  private buildThemeSetting(
    setting: ThemeSetting,
    config: Readonly<Config>
  ): HTMLElement {
    const { row, control } = this.buildRow(setting.title, setting.desc)

    const grid = document.createElement("div")
    grid.className = "theme-grid"

    for (const theme of listThemes()) {
      const card = document.createElement("button")
      card.className = `theme-card${theme.name === config.theme ? " is-active" : ""}`
      // Preview each theme in its own colours.
      card.style.backgroundColor = theme.colors.bg
      card.style.color = theme.colors.text

      const name = document.createElement("span")
      name.className = "theme-card__name"
      name.textContent = theme.label
      card.setAttribute("aria-label", `Use ${theme.label} theme`)
      card.setAttribute("aria-pressed", String(theme.name === config.theme))

      const swatches = document.createElement("span")
      swatches.className = "theme-card__swatches"
      for (const colour of [theme.colors.main, theme.colors.text, theme.colors.sub]) {
        const dot = document.createElement("span")
        dot.className = "theme-card__swatch"
        dot.style.backgroundColor = colour
        swatches.appendChild(dot)
      }

      card.append(name, swatches)
      card.addEventListener("click", () => configStore.set("theme", theme.name))
      grid.appendChild(card)
    }

    control.appendChild(grid)
    return row
  }

  private buildResetRow(): HTMLElement {
    const { row, control } = this.buildRow(
      "reset settings",
      "Restore every setting to its default value. Your test history is not affected."
    )

    const btn = document.createElement("button")
    btn.className = "btn btn--danger"
    btn.textContent = "Reset to Defaults"
    btn.addEventListener("click", () => {
      if (confirm("Reset all settings to defaults?")) {
        configStore.reset()
      }
    })

    control.appendChild(btn)
    return row
  }
}

export { defaultConfig }
