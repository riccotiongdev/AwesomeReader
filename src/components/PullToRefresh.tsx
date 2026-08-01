'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  PULL_THRESHOLD,
  isAtScrollTop,
  clampPullDistance,
  dampedPullDistance,
  pullProgress,
  shouldTriggerRefresh,
  isOverlayOpen,
} from '@/lib/pull-gesture';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  isPullRefreshing: boolean;
  containerRef?: React.RefObject<HTMLElement | null>;
  threshold?: number;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  isRefreshing,
  isPullRefreshing,
  containerRef,
  threshold = PULL_THRESHOLD,
}) => {
  const startY = useRef<number | null>(null);
  const distanceRef = useRef(0);
  const [distance, setDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  const isBusy = isRefreshing || isPullRefreshing;

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (isBusy) return;
      if (isOverlayOpen(e.target as Element)) return;
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      if (!isAtScrollTop(scrollTop)) return;
      startY.current = e.touches[0].clientY;
    },
    [isBusy]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (startY.current === null || isBusy) return;
      const delta = e.touches[0].clientY - startY.current;
      const clamped = clampPullDistance(delta);
      distanceRef.current = clamped;
      setDistance(clamped);
      setIsPulling(clamped > 0);
      if (clamped > 0) e.preventDefault();
    },
    [isBusy]
  );

  const handleTouchEnd = useCallback(async () => {
    if (startY.current === null) return;
    startY.current = null;

    const releasedDistance = distanceRef.current;
    distanceRef.current = 0;
    setDistance(0);
    setIsPulling(false);

    if (releasedDistance > 0 && !isBusy && shouldTriggerRefresh(releasedDistance, threshold)) {
      await onRefresh();
    }
  }, [isBusy, threshold, onRefresh]);

  // A cancelled gesture (browser steal, notification shade, scroll takeover) must abort, not refresh
  const handleTouchCancel = useCallback(() => {
    startY.current = null;
    distanceRef.current = 0;
    setDistance(0);
    setIsPulling(false);
  }, []);

  useEffect(() => {
    const target = containerRef?.current || document.body;
    if (!target) return;

    target.addEventListener('touchstart', handleTouchStart, { passive: true });
    target.addEventListener('touchmove', handleTouchMove, { passive: false });
    target.addEventListener('touchend', handleTouchEnd);
    target.addEventListener('touchcancel', handleTouchCancel);

    return () => {
      target.removeEventListener('touchstart', handleTouchStart);
      target.removeEventListener('touchmove', handleTouchMove);
      target.removeEventListener('touchend', handleTouchEnd);
      target.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [containerRef, handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel]);

  const visible = isPulling || isPullRefreshing;
  const progress = isPullRefreshing ? 1 : pullProgress(distance, threshold);
  const isReady = progress >= 1;
  const pullPx = isPullRefreshing ? threshold : dampedPullDistance(distance);

  return (
    <div
      className="ptr-indicator"
      style={{
        transform: `translate(-50%, ${pullPx}px)`,
        opacity: visible ? 1 : 0,
      }}
      aria-hidden="true"
    >
      <div className={`ptr-spinner ${isPullRefreshing ? 'spinning' : ''}`}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: isReady && !isPullRefreshing ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
      <span className="ptr-label">
        {isPullRefreshing ? 'Refreshing…' : isReady ? 'Release to refresh' : 'Pull to refresh'}
      </span>
    </div>
  );
};
