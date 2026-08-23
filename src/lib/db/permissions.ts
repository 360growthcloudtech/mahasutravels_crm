import { query } from "@/lib/db";
import type { PermissionAction } from "@/lib/permissions-catalog";
import { ALL_PERMISSION_KEYS } from "@/lib/permissions-catalog";

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
