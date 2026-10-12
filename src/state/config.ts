/**
 * Configuration store.
 *
 * Holds the user's settings, persists them to localStorage, and notifies
 * subscribers on change. Unknown or malformed persisted keys are discarded
 * on load so an older/corrupted payload can never put the app into an
 * invalid state.
 */

import type { Config } from "@/types"

const STORAGE_KEY = "typeflow.config"

export const defaultConfig: Config = {
  mode: "time",
  time: 30,
  words: 50,
  quoteLength: "medium",
  language: "english",

  punctuation: false,
  numbers: false,

  blindMode: false,
  stopOnError: "off",
  confidenceMode: "off",
  lazyMode: false,
  focusMode: true,

  caretStyle: "line",
  smoothCaret: true,
  timerStyle: "text",
  showLiveWpm: true,
  showLiveAccuracy: false,
  showKeyTips: true,

  fontSize: 1.5,
  fontFamily: "'Roboto Mono', monospace",
  theme: "carbon",
  soundOnClick: false,
  soundVolume: 0.3,

  customText: "",
}

/** Runtime validators, one per key. Anything failing is reset to default. */
const validators: { [K in keyof Config]: (v: unknown) => v is Config[K] } = {
  mode: (v): v is Config["mode"] =>
    typeof v === "string" && ["time", "words", "quote", "zen", "custom"].includes(v),
  time: (v): v is number => typeof v === "number" && v > 0 && v <= 7200,
  words: (v): v is number => typeof v === "number" && v > 0 && v <= 5000,
  quoteLength: (v): v is Config["quoteLength"] =>
    typeof v === "string" && ["short", "medium", "long", "all"].includes(v),
  language: (v): v is string => typeof v === "string" && v.length > 0,

  punctuation: (v): v is boolean => typeof v === "boolean",
  numbers: (v): v is boolean => typeof v === "boolean",

  blindMode: (v): v is boolean => typeof v === "boolean",
  stopOnError: (v): v is Config["stopOnError"] =>
    typeof v === "string" && ["off", "word", "letter"].includes(v),
  confidenceMode: (v): v is Config["confidenceMode"] =>
    typeof v === "string" && ["off", "on", "max"].includes(v),
  lazyMode: (v): v is boolean => typeof v === "boolean",
  focusMode: (v): v is boolean => typeof v === "boolean",

  caretStyle: (v): v is Config["caretStyle"] =>
    typeof v === "string" && ["off", "line", "block", "outline", "underline"].includes(v),
  smoothCaret: (v): v is boolean => typeof v === "boolean",
  timerStyle: (v): v is Config["timerStyle"] =>
    typeof v === "string" && ["bar", "text", "mini"].includes(v),
  showLiveWpm: (v): v is boolean => typeof v === "boolean",
  showLiveAccuracy: (v): v is boolean => typeof v === "boolean",
  showKeyTips: (v): v is boolean => typeof v === "boolean",

  fontSize: (v): v is number => typeof v === "number" && v >= 0.5 && v <= 5,
  fontFamily: (v): v is string => typeof v === "string" && v.length > 0,
  theme: (v): v is string => typeof v === "string" && v.length > 0,
  soundOnClick: (v): v is boolean => typeof v === "boolean",
  soundVolume: (v): v is number => typeof v === "number" && v >= 0 && v <= 1,

  customText: (v): v is string => typeof v === "string",
}

type ConfigListener = (config: Config, changedKey?: keyof Config) => void;

class ConfigStore {
  private config: Config = { ...defaultConfig }
  private listeners = new Set<ConfigListener>()

  constructor() {
    this.load()
  }

  get(): Readonly<Config> {
    return this.config
  }

  getValue<K extends keyof Config>(key: K): Config[K] {
    return this.config[key]
  }

  set<K extends keyof Config>(key: K, value: Config[K]): void {
    const validate = validators[key] as (v: unknown) => v is Config[K]
    if (!validate(value)) {
      console.warn(`[config] rejected invalid value for "${String(key)}"`, value)
      return
    }
    if (this.config[key] === value) return

    this.config[key] = value
    this.save()
    this.notify(key)
  }

  /** Apply several keys at once, notifying only after all are written. */
  patch(partial: Partial<Config>): void {
    let changed = false
    for (const [key, value] of Object.entries(partial)) {
      const k = key as keyof Config
      const validate = validators[k] as ((v: unknown) => boolean) | undefined
      if (!validate || !validate(value)) continue
      if (this.config[k] === value) continue;
      (this.config as Record<string, unknown>)[k] = value
      changed = true
    }
    if (changed) {
      this.save()
      this.notify()
    }
  }

  reset(): void {
    this.config = { ...defaultConfig }
    this.save()
    this.notify()
  }

  subscribe(listener: ConfigListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(changedKey?: keyof Config): void {
    for (const listener of this.listeners) listener(this.config, changedKey)
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return

      const parsed: unknown = JSON.parse(raw)
      if (typeof parsed !== "object" || parsed === null) return

      for (const [key, value] of Object.entries(parsed)) {
        const k = key as keyof Config
        const validate = validators[k] as ((v: unknown) => boolean) | undefined
        // Silently drop keys we no longer recognise or that fail validation.
        if (validate?.(value)) {
          (this.config as Record<string, unknown>)[k] = value
        }
      }
    } catch (err) {
      console.warn("[config] failed to load, using defaults", err)
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config))
    } catch (err) {
      // Quota exceeded or storage disabled — the app still works in-memory.
      console.warn("[config] failed to persist", err)
    }
  }
}

export const configStore = new ConfigStore()
