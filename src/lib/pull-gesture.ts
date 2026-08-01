export const PULL_THRESHOLD = 72;
export const PULL_DAMPING = 0.5;
export const OVERLAY_SELECTOR = '.reader-modal-backdrop, .modal-backdrop';

export function isAtScrollTop(scrollTop: number): boolean {
  return scrollTop <= 0;
}

export function clampPullDistance(deltaY: number): number {
  return Math.max(0, deltaY);
}

export function dampedPullDistance(distance: number, factor: number = PULL_DAMPING): number {
  return distance * factor;
}

export function pullProgress(distance: number, threshold: number = PULL_THRESHOLD): number {
  return Math.min(1, distance / threshold);
}

export function shouldTriggerRefresh(distance: number, threshold: number = PULL_THRESHOLD): boolean {
  return distance >= threshold;
}

export function isOverlayOpen(target: { closest(selector: string): unknown } | null | undefined): boolean {
  return Boolean(target && target.closest(OVERLAY_SELECTOR));
}
