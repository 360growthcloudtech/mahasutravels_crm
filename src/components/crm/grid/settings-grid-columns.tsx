"use client";

import * as React from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/crm/status-badge";
import { allPermissionKeys, type Member, type MemberRole, type MemberStatus } from "@/lib/data";
import type { UserApi } from "@/lib/users-api";
import { cn } from "@/lib/utils";

export type SettingsMemberRow = UserApi & {
  phone?: string;
  department?: string;
  permissionKeys?: string[];
  localMemberId?: string;
};

export type MembersGridActions = {
  websites: { domain: string; label?: string }[];
  canEditMember: boolean;
  canDeleteMember: boolean;
  onEdit: (row: SettingsMemberRow) => void;
  onDelete: (row: SettingsMemberRow) => void;
};

export type PermissionGridRow = {
  id: string;
  key: string;
  module: string;
  action: string;
  label: string;
  description?: string;
  sort_order: number;
};

export type PermissionsGridActions = {
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (row: PermissionGridRow) => void;
  onDelete: (row: PermissionGridRow) => void;
};

const actionBadge: Record<string, string> = {
  view: "bg-teal-soft text-teal",
  create: "bg-marigold-soft text-marigold-ink",
  edit: "bg-violet-soft text-violet",
  delete: "bg-signal-soft text-signal",
  assign: "bg-secondary text-ink-text",
  export: "bg-secondary text-slate",
  comment: "bg-secondary text-slate",
  quote: "bg-marigold-soft text-marigold-ink",
  create_booking: "bg-teal-soft text-teal",
};

function formatWebsiteDomains(
  domains: string[],
  websites: { domain: string; label?: string }[]
): string {
  if (!domains.length) return "—";
  const labelByDomain = new Map(websites.map((w) => [w.domain, w.label || w.domain]));
  return domains.map((d) => labelByDomain.get(d) ?? d).join(", ");
}

export function memberRowFromUser(
  user: UserApi,
  localMembers: Member[]
): SettingsMemberRow {
  const local = localMembers.find(
    (m) => m.email.toLowerCase() === user.email.toLowerCase()
  );
  return {
    ...user,
    phone: local?.phone,
    department: local?.department,
    permissionKeys: user.permission_keys ?? local?.permissionKeys,
    localMemberId: local?.id,
  };
}

export function memberFromRow(row: SettingsMemberRow): Member {
  return {
    id: row.localMemberId ?? row.id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? "",
    password: "",
    department: row.department ?? "",
    role: (row.role as MemberRole) || "Employee",
    status: (row.status as MemberStatus) || "Active",
    permissionKeys: row.permissionKeys ?? [],
    autoAssignWebsites: row.auto_assign_websites ?? [],
  };
}

function MemberCell({ data }: ICellRendererParams<SettingsMemberRow>) {
  if (!data) return null;
  return (
    <div className="flex h-full min-w-0 flex-col justify-center gap-0.5 py-1">
      <p className="truncate text-sm leading-snug font-medium text-ink-text">{data.name}</p>
      <p className="truncate text-xs leading-snug text-slate-soft">{data.email}</p>
    </div>
  );
}

function RoleCell({ data }: ICellRendererParams<SettingsMemberRow>) {
  if (!data) return null;
  return (
    <div className="flex h-full items-center">
      <Badge variant="secondary">{data.role}</Badge>
    </div>
  );
}

function WebsiteCell({
  data,
  context,
}: ICellRendererParams<SettingsMemberRow, unknown, MembersGridActions>) {
  if (!data) return null;
  return (
    <div className="flex h-full items-center text-xs text-slate">
      {formatWebsiteDomains(data.auto_assign_websites ?? [], context?.websites ?? [])}
    </div>
  );
}

function PermCountCell({ data }: ICellRendererParams<SettingsMemberRow>) {
  if (!data) return null;
  const count = data.permission_count ?? data.permissionKeys?.length ?? 0;
  return (
    <div className="flex h-full items-center font-mono-data text-xs text-slate">
      {count}/{allPermissionKeys.length}
    </div>
  );
}

function StatusCell({ data }: ICellRendererParams<SettingsMemberRow>) {
  if (!data) return null;
  return (
    <div className="flex h-full items-center">
      <StatusBadge status={data.status} />
    </div>
  );
}

function MemberActionsCell({
  data,
  context,
}: ICellRendererParams<SettingsMemberRow, unknown, MembersGridActions>) {
  if (!data || !context) return null;
  if (!context.canEditMember && !context.canDeleteMember) return null;
  return (
    <div className="flex h-full items-center gap-1">
      {context.canEditMember ? (
        <Button
          size="icon"
          variant="ghost"
          className="size-8"
          aria-label={`Edit ${data.name}`}
          onClick={() => context.onEdit(data)}
        >
          <Pencil className="size-3.5" />
        </Button>
      ) : null}
      {context.canDeleteMember ? (
        <Button
          size="icon"
          variant="ghost"
          className="size-8 text-signal"
          aria-label={`Remove ${data.name}`}
          onClick={() => context.onDelete(data)}
        >
          <Trash2 className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}

export function buildMembersColumnDefs(): ColDef<SettingsMemberRow>[] {
  return [
    {
      colId: "name",
      field: "name",
      headerName: "Member",
      pinned: "left",
      lockVisible: true,
      width: 260,
      filter: "agTextColumnFilter",
      cellRenderer: MemberCell,
    },
    {
      colId: "role",
      field: "role",
      headerName: "Role",
      width: 130,
      filter: "agTextColumnFilter",
      cellRenderer: RoleCell,
    },
    {
      colId: "department",
      headerName: "Department",
      width: 140,
      sortable: false,
      filter: false,
      valueGetter: (p) => p.data?.department || "—",
    },
    {
      colId: "websites",
      headerName: "Website",
      width: 180,
      sortable: false,
      filter: false,
      cellRenderer: WebsiteCell,
    },
    {
      colId: "permissions",
      headerName: "Permissions",
      width: 120,
      sortable: false,
      filter: false,
      cellRenderer: PermCountCell,
    },
    {
      colId: "status",
      field: "status",
      headerName: "Status",
      width: 110,
      filter: "agTextColumnFilter",
      cellRenderer: StatusCell,
    },
    {
      colId: "actions",
      headerName: "Actions",
      pinned: "right",
      lockVisible: true,
      sortable: false,
      filter: false,
      width: 100,
      cellRenderer: MemberActionsCell,
    },
  ];
}

function PermKeyCell({ data }: ICellRendererParams<PermissionGridRow>) {
  if (!data) return null;
  return (
    <div className="flex h-full items-center">
      <code className="rounded bg-signal-soft/60 px-1.5 py-0.5 font-mono-data text-[11px] text-signal">
        {data.key}
      </code>
    </div>
  );
}

function PermActionCell({ data }: ICellRendererParams<PermissionGridRow>) {
  if (!data) return null;
  return (
    <div className="flex h-full items-center">
      <span
        className={cn(
          "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
          actionBadge[data.action] ?? "bg-secondary text-slate"
        )}
      >
        {data.action}
      </span>
    </div>
  );
}

function PermActionsCell({
  data,
  context,
}: ICellRendererParams<PermissionGridRow, unknown, PermissionsGridActions>) {
  if (!data || !context) return null;
  if (!context.canEdit && !context.canDelete) return null;
  return (
    <div className="flex h-full items-center gap-1">
      {context.canEdit ? (
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          aria-label={`Edit ${data.key}`}
          onClick={() => context.onEdit(data)}
        >
          <Pencil className="size-3.5" />
        </Button>
      ) : null}
      {context.canDelete ? (
        <Button
          size="icon"
          variant="ghost"
          className="size-7 text-signal"
          aria-label={`Delete ${data.key}`}
          onClick={() => context.onDelete(data)}
        >
          <Trash2 className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}

export function buildPermissionsColumnDefs(): ColDef<PermissionGridRow>[] {
  return [
    {
      colId: "key",
      field: "key",
      headerName: "Permission key",
      width: 220,
      filter: "agTextColumnFilter",
      cellRenderer: PermKeyCell,
    },
    {
      colId: "module",
      field: "module",
      headerName: "Module",
      width: 160,
      filter: "agTextColumnFilter",
    },
    {
      colId: "action",
      field: "action",
      headerName: "Action",
      width: 130,
      filter: "agTextColumnFilter",
      cellRenderer: PermActionCell,
    },
    {
      colId: "label",
      field: "label",
      headerName: "Label",
      flex: 1,
      minWidth: 160,
      filter: "agTextColumnFilter",
    },
    {
      colId: "description",
      field: "description",
      headerName: "Description",
      flex: 1,
      minWidth: 180,
      filter: "agTextColumnFilter",
      valueFormatter: (p) => p.value || "—",
    },
    {
      colId: "actions",
      headerName: "Actions",
      pinned: "right",
      lockVisible: true,
      sortable: false,
      filter: false,
      width: 100,
      cellRenderer: PermActionsCell,
    },
  ];
}
