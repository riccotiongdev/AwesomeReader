/**
 * Spike-grade types for foliate-js (ticket 01). The library ships no
 * declarations. Replaced by the real adapter interface (ticket 03/04) —
 * UI code must never import foliate-js directly.
 */
declare module 'foliate-js/view.js' {
  // Spike-grade (ticket 01): the library ships no declarations. The real
  // adapter interface (tickets 03/04) replaces this; UI code must never
  // import foliate-js directly.
  export function makeBook(file: any): Promise<any>;
}
