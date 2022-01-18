export function scrollIntoView(viewId: string) {
  document.getElementById(viewId).scrollIntoView({
    behavior: 'smooth',
    block: 'start',
    inline: 'start',
  });
}
