import { describe, expect, it } from 'vitest';
import {
  isAtScrollTop,
  clampPullDistance,
  dampedPullDistance,
  pullProgress,
  shouldTriggerRefresh,
  isOverlayOpen,
  PULL_THRESHOLD,
  PULL_DAMPING,
  OVERLAY_SELECTOR,
} from '@/lib/pull-gesture';

describe('isAtScrollTop', () => {
  it('allows the gesture at the very top', () => {
    expect(isAtScrollTop(0)).toBe(true);
  });

  it('allows the gesture slightly above the top (elastic overscroll)', () => {
    expect(isAtScrollTop(-10)).toBe(true);
  });

  it('rejects the gesture once the user has scrolled down', () => {
    expect(isAtScrollTop(10)).toBe(false);
  });
});

describe('clampPullDistance', () => {
  it('keeps a downward pull distance positive', () => {
    expect(clampPullDistance(40)).toBe(40);
  });

  it('clamps upward (negative) movement to zero', () => {
    expect(clampPullDistance(-20)).toBe(0);
  });
});

describe('pullProgress', () => {
  it('is zero before any pull', () => {
    expect(pullProgress(0)).toBe(0);
  });

  it('scales distance relative to the threshold', () => {
    expect(pullProgress(PULL_THRESHOLD / 2)).toBe(0.5);
  });

  it('caps at 1 once the threshold is crossed', () => {
    expect(pullProgress(PULL_THRESHOLD)).toBe(1);
    expect(pullProgress(PULL_THRESHOLD * 2)).toBe(1);
  });

  it('honours a custom threshold', () => {
    expect(pullProgress(30, 60)).toBe(0.5);
  });
});

describe('dampedPullDistance', () => {
  it('applies the default damping factor to the finger movement', () => {
    expect(dampedPullDistance(100)).toBe(100 * PULL_DAMPING);
  });

  it('returns zero for no movement', () => {
    expect(dampedPullDistance(0)).toBe(0);
  });

  it('honours a custom damping factor', () => {
    expect(dampedPullDistance(80, 0.25)).toBe(20);
  });
});

describe('shouldTriggerRefresh', () => {
  it('does not trigger below the threshold', () => {
    expect(shouldTriggerRefresh(PULL_THRESHOLD - 1)).toBe(false);
  });

  it('triggers at exactly the threshold', () => {
    expect(shouldTriggerRefresh(PULL_THRESHOLD)).toBe(true);
  });

  it('triggers past the threshold', () => {
    expect(shouldTriggerRefresh(PULL_THRESHOLD + 50)).toBe(true);
  });
});

describe('isOverlayOpen', () => {
  const targetWithClosest = (matches: boolean) => ({
    closest: (selector: string) => (matches ? selector : null),
  });

  it('returns false when there is no touch target', () => {
    expect(isOverlayOpen(null)).toBe(false);
    expect(isOverlayOpen(undefined)).toBe(false);
  });

  it('returns false when the target is not inside an overlay', () => {
    expect(isOverlayOpen(targetWithClosest(false))).toBe(false);
  });

  it('returns true when the target is inside an overlay', () => {
    expect(isOverlayOpen(targetWithClosest(true))).toBe(true);
  });

  it('guards against the reader and dialog overlays', () => {
    expect(OVERLAY_SELECTOR).toBe('.reader-modal-backdrop, .modal-backdrop');
  });
});
