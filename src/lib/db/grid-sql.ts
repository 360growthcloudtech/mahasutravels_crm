import type { GridColumnFilter, GridSort } from "@/lib/api/grid-query";
import { IST_TIME_ZONE } from "@/lib/db/ist-calendar";

/**
 * Allowlisted SQL expressions for ORDER BY / column filters.
 * Keys are client `sortBy` / filter field ids — never interpolate raw user input.
 */
export type GridSqlColumn = {
  /** Parameterized SQL expression, e.g. `l.name` or `(l.created_at AT TIME ZONE 'Asia/Kolkata')::date` */
  expr: string;
  kind: "text" | "number" | "date" | "timestamptz";
};

export function buildGridOrderBy(
  sort: GridSort,
  columns: Record<string, GridSqlColumn>,
  fallbackSql: string
): string {
  if (!sort) return fallbackSql;
  const col = columns[sort.sortBy];
  if (!col) return fallbackSql;
  const dir = sort.sortDir === "desc" ? "DESC" : "ASC";
  // NULLS LAST keeps empty values predictable for CRM lists.
  return `${col.expr} ${dir} NULLS LAST`;
}

function pushParam(params: unknown[], value: unknown): number {
  params.push(value);
  return params.length;
}

function textClause(
  expr: string,
  filter: Extract<GridColumnFilter, { type: "text" }>,
  params: unknown[]
): string | null {
  if (filter.operator === "blank") return `(${expr} IS NULL OR btrim(${expr}::text) = '')`;
  if (filter.operator === "notBlank") return `(${expr} IS NOT NULL AND btrim(${expr}::text) <> '')`;

  const value = filter.filter.trim();
  if (!value && filter.operator !== "equals") return null;
  const lower = value.toLowerCase();

  switch (filter.operator) {
    case "equals": {
      const i = pushParam(params, lower);
      return `lower(${expr}::text) = $${i}`;
    }
    case "startsWith": {
      const i = pushParam(params, `${lower}%`);
      return `lower(${expr}::text) LIKE $${i}`;
    }
    case "endsWith": {
      const i = pushParam(params, `%${lower}`);
      return `lower(${expr}::text) LIKE $${i}`;
    }
    case "notContains": {
      const i = pushParam(params, `%${lower}%`);
      return `lower(${expr}::text) NOT LIKE $${i}`;
    }
    case "contains":
    default: {
      const i = pushParam(params, `%${lower}%`);
      return `lower(${expr}::text) LIKE $${i}`;
    }
  }
}

function numberClause(
  expr: string,
  filter: Extract<GridColumnFilter, { type: "number" }>,
  params: unknown[]
): string | null {
  if (filter.operator === "blank") return `${expr} IS NULL`;
  if (filter.operator === "notBlank") return `${expr} IS NOT NULL`;

  if (filter.operator === "inRange") {
    if (filter.filter == null || filter.filterTo == null) return null;
    const a = pushParam(params, filter.filter);
    const b = pushParam(params, filter.filterTo);
    return `${expr} >= $${a} AND ${expr} <= $${b}`;
  }

  if (filter.filter == null) return null;
  const i = pushParam(params, filter.filter);
  switch (filter.operator) {
    case "notEqual":
      return `${expr} <> $${i}`;
    case "lessThan":
      return `${expr} < $${i}`;
    case "lessThanOrEqual":
      return `${expr} <= $${i}`;
    case "greaterThan":
      return `${expr} > $${i}`;
    case "greaterThanOrEqual":
      return `${expr} >= $${i}`;
    case "equals":
    default:
      return `${expr} = $${i}`;
  }
}

/** Date-only / timestamptz filters using IST calendar days where kind is timestamptz. */
function dateClause(
  col: GridSqlColumn,
  filter: Extract<GridColumnFilter, { type: "date" }>,
  params: unknown[]
): string | null {
  const expr =
    col.kind === "timestamptz"
      ? `(${col.expr} AT TIME ZONE '${IST_TIME_ZONE}')::date`
      : col.kind === "date"
        ? `${col.expr}::date`
        : col.expr;

  if (filter.operator === "blank") return `${col.expr} IS NULL`;
  if (filter.operator === "notBlank") return `${col.expr} IS NOT NULL`;

  if (filter.operator === "inRange") {
    if (!filter.dateFrom || !filter.dateTo) return null;
    const a = pushParam(params, filter.dateFrom);
    const b = pushParam(params, filter.dateTo);
    return `${expr} >= $${a}::date AND ${expr} <= $${b}::date`;
  }

  if (!filter.dateFrom) return null;
  const i = pushParam(params, filter.dateFrom);
  switch (filter.operator) {
    case "notEqual":
      return `${expr} <> $${i}::date`;
    case "lessThan":
      return `${expr} < $${i}::date`;
    case "greaterThan":
      return `${expr} > $${i}::date`;
    case "equals":
    default:
      return `${expr} = $${i}::date`;
  }
}

export function appendGridColumnFilterClauses(
  filters: GridColumnFilter[],
  columns: Record<string, GridSqlColumn>,
  clauses: string[],
  params: unknown[]
): void {
  for (const filter of filters) {
    const col = columns[filter.field];
    if (!col) continue;
    let clause: string | null = null;
    if (filter.type === "text") clause = textClause(col.expr, filter, params);
    else if (filter.type === "number") clause = numberClause(col.expr, filter, params);
    else clause = dateClause(col, filter, params);
    if (clause) clauses.push(clause);
  }
}
