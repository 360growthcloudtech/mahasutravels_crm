import { query } from "@/lib/db";
import type { GridColumnFilter } from "@/lib/api/grid-query";
import type { PermissionAction } from "@/lib/permissions-catalog";
import { ALL_PERMISSION_KEYS } from "@/lib/permissions-catalog";
import {
  appendGridColumnFilterClauses,
  buildGridOrderBy,
  type GridSqlColumn,
} from "@/lib/db/grid-sql";

/** Allowlisted column ids for AG Grid sort / column filters on permissions. */
export const PERMISSION_GRID_SQL_COLUMNS: Record<string, GridSqlColumn> = {
  key: { expr: "key", kind: "text" },
  module: { expr: "module", kind: "text" },
  action: { expr: "action", kind: "text" },
  label: { expr: "label", kind: "text" },
  description: { expr: "description", kind: "text" },
  sort_order: { expr: "sort_order", kind: "number" },
};

export const PERMISSION_GRID_SORT_COLUMNS = Object.keys(PERMISSION_GRID_SQL_COLUMNS);

export const PERMISSION_GRID_FILTER_ALLOWLIST = Object.fromEntries(
  Object.entries(PERMISSION_GRID_SQL_COLUMNS).map(([id, col]) => [
    id,
    col.kind === "number" ? ("number" as const) : ("text" as const),
  ])
);

export type PermissionRow = {
  key: string;
  module: string;
  action: string;
  label: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
};

export type PermissionDto = {
  key: string;
  module: string;
  action: PermissionAction;
  label: string;
  description?: string;
  sort_order: number;
};

export type ListPermissionsFilters = {
  search?: string;
  module?: string[];
  action?: string[];
  activeOnly?: boolean;
  sortBy?: string | null;
  sortDir?: "asc" | "desc" | null;
  colFilters?: GridColumnFilter[];
};

export type ListPermissionsPageResult = {
  rows: PermissionRow[];
  total: number;
};

export function permissionToDto(row: PermissionRow): PermissionDto {
  return {
    key: row.key,
    module: row.module,
    action: row.action as PermissionAction,
    label: row.label,
    description: row.description ?? undefined,
    sort_order: row.sort_order,
  };
}

export async function listPermissions(activeOnly = true): Promise<PermissionRow[]> {
  const { rows } = await query<PermissionRow>(
    `SELECT key, module, action, label, description, sort_order, is_active
     FROM permissions
     ${activeOnly ? "WHERE is_active = true" : ""}
     ORDER BY sort_order ASC, module ASC, key ASC`
  );
  return rows;
}

function buildPermissionsFilterClauses(filters: ListPermissionsFilters): {
  clauses: string[];
  params: unknown[];
} {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.activeOnly !== false) {
    clauses.push(`is_active = true`);
  }
  if (filters.search?.trim()) {
    params.push(`%${filters.search.trim().toLowerCase()}%`);
    clauses.push(
      `(lower(key) LIKE $${params.length}
        OR lower(module) LIKE $${params.length}
        OR lower(label) LIKE $${params.length}
        OR lower(action) LIKE $${params.length}
        OR lower(COALESCE(description, '')) LIKE $${params.length})`
    );
  }
  if (filters.module?.length) {
    params.push(filters.module);
    clauses.push(`module = ANY($${params.length}::text[])`);
  }
  if (filters.action?.length) {
    params.push(filters.action);
    clauses.push(`action = ANY($${params.length}::text[])`);
  }
  if (filters.colFilters?.length) {
    appendGridColumnFilterClauses(
      filters.colFilters,
      PERMISSION_GRID_SQL_COLUMNS,
      clauses,
      params
    );
  }

  return { clauses, params };
}

function permissionsOrderBy(filters: ListPermissionsFilters): string {
  return buildGridOrderBy(
    filters.sortBy && filters.sortDir
      ? { sortBy: filters.sortBy, sortDir: filters.sortDir }
      : null,
    PERMISSION_GRID_SQL_COLUMNS,
    "sort_order ASC, module ASC, key ASC"
  );
}

export async function listPermissionsPage(
  filters: ListPermissionsFilters = {},
  options: { limit: number; offset: number }
): Promise<ListPermissionsPageResult> {
  const limit = Math.min(Math.max(Math.floor(options.limit) || 25, 1), 100);
  const offset = Math.max(Math.floor(options.offset) || 0, 0);
  const { clauses, params } = buildPermissionsFilterClauses(filters);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const { rows: countRows } = await query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM permissions ${where}`,
    params
  );
  const total = Number(countRows[0]?.total) || 0;
  if (total === 0 || offset >= total) {
    return { rows: [], total };
  }

  const { rows } = await query<PermissionRow>(
    `SELECT key, module, action, label, description, sort_order, is_active
     FROM permissions
     ${where}
     ORDER BY ${permissionsOrderBy(filters)}
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  return { rows, total };
}

export async function listUserPermissionKeys(userId: string): Promise<string[]> {
  const { rows } = await query<{ permission_key: string }>(
    `SELECT permission_key
     FROM user_permissions
     WHERE user_id = $1
     ORDER BY permission_key ASC`,
    [userId]
  );
  return rows.map((r) => r.permission_key);
}

export async function userHasPermission(userId: string, key: string): Promise<boolean> {
  const { rows } = await query<{ ok: number }>(
    `SELECT 1 AS ok
     FROM user_permissions
     WHERE user_id = $1 AND permission_key = $2
     LIMIT 1`,
    [userId, key]
  );
  return rows.length > 0;
}

/** Replace all grants for a user with the provided keys (validated against catalog). */
export async function replaceUserPermissions(
  userId: string,
  keys: string[]
): Promise<string[]> {
  const allowed = new Set(ALL_PERMISSION_KEYS);
  const unique = [...new Set(keys.map((k) => k.trim()).filter((k) => allowed.has(k)))];

  await query(`DELETE FROM user_permissions WHERE user_id = $1`, [userId]);
  if (unique.length) {
    await query(
      `INSERT INTO user_permissions (user_id, permission_key)
       SELECT $1::uuid, unnest($2::text[])`,
      [userId, unique]
    );
  }
  return listUserPermissionKeys(userId);
}
