import { useEffect, useRef } from 'react';

interface ScrollSpyHandlers {
  /** Called when the element moves into the middle of its scroll container. */
  onEnter: () => void;
  /** Called when the element moves out of the middle of its scroll container. */
  onLeave: () => void;
}

/**
 * The share of the scroll container's height, measured from its top and from its bottom, that
 * does not count as its middle. With 0.4, the middle is the fifth of the container halfway down.
 */
const edgeShare = 0.4;

/**
 * Returns the closest ancestor of `element` that scrolls vertically, or `null` if the window
 * does the scrolling.
 */
function findScrollableAncestor(element: HTMLElement): HTMLElement | null {
  for (let node = element.parentElement; node && node !== document.body; node = node.parentElement) {
    const style = window.getComputedStyle(node);
    const overflow = style.getPropertyValue('overflow-y') || style.getPropertyValue('overflow');
    if (overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay') {
      return node;
    }
  }

  return null;
}

function isInMiddleOfScrollContainer(element: HTMLElement, scrollableAncestor: HTMLElement | null) {
  const containerTop = scrollableAncestor ? scrollableAncestor.getBoundingClientRect().top : 0;
  const containerHeight = scrollableAncestor ? scrollableAncestor.offsetHeight : window.innerHeight;
  const middleTop = containerTop + containerHeight * edgeShare;
  const middleBottom = containerTop + containerHeight - containerHeight * edgeShare;
  const { top, bottom } = element.getBoundingClientRect();

  return containerHeight > 0 && top <= middleBottom && bottom >= middleTop;
}

/**
 * Tracks whether an element overlaps the middle of the element that scrolls it (its closest
 * scrollable ancestor, or the window). The position is worked out again when that element
 * scrolls, when the window is resized, and after every render of the calling component.
 *
 * @returns a ref to attach to the element to track
 */
export function useScrollSpy<T extends HTMLElement>({ onEnter, onLeave }: ScrollSpyHandlers) {
  const elementRef = useRef<T>(null);
  const handlersRef = useRef({ onEnter, onLeave });
  const checkPositionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    handlersRef.current = { onEnter, onLeave };
  });

  // A render can move or resize the element without a scroll.
  useEffect(() => {
    const timeout = setTimeout(() => checkPositionRef.current?.());
    return () => clearTimeout(timeout);
  });

  useEffect(() => {
    const element = elementRef.current;
    if (!element) {
      return;
    }

    let scrollableAncestor: HTMLElement | null = null;
    let isInMiddle = false;

    const checkPosition = () => {
      const isNowInMiddle = isInMiddleOfScrollContainer(element, scrollableAncestor);
      if (isNowInMiddle === isInMiddle) {
        return;
      }

      isInMiddle = isNowInMiddle;
      if (isNowInMiddle) {
        handlersRef.current.onEnter();
      } else {
        handlersRef.current.onLeave();
      }
    };

    // Measure on the next tick so that the first measurement doesn't force layout while the
    // rest of the form is still mounting.
    const timeout = setTimeout(() => {
      scrollableAncestor = findScrollableAncestor(element);
      (scrollableAncestor ?? window).addEventListener('scroll', checkPosition, { passive: true });
      window.addEventListener('resize', checkPosition, { passive: true });
      checkPositionRef.current = checkPosition;
      checkPosition();
    });

    return () => {
      clearTimeout(timeout);
      checkPositionRef.current = null;
      (scrollableAncestor ?? window).removeEventListener('scroll', checkPosition);
      window.removeEventListener('resize', checkPosition);
    };
  }, []);

  return elementRef;
}
