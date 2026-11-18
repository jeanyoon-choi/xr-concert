// Page shortcuts (Space, arrows, X) must not fire while someone types into a
// phone, but must still work when a button or the timeline has focus.

const TEXT_INPUTS = /^(text|search|email|url|tel|password|number|)$/;

/** Whether a key event belongs to a text field. */
export function isTyping(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  if (!target || event.metaKey || event.ctrlKey || event.altKey) return true;
  if (target.isContentEditable || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return true;
  return target.tagName === "INPUT" && TEXT_INPUTS.test((target as HTMLInputElement).type);
}
