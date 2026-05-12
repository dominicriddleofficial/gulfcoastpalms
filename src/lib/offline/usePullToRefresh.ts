import { useEffect, useRef, useState } from "react";

interface Opts {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  containerRef?: React.RefObject<HTMLElement>;
}

export function usePullToRefresh({ onRefresh, threshold = 70, containerRef }: Opts) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const armed = useRef(false);

  useEffect(() => {
    const target: HTMLElement | Window = containerRef?.current ?? window;

    const getScrollTop = () => {
      if (target === window) {
        return window.scrollY || document.documentElement.scrollTop || 0;
      }
      return (target as HTMLElement).scrollTop;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (refreshing) return;
      if (getScrollTop() > 0) {
        armed.current = false;
        return;
      }
      armed.current = true;
      startY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!armed.current || startY.current === null) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0) {
        setPullDistance(Math.min(delta, threshold * 1.5));
      }
    };

    const onTouchEnd = async () => {
      if (!armed.current) return;
      const shouldRefresh = pullDistance >= threshold;
      armed.current = false;
      startY.current = null;
      if (shouldRefresh) {
        setRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
        }
      }
      setPullDistance(0);
    };

    const t = target as unknown as EventTarget;
    t.addEventListener("touchstart", onTouchStart as EventListener, { passive: true });
    t.addEventListener("touchmove", onTouchMove as EventListener, { passive: true });
    t.addEventListener("touchend", onTouchEnd as EventListener);
    return () => {
      t.removeEventListener("touchstart", onTouchStart as EventListener);
      t.removeEventListener("touchmove", onTouchMove as EventListener);
      t.removeEventListener("touchend", onTouchEnd as EventListener);
    };
  }, [onRefresh, threshold, containerRef, pullDistance, refreshing]);

  return { pullDistance, refreshing };
}