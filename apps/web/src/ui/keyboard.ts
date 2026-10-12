export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false

  return (
    target.isContentEditable ||
    target.closest("[contenteditable]:not([contenteditable='false'])") !== null ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  )
}

export function isRestartShortcut(event: KeyboardEvent): boolean {
  return event.key === "Enter" && (event.ctrlKey || event.metaKey) && !event.altKey
}
