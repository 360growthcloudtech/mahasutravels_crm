"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AgGridReact } from "ag-grid-react";
import type {
  ColDef,
  ColumnState,
  FilterChangedEvent,
  GridApi,
  GridReadyEvent,
  IDatasource,
} from "ag-grid-community";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createGridDatasource,
  type CreateGridDatasourceOptions,
  type GridPageRequest,
  type GridPageResult,
} from "@/components/crm/grid/crm-grid-datasource";
import {
  CRM_GRID_PAGE_SIZE,
  crmBaseGridOptions,
  crmGridTheme,
} from "@/components/crm/grid/crm-grid-options";

type StoredColumnLayout = {
  state: ColumnState[];
};

function readLayout(key: string): StoredColumnLayout | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredColumnLayout;
    if (!parsed?.state || !Array.isArray(parsed.state)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLayout(key: string, state: ColumnState[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify({ state }));
  } catch {
    /* ignore quota */
  }
}

function useIsDark(): boolean {
  const [dark, setDark] = React.useState(false);
  React.useEffect(() => {
    const root = document.documentElement;
    const sync = () => setDark(root.classList.contains("dark"));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

function getHorizontalScrollers(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  const bar = root.querySelector<HTMLElement>(".ag-body-horizontal-scroll-viewport");
  const center = root.querySelector<HTMLElement>(".ag-center-cols-viewport");
  return [bar, center].filter((el): el is HTMLElement => Boolean(el));
}

/** Always-visible L/R arrows pinned inside AG Grid's horizontal scrollbar strip. */
function CrmGridScrollArrows({
  hostRef,
  ready,
}: {
  hostRef: React.RefObject<HTMLDivElement | null>;
  ready: boolean;
}) {
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);
  const [arrowHost, setArrowHost] = React.useState<HTMLElement | null>(null);

  const updateScrollState = React.useCallback(() => {
    const els = getHorizontalScrollers(hostRef.current);
    const el =
      els.find((node) => node.classList.contains("ag-body-horizontal-scroll-viewport")) ??
      els[0];
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const max = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(max > 2 && el.scrollLeft > 2);
    setCanScrollRight(max > 2 && max - el.scrollLeft > 2);
  }, [hostRef]);

  React.useEffect(() => {
    if (!ready) return;
    const root = hostRef.current;
    if (!root) return;

    const attached = new Set<HTMLElement>();
    let ro: ResizeObserver | null = null;
    let currentBar: HTMLElement | null = null;

    const detach = () => {
      for (const el of attached) {
        el.removeEventListener("scroll", updateScrollState);
      }
      attached.clear();
      ro?.disconnect();
      ro = null;
    };

    const ensureArrowHost = (bar: HTMLElement) => {
      let host = bar.querySelector<HTMLElement>(":scope > .crm-ag-hscroll-arrows");
      if (!host) {
        host = document.createElement("div");
        host.className = "crm-ag-hscroll-arrows";
        bar.appendChild(host);
      }
      setArrowHost((prev) => (prev === host ? prev : host));
      return host;
    };

    const attach = () => {
      const bar = root.querySelector<HTMLElement>(".ag-body-horizontal-scroll");
      const next = getHorizontalScrollers(root);

      if (!bar) {
        currentBar = null;
        setArrowHost(null);
        detach();
        updateScrollState();
        return;
      }

      ensureArrowHost(bar);

      if (bar !== currentBar) {
        currentBar = bar;
        detach();
        ro = new ResizeObserver(updateScrollState);
        ro.observe(bar);
        ro.observe(root);
        for (const el of next) {
          el.addEventListener("scroll", updateScrollState, { passive: true });
          ro.observe(el);
          attached.add(el);
        }
      } else {
        // Bar still present — keep scroll listeners, but re-bind any new viewport nodes.
        for (const el of next) {
          if (attached.has(el)) continue;
          el.addEventListener("scroll", updateScrollState, { passive: true });
          ro?.observe(el);
          attached.add(el);
        }
      }

      updateScrollState();
    };

    attach();
    const mo = new MutationObserver((mutations) => {
      // Ignore our own arrow host mutations to avoid feedback loops.
      const selfOnly = mutations.every((m) => {
        const nodes = [...m.addedNodes, ...m.removedNodes];
        return (
          nodes.length > 0 &&
          nodes.every(
            (n) =>
              n instanceof HTMLElement &&
              (n.classList.contains("crm-ag-hscroll-arrows") ||
                n.classList.contains("crm-ag-hscroll-arrow") ||
                n.closest?.(".crm-ag-hscroll-arrows"))
          )
        );
      });
      if (selfOnly) return;
      attach();
    });
    mo.observe(root, { childList: true, subtree: true });
    window.addEventListener("resize", updateScrollState);
    const timer = window.setTimeout(attach, 80);

    return () => {
      window.clearTimeout(timer);
      mo.disconnect();
      window.removeEventListener("resize", updateScrollState);
      detach();
      setArrowHost(null);
    };
  }, [hostRef, ready, updateScrollState]);

  function scrollByDir(dir: -1 | 1) {
    const els = getHorizontalScrollers(hostRef.current);
    if (!els.length) return;
    const primary =
      els.find((node) => node.classList.contains("ag-body-horizontal-scroll-viewport")) ??
      els[0];
    const amount = Math.max(240, Math.round(primary.clientWidth * 0.55));
    for (const el of els) {
      el.scrollBy({ left: dir * amount, behavior: "smooth" });
    }
  }

  if (!arrowHost) return null;

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Scroll grid left"
        disabled={!canScrollLeft}
        className="crm-ag-hscroll-arrow crm-ag-hscroll-arrow-left"
        onClick={() => scrollByDir(-1)}
      >
        <ChevronLeft className="size-3.5" />
      </button>
      <button
        type="button"
        aria-label="Scroll grid right"
        disabled={!canScrollRight}
        className="crm-ag-hscroll-arrow crm-ag-hscroll-arrow-right"
        onClick={() => scrollByDir(1)}
      >
        <ChevronRight className="size-3.5" />
      </button>
    </>,
    arrowHost
  );
}

export type CrmGridProps<T extends { id: string }> = {
  columnDefs: ColDef<T>[];
  fetchPage: (request: GridPageRequest) => Promise<GridPageResult<T> & Record<string, unknown>>;
  /** Change this when toolbar filters change to reload infinite cache */
  toolbarKey: string;
  storageKey?: string;
  className?: string;
  fieldMap?: Record<string, string>;
  context?: unknown;
  onError?: (error: unknown) => void;
  onStats?: CreateGridDatasourceOptions<T>["onStats"];
  extractExtra?: CreateGridDatasourceOptions<T>["extractExtra"];
  getRowId?: (data: T) => string;
  onGridApi?: (api: GridApi<T> | null) => void;
  /** Fired when AG Grid column filters become active or inactive */
  onColumnFiltersChange?: (active: boolean) => void;
};

/**
 * Absolute-fill pattern: parent must be a positioned flex child with min-h-0
 * (e.g. `relative min-h-0 flex-1`). Avoids AG Grid / flex height feedback loops.
 */
export function CrmGrid<T extends { id: string }>({
  columnDefs,
  fetchPage,
  toolbarKey,
  storageKey,
  className,
  fieldMap,
  context,
  onError,
  onStats,
  extractExtra,
  getRowId,
  onGridApi,
  onColumnFiltersChange,
}: CrmGridProps<T>) {
  const dark = useIsDark();
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const apiRef = React.useRef<GridApi<T> | null>(null);
  const fetchPageRef = React.useRef(fetchPage);
  const onErrorRef = React.useRef(onError);
  const onStatsRef = React.useRef(onStats);
  const extractExtraRef = React.useRef(extractExtra);
  const fieldMapRef = React.useRef(fieldMap);
  const onGridApiRef = React.useRef(onGridApi);
  const onColumnFiltersChangeRef = React.useRef(onColumnFiltersChange);
  const datasourceRef = React.useRef<IDatasource | null>(null);
  const readyRef = React.useRef(false);
  const toolbarKeyRef = React.useRef(toolbarKey);
  const [gridReady, setGridReady] = React.useState(false);

  fetchPageRef.current = fetchPage;
  onErrorRef.current = onError;
  onStatsRef.current = onStats;
  extractExtraRef.current = extractExtra;
  fieldMapRef.current = fieldMap;
  onGridApiRef.current = onGridApi;
  onColumnFiltersChangeRef.current = onColumnFiltersChange;

  const notifyColumnFilters = React.useCallback((api: GridApi<T>) => {
    const model = api.getFilterModel() ?? {};
    onColumnFiltersChangeRef.current?.(Object.keys(model).length > 0);
  }, []);

  const makeDatasource = React.useCallback((): IDatasource => {
    return createGridDatasource<T>({
      fetchPage: (req) => fetchPageRef.current(req),
      fieldMap: fieldMapRef.current,
      onError: (error) => onErrorRef.current?.(error),
      onStats: (meta) => onStatsRef.current?.(meta),
      extractExtra: (result) => extractExtraRef.current?.(result),
    });
  }, []);

  /** Reload rows for new toolbar filters without replacing the datasource (that clears column filters). */
  const reloadForToolbar = React.useCallback((api: GridApi<T>) => {
    const filterModel = api.getFilterModel() ?? {};
    const hadFilters = Object.keys(filterModel).length > 0;
    try {
      api.paginationGoToFirstPage();
    } catch {
      /* grid may not be pagination-ready yet */
    }
    try {
      // Keep the same datasource — fetchPage already reads latest toolbar filters via refs.
      // Replacing it with a new instance resets AG Grid column filters.
      api.purgeInfiniteCache();
    } catch {
      /* ignore if model not ready */
    }
    if (!hadFilters) return;
    const after = api.getFilterModel() ?? {};
    if (Object.keys(after).length === 0) {
      api.setFilterModel(filterModel);
    }
  }, []);

  const onGridReady = React.useCallback(
    (event: GridReadyEvent<T>) => {
      apiRef.current = event.api;
      readyRef.current = true;
      setGridReady(true);
      onGridApiRef.current?.(event.api);
      if (storageKey) {
        const stored = readLayout(storageKey);
        if (stored?.state?.length) {
          event.api.applyColumnState({ state: stored.state, applyOrder: true });
        }
      }
      datasourceRef.current = makeDatasource();
      event.api.setGridOption("datasource", datasourceRef.current);
      notifyColumnFilters(event.api);
    },
    [makeDatasource, notifyColumnFilters, storageKey]
  );

  const onFilterChanged = React.useCallback(
    (event: FilterChangedEvent<T>) => {
      notifyColumnFilters(event.api);
    },
    [notifyColumnFilters]
  );

  React.useEffect(() => {
    const api = apiRef.current;
    if (!api || !readyRef.current) return;
    // Skip the mount/ready pass — onGridReady already set the datasource.
    if (toolbarKeyRef.current === toolbarKey) return;
    toolbarKeyRef.current = toolbarKey;
    reloadForToolbar(api);
  }, [toolbarKey, reloadForToolbar]);

  // Unmount only — do not clear api when parent passes a new onGridApi identity
  // (that used to break toolbar filter reloads).
  React.useEffect(() => {
    return () => {
      readyRef.current = false;
      setGridReady(false);
      onColumnFiltersChangeRef.current?.(false);
      onGridApiRef.current?.(null);
      apiRef.current = null;
    };
  }, []);

  const persistColumns = React.useCallback(() => {
    if (!storageKey || !apiRef.current) return;
    writeLayout(storageKey, apiRef.current.getColumnState());
  }, [storageKey]);

  const base = crmBaseGridOptions<T>();

  return (
    <div
      ref={hostRef}
      className={cn(
        "crm-ag-grid absolute inset-0 overflow-hidden rounded-lg border border-border-soft bg-card",
        className
      )}
    >
      <CrmGridScrollArrows hostRef={hostRef} ready={gridReady} />
      <AgGridReact<T>
        theme={crmGridTheme(dark)}
        columnDefs={columnDefs}
        context={context}
        containerStyle={{ width: "100%", height: "100%" }}
        {...base}
        cacheBlockSize={CRM_GRID_PAGE_SIZE}
        paginationPageSize={CRM_GRID_PAGE_SIZE}
        getRowId={(p) => (getRowId && p.data ? getRowId(p.data) : String(p.data?.id ?? ""))}
        onGridReady={onGridReady}
        onFilterChanged={onFilterChanged}
        onColumnMoved={persistColumns}
        onColumnVisible={persistColumns}
        onColumnResized={(e) => {
          if (e.finished) persistColumns();
        }}
        onColumnPinned={persistColumns}
        overlayNoRowsTemplate='<span class="text-sm text-slate-soft">No rows found</span>'
        overlayLoadingTemplate='<span class="text-sm text-slate-soft">Loading…</span>'
      />
    </div>
  );
}

export type { GridPageRequest, GridPageResult };
