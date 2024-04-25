export function scrollIntoView(viewId: string, shouldFocus: boolean = false) {
  const currentElement = document.getElementById(viewId);
  currentElement?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'center',
  });

  if (shouldFocus) {
    currentElement?.focus();
  }
}
