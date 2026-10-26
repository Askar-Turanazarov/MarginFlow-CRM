// The control that opened the last overlay: dialogs grow out of it and shrink back into it.
let lastRect: DOMRect | null = null;

export function rememberTrigger(target: Element | null) {
  const el = target?.closest?.("button, a, [role='button'], [data-trigger]");
  if (el) lastRect = el.getBoundingClientRect();
}

/** Offset of the trigger's centre from the viewport centre (where dialogs live). */
export function triggerOffset() {
  if (!lastRect || typeof window === "undefined") return { x: 0, y: 24 };
  return {
    x: lastRect.left + lastRect.width / 2 - window.innerWidth / 2,
    y: lastRect.top + lastRect.height / 2 - window.innerHeight / 2,
  };
}
