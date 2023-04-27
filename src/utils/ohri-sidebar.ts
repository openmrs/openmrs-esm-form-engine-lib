export function scrollIntoView(viewId: string, shouldFocus: boolean = false) {
  const currentElement = document.getElementById(viewId);
  currentElement?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
    inline: 'start',
  });

  if (shouldFocus) {
    currentElement?.focus();
  }
}
