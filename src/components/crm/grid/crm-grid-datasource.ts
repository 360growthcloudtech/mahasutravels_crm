"use client";

import type { IDatasource, IGetRowsParams, SortModelItem } from "ag-grid-community";
import {
  DEFAULT_GRID_PAGE_SIZE,
  serializeAgFilterModel,
} from "@/lib/api/grid-query";

export type GridPageRequest = {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  /** JSON-serializable column filters from AG Grid filterModel */
  colFilters?: Array<Record<string, unknown>>;
};

export type GridPageResult<T> = {
  rows: T[];
  total: number;
};

export type CreateGridDatasourceOptions<T> = {
  fetchPage: (request: GridPageRequest) => Promise<GridPageResult<T>>;
  /** Map AG Grid colId → API field id when they differ */
  fieldMap?: Record<string, string>;
  onError?: (error: unknown) => void;
  onStats?: (meta: { total: number; page: number; pageSize: number; extra?: unknown }) => void;
  /** Optional hook to attach API extra payload (e.g. stats) */
  extractExtra?: (result: GridPageResult<T> & Record<string, unknown>) => unknown;
};

function mapSort(sortModel: SortModelItem[] | undefined, fieldMap?: Record<string, string>) {
  const first = sortModel?.[0];
  if (!first?.colId) return {};
  const sortBy = fieldMap?.[first.colId] ?? first.colId;
  const sortDir = first.sort === "desc" ? ("desc" as const) : ("asc" as const);
  return { sortBy, sortDir };
}

export function createGridDatasource<T>(
  options: CreateGridDatasourceOptions<T>
): IDatasource {
  return {
    getRows(params: IGetRowsParams) {
      const pageSize = Math.max(1, params.endRow - params.startRow) || DEFAULT_GRID_PAGE_SIZE;
      const page = Math.floor(params.startRow / pageSize) + 1;
      const { sortBy, sortDir } = mapSort(params.sortModel, options.fieldMap);
      const colFilters = serializeAgFilterModel(
        params.filterModel as Record<string, unknown> | null,
        options.fieldMap
      );

      void (async () => {
        try {
          const result = await options.fetchPage({
            page,
            pageSize,
            sortBy,
            sortDir,
            colFilters: colFilters.length ? colFilters : undefined,
          });
          const lastRow = result.total;
          options.onStats?.({
            total: result.total,
            page,
            pageSize,
            extra: options.extractExtra?.(result as GridPageResult<T> & Record<string, unknown>),
          });
          params.successCallback(result.rows, lastRow);
        } catch (error) {
          options.onError?.(error);
          params.failCallback();
        }
      })();
    },
  };
}
