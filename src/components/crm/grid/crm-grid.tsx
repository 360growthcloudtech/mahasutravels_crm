"use client";

import * as React from "react";
import { AgGridReact } from "ag-grid-react";
import type {
  ColDef,
  ColumnState,
  FilterChangedEvent,
  GridApi,
  GridReadyEvent,
  IDatasource,
} from "ag-grid-community";
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
      className={cn(
        "crm-ag-grid absolute inset-0 overflow-hidden rounded-lg border border-border-soft bg-card",
        className
      )}
    >
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
