export function scrollIntoView(viewId: string, toFocus: boolean = false) {
  const currentElement = document.getElementById(viewId);
  currentElement?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
    inline: 'start',
  });
  if (toFocus) {
    currentElement?.focus();
  }
}
