/**
 * Test renderer.
 *
 * Paints engine state into the DOM and positions the caret.
 *
 * Two performance decisions matter here:
 *
 *  1. Words are rebuilt only when the word list identity changes (a new
 *     test, or a time-mode refill). Ordinary keystrokes patch the class
 *     names of the affected word only, so typing never triggers a full
 *     re-render.
 *
 *  2. The caret is moved with a `transform`, not by re-laying-out text.
 *     This keeps caret motion on the compositor and off the main thread.
 */

import type { TypingEngine } from "@/engine/engine";
import type { Config, TypedWord } from "@/types";

export class TestRenderer {
  private wordsEl: HTMLElement;
  private caretEl: HTMLElement;
  private areaEl: HTMLElement;

  /** Rendered word elements, index-aligned with `engine.words`. */
  private wordEls: HTMLElement[] = [];
  /** Identity marker for the currently rendered word list. */
  private renderedCount = 0;
  private renderedFirstWord = "";

  /** Vertical offset applied to scroll completed lines out of view. */
  private lineOffset = 0;
  private caretTypingTimer: number | null = null;

  constructor(
    private engine: TypingEngine,
    root: { words: HTMLElement; caret: HTMLElement; area: HTMLElement }
  ) {
    this.wordsEl = root.words;
    this.caretEl = root.caret;
    this.areaEl = root.area;
  }

  /** Full rebuild of the word list. */
  renderWords(): void {
    const words = this.engine.words;

    this.wordsEl.replaceChildren();
    this.wordEls = [];

    const frag = document.createDocumentFragment();
    for (const word of words) {
      const el = this.buildWord(word);
      this.wordEls.push(el);
      frag.appendChild(el);
    }
    this.wordsEl.appendChild(frag);

    this.renderedCount = words.length;
    this.renderedFirstWord = words[0]?.target ?? "";
    this.lineOffset = 0;
    this.wordsEl.style.transform = "translateY(0)";

    this.updateCaret();
  }

  private buildWord(word: TypedWord): HTMLElement {
    const el = document.createElement("div");
    el.className = "word";

    for (const char of word.chars) {
      const span = document.createElement("span");
      span.className = `char ${char.state}`;
      // `extra` slots have no expected char, so show what was typed.
      span.textContent = char.expected || char.typed || "";
      el.appendChild(span);
    }

    return el;
  }

  /** Repaint a single word in place. */
  private patchWord(index: number): void {
    const word = this.engine.words[index];
    const el = this.wordEls[index];
    if (!word || !el) return;

    const spans = el.children;

    // Character counts change when extras are added or removed, so the
    // span list is rebuilt only in that case.
    if (spans.length !== word.chars.length) {
      const rebuilt = this.buildWord(word);
      el.replaceChildren(...rebuilt.children);
    } else {
      for (let i = 0; i < word.chars.length; i++) {
        const char = word.chars[i]!;
        const span = spans[i] as HTMLElement;
        const cls = `char ${char.state}`;
        if (span.className !== cls) span.className = cls;
        const text = char.expected || char.typed || "";
        if (span.textContent !== text) span.textContent = text;
      }
    }

    const hasError =
      word.completed && word.chars.some((c) => c.state !== "correct");
    el.classList.toggle("has-error", hasError);
  }

  /** Called on every engine event that can change visible state. */
  update(): void {
    const words = this.engine.words;

    // Detect a new test or a time-mode refill and rebuild if needed.
    if (
      words.length !== this.renderedCount ||
      (words[0]?.target ?? "") !== this.renderedFirstWord
    ) {
      // A pure append (time-mode refill) only needs the new words added.
      if (
        words.length > this.renderedCount &&
        (words[0]?.target ?? "") === this.renderedFirstWord
      ) {
        const frag = document.createDocumentFragment();
        for (let i = this.renderedCount; i < words.length; i++) {
          const el = this.buildWord(words[i]!);
          this.wordEls.push(el);
          frag.appendChild(el);
        }
        this.wordsEl.appendChild(frag);
        this.renderedCount = words.length;
      } else {
        this.renderWords();
        return;
      }
    }

    // Patch the active word and the one just completed.
    this.patchWord(this.engine.wordIndex);
    if (this.engine.wordIndex > 0) {
      this.patchWord(this.engine.wordIndex - 1);
    }

    this.updateCaret();
    this.pulseCaret();
  }

  /**
   * Position the caret at the active character.
   *
   * The caret sits just before the active character, or just after the
   * last character when the user has typed past the end of a word.
   */
  updateCaret(): void {
    const config = this.engine.getConfig();

    if (config.caretStyle === "off") {
      this.caretEl.classList.add("hidden");
      return;
    }
    this.caretEl.classList.remove("hidden");

    const wordEl = this.wordEls[this.engine.wordIndex];
    if (!wordEl) return;

    const areaRect = this.areaEl.getBoundingClientRect();
    const charIndex = this.engine.charIndex;
    const spans = wordEl.children;

    let x: number;
    let y: number;
    let height: number;

    if (charIndex < spans.length) {
      const rect = (spans[charIndex] as HTMLElement).getBoundingClientRect();
      x = rect.left - areaRect.left;
      y = rect.top - areaRect.top;
      height = rect.height;
    } else if (spans.length > 0) {
      const rect = (spans[spans.length - 1] as HTMLElement).getBoundingClientRect();
      x = rect.right - areaRect.left;
      y = rect.top - areaRect.top;
      height = rect.height;
    } else {
      const rect = wordEl.getBoundingClientRect();
      x = rect.left - areaRect.left;
      y = rect.top - areaRect.top;
      height = rect.height;
    }

    this.caretEl.style.transform = `translate(${x}px, ${y}px)`;
    this.caretEl.style.height = `${height * 0.8}px`;

    this.applyCaretStyle(config);
    this.scrollToLine(y, height);
  }

  private applyCaretStyle(config: Config): void {
    const el = this.caretEl;
    el.classList.toggle("smooth", config.smoothCaret);
    el.classList.toggle("style-block", config.caretStyle === "block");
    el.classList.toggle("style-outline", config.caretStyle === "outline");
    el.classList.toggle("style-underline", config.caretStyle === "underline");
  }

  /**
   * Keep the active line vertically centred in the three-line window.
   *
   * Once the caret reaches the third visible line we shift the whole word
   * block up by one line height, which produces the familiar scrolling
   * effect without ever moving the caret off-screen.
   */
  private scrollToLine(caretY: number, lineHeight: number): void {
    const relativeY = caretY + this.lineOffset;
    const lineIndex = Math.round(relativeY / lineHeight);

    if (lineIndex >= 2) {
      const targetOffset = (lineIndex - 1) * lineHeight;
      if (targetOffset !== this.lineOffset) {
        this.lineOffset = targetOffset;
        this.wordsEl.style.transform = `translateY(-${targetOffset}px)`;
        this.wordsEl.style.transition = "transform 0.15s ease";
      }
    }
  }

  /** Hold the caret solid briefly after a keystroke, then resume blinking. */
  private pulseCaret(): void {
    this.caretEl.classList.add("typing");
    if (this.caretTypingTimer !== null) {
      clearTimeout(this.caretTypingTimer);
    }
    this.caretTypingTimer = window.setTimeout(() => {
      this.caretEl.classList.remove("typing");
    }, 800);
  }

  /** Apply config-driven classes to the typing surface. */
  applyConfig(config: Config): void {
    this.areaEl.classList.toggle("blind", config.blindMode);
    document.documentElement.style.setProperty(
      "--font-size-test",
      `${config.fontSize}rem`
    );
    document.documentElement.style.setProperty("--font-mono", config.fontFamily);
    this.updateCaret();
  }

  destroy(): void {
    if (this.caretTypingTimer !== null) clearTimeout(this.caretTypingTimer);
  }
}
