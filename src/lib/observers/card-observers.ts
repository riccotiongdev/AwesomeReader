type EntryHandler = (entry: IntersectionObserverEntry) => void;

const handlers = new WeakMap<Element, EntryHandler>();

let observer: IntersectionObserver | null = null;

function getSharedObserver(): IntersectionObserver {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const handler = handlers.get(entry.target);
          if (handler) handler(entry);
        }
      },
      {
        root: null,
        rootMargin: '0px 0px 10% 0px',
        threshold: 0,
      }
    );
  }
  return observer;
}

/**
 * Observes an element through one shared IntersectionObserver instance.
 * The shared observer fires for all observed elements, so mounting thousands of
 * cards creates exactly one observer instead of one per card.
 */
export function observeCard(el: Element, handler: EntryHandler): () => void {
  const shared = getSharedObserver();
  handlers.set(el, handler);
  shared.observe(el);
  return () => {
    shared.unobserve(el);
    handlers.delete(el);
  };
}

export function unobserveCard(el: Element): void {
  const shared = getSharedObserver();
  shared.unobserve(el);
  handlers.delete(el);
}
