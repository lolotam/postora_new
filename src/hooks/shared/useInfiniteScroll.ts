import { useCallback, useRef, useEffect, useState } from "react";

interface UseInfiniteScrollOptions {
  /**
   * Callback to load more items
   */
  onLoadMore: () => void;
  /**
   * Whether there are more items to load
   */
  hasMore: boolean;
  /**
   * Whether currently loading
   */
  isLoading: boolean;
  /**
   * Threshold in pixels from bottom to trigger load
   */
  threshold?: number;
  /**
   * Whether the infinite scroll is enabled
   */
  enabled?: boolean;
}

/**
 * Hook for implementing infinite scroll functionality
 */
export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  threshold = 200,
  enabled = true,
}: UseInfiniteScrollOptions) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  // Callback for the intersection observer
  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      setIsIntersecting(entry.isIntersecting);
      
      if (entry.isIntersecting && hasMore && !isLoading && enabled) {
        onLoadMore();
      }
    },
    [hasMore, isLoading, enabled, onLoadMore]
  );

  // Set up the intersection observer
  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element || !enabled) return;

    observerRef.current = new IntersectionObserver(handleIntersection, {
      rootMargin: `${threshold}px`,
      threshold: 0,
    });

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleIntersection, threshold, enabled]);

  return {
    loadMoreRef,
    isIntersecting,
  };
}

/**
 * Simple scroll-based infinite scroll for ScrollArea components
 */
export function useScrollAreaInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  threshold = 100,
  enabled = true,
}: UseInfiniteScrollOptions) {
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(false);

  const handleScroll = useCallback(() => {
    const element = scrollAreaRef.current;
    if (!element || !enabled) return;

    // Find the actual scrollable viewport inside the ScrollArea
    const viewport = element.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    if (!viewport) return;

    const { scrollTop, scrollHeight, clientHeight } = viewport;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    const nearBottom = distanceFromBottom < threshold;
    setIsNearBottom(nearBottom);

    if (nearBottom && hasMore && !isLoading) {
      onLoadMore();
    }
  }, [hasMore, isLoading, enabled, threshold, onLoadMore]);

  useEffect(() => {
    const element = scrollAreaRef.current;
    if (!element || !enabled) return;

    const viewport = element.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    if (!viewport) return;

    viewport.addEventListener("scroll", handleScroll, { passive: true });
    
    return () => {
      viewport.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll, enabled]);

  return {
    scrollAreaRef,
    isNearBottom,
  };
}
