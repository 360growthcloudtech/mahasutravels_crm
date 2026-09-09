"use client";

import * as React from "react";
import { AgGridReact } from "ag-grid-react";
import type {
  ColDef,
  ColumnState,
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
}: CrmGridProps<T>) {
  const dark = useIsDark();
  const apiRef = React.useRef<GridApi<T> | null>(null);
  const fetchPageRef = React.useRef(fetchPage);
  fetchPageRef.current = fetchPage;

  const makeDatasource = React.useCallback((): IDatasource => {
    return createGridDatasource<T>({
      fetchPage: (req) => fetchPageRef.current(req),
      fieldMap,
      onError,
      onStats,
      extractExtra,
    });
  }, [extractExtra, fieldMap, onError, onStats]);

  const onGridReady = React.useCallback(
    (event: GridReadyEvent<T>) => {
      apiRef.current = event.api;
      onGridApi?.(event.api);
      if (storageKey) {
        const stored = readLayout(storageKey);
        if (stored?.state?.length) {
          event.api.applyColumnState({ state: stored.state, applyOrder: true });
        }
      }
      event.api.setGridOption("datasource", makeDatasource());
    },
    [makeDatasource, onGridApi, storageKey]
  );

  React.useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    api.setGridOption("datasource", makeDatasource());
  }, [toolbarKey, makeDatasource]);

  React.useEffect(() => {
    return () => {
      onGridApi?.(null);
      apiRef.current = null;
    };
  }, [onGridApi]);

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
