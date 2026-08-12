"use client";

import * as React from "react";

const DEFAULT_PAGE_SIZE = 10;

export function useListPagination<T>(
  items: T[],
  options?: { pageSize?: number; resetKey?: string }
) {
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const resetKey = options?.resetKey ?? "";

  const [page, setPage] = React.useState(1);
  const [mobileCount, setMobileCount] = React.useState(pageSize);

  React.useEffect(() => {
    setPage(1);
    setMobileCount(pageSize);
  }, [resetKey, pageSize]);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(page, 1), totalPages);

  React.useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const desktopItems = items.slice((safePage - 1) * pageSize, safePage * pageSize);
  const mobileItems = items.slice(0, Math.min(mobileCount, total));
  const hasMoreMobile = mobileCount < total;

  const loadMoreMobile = React.useCallback(() => {
    setMobileCount((count) => Math.min(count + pageSize, total));
  }, [pageSize, total]);

  return {
    page: safePage,
    setPage,
    totalPages,
    total,
    pageSize,
    desktopItems,
    mobileItems,
    hasMoreMobile,
    loadMoreMobile,
    rangeStart: total === 0 ? 0 : (safePage - 1) * pageSize + 1,
    rangeEnd: Math.min(safePage * pageSize, total),
  };
}
