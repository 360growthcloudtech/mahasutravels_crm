/** Shared parsers for AG Grid Community infinite/pagination query params. */

export type GridSortDir = "asc" | "desc";

export type GridSort = {
  sortBy: string;
  sortDir: GridSortDir;
} | null;

export type GridColumnFilterType = "text" | "number" | "date";

export type GridTextFilter = {
  field: string;
  type: "text";
  operator: "contains" | "equals" | "startsWith" | "endsWith" | "notContains" | "blank" | "notBlank";
  filter: string;
};

export type GridNumberFilter = {
  field: string;
  type: "number";
  operator: "equals" | "notEqual" | "lessThan" | "lessThanOrEqual" | "greaterThan" | "greaterThanOrEqual" | "inRange" | "blank" | "notBlank";
  filter: number | null;
  filterTo: number | null;
};

export type GridDateFilter = {
  field: string;
  type: "date";
  operator: "equals" | "notEqual" | "lessThan" | "greaterThan" | "inRange" | "blank" | "notBlank";
  dateFrom: string | null;
  dateTo: string | null;
};

export type GridColumnFilter = GridTextFilter | GridNumberFilter | GridDateFilter;

export type GridFilterAllowlist = Record<string, GridColumnFilterType>;

export const DEFAULT_GRID_PAGE_SIZE = 25;
export const MAX_GRID_PAGE_SIZE = 100;

export function parseGridPagination(searchParams: URLSearchParams): {
  page: number;
  pageSize: number;
  paginated: boolean;
} {
  const pageRaw = Number(searchParams.get("page") || "1");
  const sizeRaw = Number(searchParams.get("pageSize") || searchParams.get("limit") || String(DEFAULT_GRID_PAGE_SIZE));
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const pageSize = Number.isFinite(sizeRaw)
    ? Math.min(Math.max(Math.floor(sizeRaw), 1), MAX_GRID_PAGE_SIZE)
    : DEFAULT_GRID_PAGE_SIZE;
  const paginated = searchParams.get("all") !== "1";
  return { page, pageSize, paginated };
}

export function parseGridSort(
  searchParams: URLSearchParams,
  allowedColumns: readonly string[]
): GridSort {
  const sortByRaw = searchParams.get("sortBy")?.trim() || "";
  if (!sortByRaw || !allowedColumns.includes(sortByRaw)) return null;
  const dirRaw = (searchParams.get("sortDir") || "asc").toLowerCase();
  const sortDir: GridSortDir = dirRaw === "desc" ? "desc" : "asc";
  return { sortBy: sortByRaw, sortDir };
}

function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function asNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapTextOperator(raw: string | undefined): GridTextFilter["operator"] {
  switch (raw) {
    case "equals":
    case "startsWith":
    case "endsWith":
    case "notContains":
    case "blank":
    case "notBlank":
      return raw;
    case "notEqual":
      return "notContains";
    default:
      return "contains";
  }
}

function mapNumberOperator(raw: string | undefined): GridNumberFilter["operator"] {
  switch (raw) {
    case "equals":
    case "notEqual":
    case "lessThan":
    case "lessThanOrEqual":
    case "greaterThan":
    case "greaterThanOrEqual":
    case "inRange":
    case "blank":
    case "notBlank":
      return raw;
    default:
      return "equals";
  }
}

function mapDateOperator(raw: string | undefined): GridDateFilter["operator"] {
  switch (raw) {
    case "equals":
    case "notEqual":
    case "lessThan":
    case "greaterThan":
    case "inRange":
    case "blank":
    case "notBlank":
      return raw;
    default:
      return "equals";
  }
}

/**
 * Accepts either:
 * - `colFilters` JSON array from the grid datasource, or
 * - legacy flat params (ignored when JSON present).
 */
export function parseGridColumnFilters(
  searchParams: URLSearchParams,
  allowed: GridFilterAllowlist
): GridColumnFilter[] {
  const raw = searchParams.get("colFilters")?.trim();
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const out: GridColumnFilter[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const field = typeof rec.field === "string" ? rec.field : "";
    const allowedType = allowed[field];
    if (!allowedType) continue;

    if (allowedType === "text") {
      out.push({
        field,
        type: "text",
        operator: mapTextOperator(typeof rec.operator === "string" ? rec.operator : undefined),
        filter: typeof rec.filter === "string" ? rec.filter : String(rec.filter ?? ""),
      });
      continue;
    }

    if (allowedType === "number") {
      out.push({
        field,
        type: "number",
        operator: mapNumberOperator(typeof rec.operator === "string" ? rec.operator : undefined),
        filter: asNumber(rec.filter),
        filterTo: asNumber(rec.filterTo),
      });
      continue;
    }

    const dateFrom =
      typeof rec.dateFrom === "string" && isDateOnly(rec.dateFrom.slice(0, 10))
        ? rec.dateFrom.slice(0, 10)
        : null;
    const dateTo =
      typeof rec.dateTo === "string" && isDateOnly(rec.dateTo.slice(0, 10))
        ? rec.dateTo.slice(0, 10)
        : null;
    out.push({
      field,
      type: "date",
      operator: mapDateOperator(typeof rec.operator === "string" ? rec.operator : undefined),
      dateFrom,
      dateTo,
    });
  }
  return out;
}

/** Serialize AG Grid filterModel into a transportable array. */
export function serializeAgFilterModel(
  filterModel: Record<string, unknown> | null | undefined,
  fieldMap?: Record<string, string>
): Array<Record<string, unknown>> {
  if (!filterModel) return [];
  const out: Array<Record<string, unknown>> = [];
  for (const [colId, model] of Object.entries(filterModel)) {
    if (!model || typeof model !== "object") continue;
    const m = model as Record<string, unknown>;
    const field = fieldMap?.[colId] ?? colId;
    const filterType = typeof m.filterType === "string" ? m.filterType : "text";
    if (filterType === "number") {
      out.push({
        field,
        operator: m.type,
        filter: m.filter,
        filterTo: m.filterTo,
      });
    } else if (filterType === "date") {
      out.push({
        field,
        operator: m.type,
        dateFrom: typeof m.dateFrom === "string" ? m.dateFrom.slice(0, 10) : null,
        dateTo: typeof m.dateTo === "string" ? m.dateTo.slice(0, 10) : null,
      });
    } else {
      out.push({
        field,
        operator: m.type,
        filter: m.filter ?? "",
      });
    }
  }
  return out;
}
