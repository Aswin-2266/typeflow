import { describe, expect, it } from "vitest"
import { isEditableTarget, isRestartShortcut } from "@/ui/keyboard"

describe("editable keyboard targets", () => {
  it.each(["input", "textarea", "select"])(
    "leaves %s elements under native browser control",
    (tag) => {
      expect(isEditableTarget(document.createElement(tag))).toBe(true)
    }
  )

  it("recognises contenteditable controls", () => {
    const target = document.createElement("div")
    target.setAttribute("contenteditable", "true")
    document.body.appendChild(target)

    expect(isEditableTarget(target)).toBe(true)

    target.remove()
  })

  it("allows typing capture on ordinary page elements", () => {
    expect(isEditableTarget(document.createElement("div"))).toBe(false)
    expect(isEditableTarget(null)).toBe(false)
  })
})

describe("restart shortcut", () => {
  it("accepts Ctrl+Enter and Command+Enter", () => {
    expect(isRestartShortcut(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true }))).toBe(true)
    expect(isRestartShortcut(new KeyboardEvent("keydown", { key: "Enter", metaKey: true }))).toBe(true)
  })

  it("does not hijack Tab, plain Enter, or Alt-modified shortcuts", () => {
    expect(isRestartShortcut(new KeyboardEvent("keydown", { key: "Tab" }))).toBe(false)
    expect(isRestartShortcut(new KeyboardEvent("keydown", { key: "Enter" }))).toBe(false)
    expect(
      isRestartShortcut(
        new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, altKey: true })
      )
    ).toBe(false)
  })
})
