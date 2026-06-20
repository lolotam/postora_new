import { useState, useMemo, useCallback } from "react";

interface UsePaginationOptions<T> {
  /** Items to paginate */
  items: T[];
  /** Items per page (default: 10) */
  pageSize?: number;
  /** Initial page (default: 1) */
  initialPage?: number;
}

interface UsePaginationReturn<T> {
  /** Current page items */
  currentItems: T[];
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Total number of items */
  totalItems: number;
  /** Whether there's a previous page */
  hasPrevious: boolean;
  /** Whether there's a next page */
  hasNext: boolean;
  /** Go to a specific page */
  goToPage: (page: number) => void;
  /** Go to the next page */
  nextPage: () => void;
  /** Go to the previous page */
  previousPage: () => void;
  /** Go to the first page */
  firstPage: () => void;
  /** Go to the last page */
  lastPage: () => void;
  /** Current page size */
  pageSize: number;
  /** Update page size */
  setPageSize: (size: number) => void;
  /** Page info for display (e.g., "Showing 1-10 of 100") */
  pageInfo: {
    start: number;
    end: number;
    total: number;
  };
}

/**
 * Hook for client-side pagination
 * 
 * @example
 * const { currentItems, currentPage, totalPages, nextPage, previousPage } = usePagination({
 *   items: posts,
 *   pageSize: 20,
 * });
 * 
 * return (
 *   <>
 *     {currentItems.map(post => <PostCard key={post.id} post={post} />)}
 *     <div>
 *       <Button onClick={previousPage} disabled={currentPage === 1}>Previous</Button>
 *       <span>Page {currentPage} of {totalPages}</span>
 *       <Button onClick={nextPage} disabled={currentPage === totalPages}>Next</Button>
 *     </div>
 *   </>
 * );
 */
export function usePagination<T>({
  items,
  pageSize: initialPageSize = 10,
  initialPage = 1,
}: UsePaginationOptions<T>): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Reset to page 1 if current page is out of bounds
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  if (validCurrentPage !== currentPage) {
    setCurrentPage(validCurrentPage);
  }

  const currentItems = useMemo(() => {
    const start = (validCurrentPage - 1) * pageSize;
    const end = start + pageSize;
    return items.slice(start, end);
  }, [items, validCurrentPage, pageSize]);

  const hasPrevious = validCurrentPage > 1;
  const hasNext = validCurrentPage < totalPages;

  const goToPage = useCallback(
    (page: number) => {
      const validPage = Math.min(Math.max(1, page), totalPages);
      setCurrentPage(validPage);
    },
    [totalPages]
  );

  const nextPage = useCallback(() => {
    if (hasNext) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [hasNext]);

  const previousPage = useCallback(() => {
    if (hasPrevious) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [hasPrevious]);

  const firstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const lastPage = useCallback(() => {
    setCurrentPage(totalPages);
  }, [totalPages]);

  const handleSetPageSize = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);

  const pageInfo = useMemo(() => {
    const start = totalItems === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1;
    const end = Math.min(validCurrentPage * pageSize, totalItems);
    return { start, end, total: totalItems };
  }, [validCurrentPage, pageSize, totalItems]);

  return {
    currentItems,
    currentPage: validCurrentPage,
    totalPages,
    totalItems,
    hasPrevious,
    hasNext,
    goToPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    pageSize,
    setPageSize: handleSetPageSize,
    pageInfo,
  };
}
