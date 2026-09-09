"use client";

import * as React from "react";
import {
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  User,
  Users,
} from "lucide-react";
import type { GridApi } from "ag-grid-community";
import { Topbar } from "@/components/crm/topbar";
import { TableRefreshButton } from "@/components/crm/table-refresh-button";
import { useHasPermission } from "@/lib/use-has-permission";
import { useSession } from "@/lib/session-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Field } from "@/components/crm/field";
import { StatusBadge } from "@/components/crm/status-badge";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { PagePagination } from "@/components/crm/list-pagination";
import { CrmGrid, type GridPageRequest } from "@/components/crm/grid/crm-grid";
import {
  buildMembersColumnDefs,
  buildPermissionsColumnDefs,
  memberFromRow,
  memberRowFromUser,
  type MembersGridActions,
  type PermissionGridRow,
  type PermissionsGridActions,
  type SettingsMemberRow,
} from "@/components/crm/grid/settings-grid-columns";
import { useData } from "@/lib/store";
import { useToast } from "@/lib/toast";
import {
  Member,
  MemberRole,
  MemberStatus,
  PermissionAction,
  SystemPermission,
  defaultPermissionsForRole,
  allPermissionKeys,
} from "@/lib/data";
import {
  fetchUsers,
  fetchUsersPage,
  fetchPermissionsCatalog,
  fetchPermissionsPage,
  updateUserAutoAssignWebsites,
  updateUserPermissionKeys,
  type UserApi,
} from "@/lib/users-api";
import { InfoGrid, InfoItem, RecordCard } from "@/components/crm/record-card";
import { cn } from "@/lib/utils";
import type { PermissionAction as CatalogAction } from "@/lib/permissions-catalog";

const roles: MemberRole[] = ["Super Admin", "Admin", "Employee"];
const statuses: MemberStatus[] = ["Active", "Inactive"];
const actions: PermissionAction[] = ["view", "create", "edit", "delete", "assign", "export", "comment", "quote", "create_booking"];

const actionBadge: Record<PermissionAction, string> = {
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

const moduleDot = [
  "bg-marigold",
  "bg-teal",
  "bg-violet",
  "bg-signal",
  "bg-ink",
  "bg-slate-soft",
];

const SETTINGS_PAGE_SIZE = 25;

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function formatWebsiteDomains(
  domains: string[],
  websites: { domain: string; label?: string }[]
): string {
  if (!domains.length) return "—";
  const labelByDomain = new Map(websites.map((w) => [w.domain, w.label || w.domain]));
  return domains.map((d) => labelByDomain.get(d) ?? d).join(", ");
}

function emptyMember(): Omit<Member, "id"> {
  return {
    name: "",
    email: "",
    phone: "",
    password: "",
    department: "Sales",
    role: "Employee",
    status: "Active",
    permissionKeys: defaultPermissionsForRole("Employee"),
    autoAssignWebsites: [],
  };
}

export default function SettingsPage() {
  const {
    state,
    websites,
    addMember,
    updateMember,
    deleteMember,
    addSystemPermission,
    updateSystemPermission,
    deleteSystemPermission,
    mergeSystemPermissions,
  } = useData();
  const { toast } = useToast();
  const { session, refreshSession } = useSession();
  const canInviteMember = useHasPermission("roles.and.permissions.create");
  const canEditMember = useHasPermission("roles.and.permissions.edit");
  const canDeleteMember = useHasPermission("roles.and.permissions.delete");

  const [dbUsers, setDbUsers] = React.useState<UserApi[]>([]);
  const [savingMember, setSavingMember] = React.useState(false);
  const [settingsLoading, setSettingsLoading] = React.useState(true);
  const [isDesktop, setIsDesktop] = React.useState(false);
  const [memberPage, setMemberPage] = React.useState(1);
  const [pageMembers, setPageMembers] = React.useState<SettingsMemberRow[]>([]);
  const [membersLoading, setMembersLoading] = React.useState(true);
  const [membersPagination, setMembersPagination] = React.useState({
    page: 1,
    pageSize: SETTINGS_PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasMore: false,
  });
  const [permPage, setPermPage] = React.useState(1);
  const [pagePerms, setPagePerms] = React.useState<PermissionGridRow[]>([]);
  const [permsLoading, setPermsLoading] = React.useState(true);
  const [permsPagination, setPermsPagination] = React.useState({
    page: 1,
    pageSize: SETTINGS_PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasMore: false,
  });
  const membersGridApiRef = React.useRef<GridApi<SettingsMemberRow> | null>(null);
  const permsGridApiRef = React.useRef<GridApi<PermissionGridRow> | null>(null);
  const membersColumnDefs = React.useMemo(() => buildMembersColumnDefs(), []);
  const permsColumnDefs = React.useMemo(() => buildPermissionsColumnDefs(), []);

  const reloadSettings = React.useCallback(async () => {
    setSettingsLoading(true);
    try {
      const [users, catalog] = await Promise.all([
        fetchUsers({ all: true }).catch(() => [] as UserApi[]),
        fetchPermissionsCatalog().catch(() => null),
      ]);
      setDbUsers(users);
      if (catalog) {
        mergeSystemPermissions(
          catalog.permissions.map((p) => ({
            key: p.key,
            module: p.module,
            action: p.action as CatalogAction,
            label: p.label,
            description: p.description,
          }))
        );
      }
      membersGridApiRef.current?.refreshInfiniteCache();
      permsGridApiRef.current?.refreshInfiniteCache();
    } finally {
      setSettingsLoading(false);
    }
    // mergeSystemPermissions identity changes with store state — omit from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    void reloadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const websitesByEmail = React.useMemo(() => {
    const map = new Map<string, string[]>();
    for (const u of dbUsers) {
      map.set(u.email.toLowerCase(), u.auto_assign_websites ?? []);
    }
    return map;
  }, [dbUsers]);

  const [section, setSection] = React.useState<"members" | "permissions">("members");
  const [memberQuery, setMemberQuery] = React.useState("");
  const [debouncedMemberQuery, setDebouncedMemberQuery] = React.useState("");
  const [permQuery, setPermQuery] = React.useState("");
  const [debouncedPermQuery, setDebouncedPermQuery] = React.useState("");
  const [expandedModules, setExpandedModules] = React.useState<string[]>(["member-Leads"]);
  const [memberOpen, setMemberOpen] = React.useState(false);
  const [memberTab, setMemberTab] = React.useState<"profile" | "permissions">("profile");
  const [editingMember, setEditingMember] = React.useState<Member | null>(null);
  const [form, setForm] = React.useState(emptyMember());
  const [showPassword, setShowPassword] = React.useState(false);
  const [deleteMemberTarget, setDeleteMemberTarget] = React.useState<Member | null>(null);
  const [permFormOpen, setPermFormOpen] = React.useState(false);
  const [editingPerm, setEditingPerm] = React.useState<SystemPermission | null>(null);
  const [permForm, setPermForm] = React.useState({
    module: "Leads",
    action: "view" as PermissionAction,
    label: "",
    key: "",
    description: "",
  });
  const [deletePermTarget, setDeletePermTarget] = React.useState<SystemPermission | null>(null);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedMemberQuery(memberQuery.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [memberQuery]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedPermQuery(permQuery.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [permQuery]);

  const memberFilterKey = debouncedMemberQuery;
  const permFilterKey = debouncedPermQuery;

  React.useEffect(() => {
    setMemberPage(1);
  }, [memberFilterKey]);

  React.useEffect(() => {
    setPermPage(1);
  }, [permFilterKey]);

  const modules = React.useMemo(
    () => [...new Set(state.systemPermissions.map((p) => p.module))],
    [state.systemPermissions]
  );

  const loadMembersPage = React.useCallback(async () => {
    setMembersLoading(true);
    try {
      const data = await fetchUsersPage({
        search: debouncedMemberQuery || undefined,
        includeInactive: true,
        page: memberPage,
        pageSize: SETTINGS_PAGE_SIZE,
      });
      setPageMembers(data.users.map((u) => memberRowFromUser(u, state.members)));
      setMembersPagination(data.pagination);
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not load members",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setMembersLoading(false);
    }
  }, [debouncedMemberQuery, memberPage, state.members, toast]);

  const loadPermsPage = React.useCallback(async () => {
    setPermsLoading(true);
    try {
      const data = await fetchPermissionsPage({
        search: debouncedPermQuery || undefined,
        page: permPage,
        pageSize: SETTINGS_PAGE_SIZE,
      });
      setPagePerms(
        data.permissions.map((p) => ({
          id: p.key,
          key: p.key,
          module: p.module,
          action: p.action,
          label: p.label,
          description: p.description,
          sort_order: p.sort_order,
        }))
      );
      setPermsPagination(data.pagination);
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not load permissions",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setPermsLoading(false);
    }
  }, [debouncedPermQuery, permPage, toast]);

  React.useEffect(() => {
    if (isDesktop || section !== "members") return;
    void loadMembersPage();
  }, [loadMembersPage, isDesktop, section]);

  React.useEffect(() => {
    if (isDesktop || section !== "permissions") return;
    void loadPermsPage();
  }, [loadPermsPage, isDesktop, section]);

  const fetchMembersGridPage = React.useCallback(
    async (request: GridPageRequest) => {
      const data = await fetchUsersPage({
        search: debouncedMemberQuery || undefined,
        includeInactive: true,
        page: request.page,
        pageSize: request.pageSize,
        sortBy: request.sortBy,
        sortDir: request.sortDir,
        colFilters: request.colFilters,
      });
      return {
        rows: data.users.map((u) => memberRowFromUser(u, state.members)),
        total: data.pagination.total,
      };
    },
    [debouncedMemberQuery, state.members]
  );

  const fetchPermsGridPage = React.useCallback(
    async (request: GridPageRequest) => {
      const data = await fetchPermissionsPage({
        search: debouncedPermQuery || undefined,
        page: request.page,
        pageSize: request.pageSize,
        sortBy: request.sortBy,
        sortDir: request.sortDir,
        colFilters: request.colFilters,
      });
      return {
        rows: data.permissions.map((p) => ({
          id: p.key,
          key: p.key,
          module: p.module,
          action: p.action,
          label: p.label,
          description: p.description,
          sort_order: p.sort_order,
        })),
        total: data.pagination.total,
      };
    },
    [debouncedPermQuery]
  );

  function openCreateMember() {
    setEditingMember(null);
    setForm(emptyMember());
    setShowPassword(false);
    setMemberTab("profile");
    setMemberOpen(true);
  }

  function openEditMember(m: Member) {
    setEditingMember(m);
    const fromDb = websitesByEmail.get(m.email.toLowerCase());
    setForm({
      name: m.name,
      email: m.email,
      phone: m.phone,
      password: m.password ?? "",
      department: m.department,
      role: m.role,
      status: m.status,
      permissionKeys: [...m.permissionKeys],
      autoAssignWebsites: fromDb ?? m.autoAssignWebsites ?? [],
    });
    setShowPassword(false);
    setMemberTab("profile");
    setMemberOpen(true);
  }

  function openEditMemberRow(row: SettingsMemberRow) {
    const member = memberFromRow(row);
    openEditMember({
      ...member,
      permissionKeys:
        row.permission_keys?.length
          ? [...row.permission_keys]
          : row.permissionKeys?.length
            ? [...row.permissionKeys]
            : defaultPermissionsForRole(member.role),
      autoAssignWebsites: row.auto_assign_websites ?? [],
    });
  }

  function setRole(role: MemberRole) {
    setForm((f) => ({
      ...f,
      role,
      permissionKeys: defaultPermissionsForRole(role),
    }));
  }

  function togglePermission(key: string) {
    setForm((f) => ({
      ...f,
      permissionKeys: f.permissionKeys.includes(key)
        ? f.permissionKeys.filter((k) => k !== key)
        : [...f.permissionKeys, key],
    }));
  }

  function toggleModulePermissions(module: string, keys: string[], grant: boolean) {
    setForm((f) => {
      const without = f.permissionKeys.filter((k) => !keys.includes(k));
      return {
        ...f,
        permissionKeys: grant ? [...without, ...keys] : without,
      };
    });
  }

  async function saveMember() {
    if (!form.name.trim() || !form.email.trim()) {
      toast({ variant: "error", title: "Name and email are required" });
      return;
    }
    if (!form.password.trim()) {
      toast({ variant: "error", title: "Password is required" });
      return;
    }

    const payload = {
      ...form,
      autoAssignWebsites: form.autoAssignWebsites ?? [],
    };

    setSavingMember(true);
    try {
      const dbUser = dbUsers.find(
        (u) => u.email.toLowerCase() === form.email.trim().toLowerCase()
      );
      if (dbUser) {
        const updated = await updateUserAutoAssignWebsites(
          dbUser.id,
          payload.autoAssignWebsites
        );
        await updateUserPermissionKeys(dbUser.id, payload.permissionKeys);
        if (session?.memberId === dbUser.id) {
          await refreshSession();
        }
        setDbUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      } else if (payload.autoAssignWebsites.length > 0) {
        toast({
          variant: "error",
          title: "No matching login user",
          description:
            "Auto-assign website only saves for members that exist as CRM login users (same email).",
        });
        setSavingMember(false);
        return;
      }

      if (editingMember) {
        updateMember(editingMember.id, payload);
        toast({ variant: "success", title: "Member updated", description: form.name });
      } else {
        addMember(payload);
        toast({ variant: "success", title: "Member invited", description: form.name });
      }
      setMemberOpen(false);
      membersGridApiRef.current?.refreshInfiniteCache();
      if (!isDesktop) void loadMembersPage();
      void reloadSettings();
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not save member",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSavingMember(false);
    }
  }

  function openCreatePerm() {
    setEditingPerm(null);
    setPermForm({
      module: modules[0] || "Leads",
      action: "view",
      label: "",
      key: "",
      description: "",
    });
    setPermFormOpen(true);
  }

  function openEditPerm(p: SystemPermission | PermissionGridRow) {
    setEditingPerm({
      id: "id" in p && typeof p.id === "string" ? p.id : p.key,
      key: p.key,
      module: p.module,
      action: p.action as PermissionAction,
      label: p.label,
      description: p.description,
    });
    setPermForm({
      module: p.module,
      action: p.action as PermissionAction,
      label: p.label,
      key: p.key,
      description: p.description || "",
    });
    setPermFormOpen(true);
  }

  function savePermission() {
    if (!permForm.label.trim() || !permForm.key.trim() || !permForm.module.trim()) {
      toast({ variant: "error", title: "Module, key and label are required" });
      return;
    }
    const payload = {
      module: permForm.module.trim(),
      action: permForm.action,
      label: permForm.label.trim(),
      key: permForm.key.trim(),
      description: permForm.description.trim() || undefined,
    };
    if (editingPerm) {
      updateSystemPermission(editingPerm.id, payload);
      toast({ variant: "success", title: "Permission updated", description: payload.key });
    } else {
      addSystemPermission(payload);
      toast({ variant: "success", title: "Permission added", description: payload.key });
    }
    setPermFormOpen(false);
    permsGridApiRef.current?.refreshInfiniteCache();
    if (!isDesktop) void loadPermsPage();
  }

  const grantedCount = form.permissionKeys.length;
  const totalPermCount = state.systemPermissions.length;

  const membersGridActions = React.useMemo<MembersGridActions>(
    () => ({
      websites,
      canEditMember,
      canDeleteMember,
      onEdit: openEditMemberRow,
      onDelete: (row) => setDeleteMemberTarget(memberFromRow(row)),
    }),
    [websites, canEditMember, canDeleteMember]
  );

  const permsGridActions = React.useMemo<PermissionsGridActions>(
    () => ({
      canEdit: canEditMember,
      canDelete: canDeleteMember,
      onEdit: openEditPerm,
      onDelete: (row) =>
        setDeletePermTarget({
          id: row.id,
          key: row.key,
          module: row.module,
          action: row.action as PermissionAction,
          label: row.label,
          description: row.description,
        }),
    }),
    [canEditMember, canDeleteMember]
  );

  const membersRangeStart =
    membersPagination.total === 0
      ? 0
      : (membersPagination.page - 1) * membersPagination.pageSize + 1;
  const membersRangeEnd = Math.min(
    membersPagination.page * membersPagination.pageSize,
    membersPagination.total
  );
  const permsRangeStart =
    permsPagination.total === 0 ? 0 : (permsPagination.page - 1) * permsPagination.pageSize + 1;
  const permsRangeEnd = Math.min(
    permsPagination.page * permsPagination.pageSize,
    permsPagination.total
  );

  return (
    <>
      <Topbar
        title="Roles & Permissions"
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <TableRefreshButton onRefresh={reloadSettings} loading={settingsLoading} />
            {section === "members" ? (
              canInviteMember ? (
                <Button variant="marigold" onClick={openCreateMember}>
                  <Plus className="size-4" /> Invite member
                </Button>
              ) : null
            ) : canEditMember ? (
              <Button variant="marigold" onClick={openCreatePerm}>
                <Plus className="size-4" /> Add permission
              </Button>
            ) : null}
          </div>
        }
      />

      <main className="page-pad">
        <Tabs
          value={section}
          onValueChange={(v) => setSection(v as "members" | "permissions")}
          className="gap-5"
        >
          <TabsList>
            <TabsTrigger value="members">
              <Users className="size-3.5" /> Members
            </TabsTrigger>
            <TabsTrigger value="permissions">
              <ShieldCheck className="size-3.5" /> System Permissions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {roles.map((role) => {
                const count = dbUsers.filter((m) => m.role === role).length ||
                  state.members.filter((m) => m.role === role).length;
                return (
                  <Card key={role}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">{role}</p>
                        <span className="font-mono-data text-xs text-slate-soft">
                          {count} people
                        </span>
                      </div>
                      <p className="mt-1 font-display text-xl font-semibold">{count}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="relative max-w-sm">
              <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-soft" />
              <Input
                value={memberQuery}
                onChange={(e) => setMemberQuery(e.target.value)}
                placeholder="Search members…"
                className="h-9 pl-8"
              />
            </div>

            <Card className="flex min-h-0 flex-col overflow-hidden">
              <div className="relative hidden min-h-[24rem] md:block">
                <CrmGrid<SettingsMemberRow>
                  className="h-full min-h-[24rem]"
                  columnDefs={membersColumnDefs}
                  fetchPage={fetchMembersGridPage}
                  toolbarKey={memberFilterKey}
                  storageKey="crm.ag.settings-members.v1"
                  context={membersGridActions}
                  onGridApi={(api) => {
                    membersGridApiRef.current = api;
                  }}
                  onError={(error) => {
                    toast({
                      variant: "error",
                      title: "Could not load members",
                      description: error instanceof Error ? error.message : "Please try again.",
                    });
                  }}
                  onStats={({ total }) => {
                    setMembersPagination((prev) => ({
                      ...prev,
                      total,
                      totalPages: Math.max(1, Math.ceil(total / prev.pageSize) || 1),
                    }));
                    setMembersLoading(false);
                  }}
                />
              </div>

              <div className="space-y-3 p-3 md:hidden">
                {membersLoading && pageMembers.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-soft">Loading members…</p>
                ) : pageMembers.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-soft">No members found.</p>
                ) : (
                  pageMembers.map((m) => (
                    <RecordCard key={m.id}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-base font-semibold break-words text-ink-text">{m.name}</p>
                          <p className="break-all text-xs text-slate-soft">{m.email}</p>
                        </div>
                        <StatusBadge status={m.status} />
                      </div>
                      <InfoGrid>
                        <InfoItem label="Role">{m.role}</InfoItem>
                        <InfoItem label="Department">{m.department || "—"}</InfoItem>
                        <InfoItem label="Websites">
                          {formatWebsiteDomains(m.auto_assign_websites ?? [], websites)}
                        </InfoItem>
                        <InfoItem label="Permissions">
                          {m.permission_count ?? m.permissionKeys?.length ?? 0}/
                          {allPermissionKeys.length}
                        </InfoItem>
                      </InfoGrid>
                      {canEditMember || canDeleteMember ? (
                        <div className="flex flex-wrap gap-1.5 border-t border-border-soft pt-3">
                          {canEditMember ? (
                            <Button size="sm" variant="outline" onClick={() => openEditMemberRow(m)}>
                              <Pencil className="size-3.5" /> Edit
                            </Button>
                          ) : null}
                          {canDeleteMember ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-signal"
                              onClick={() => setDeleteMemberTarget(memberFromRow(m))}
                            >
                              <Trash2 className="size-3.5" /> Remove
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </RecordCard>
                  ))
                )}
              </div>
              <PagePagination
                page={membersPagination.page}
                totalPages={membersPagination.totalPages}
                total={membersPagination.total}
                rangeStart={membersRangeStart}
                rangeEnd={membersRangeEnd}
                onPageChange={setMemberPage}
                className="shrink-0 md:hidden"
              />
            </Card>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <Card className="border-dashed">
              <CardContent className="flex items-start gap-3 p-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-marigold-soft text-marigold-ink">
                  <Lock className="size-4.5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink-text">System Permissions</p>
                  <p className="text-xs text-muted-foreground">
                    Manage all module permissions. Assign them to members from the Members tab.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3 sm:max-w-md">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Total permissions</p>
                  <p className="mt-1 font-display text-xl font-semibold">
                    {permsPagination.total || state.systemPermissions.length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Modules</p>
                  <p className="mt-1 font-display text-xl font-semibold text-teal">
                    {modules.length}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="relative max-w-xl">
              <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-soft" />
              <Input
                value={permQuery}
                onChange={(e) => setPermQuery(e.target.value)}
                placeholder="Search permissions by name, module, or action…"
                className="h-9 pl-8"
              />
            </div>

            <Card className="flex min-h-0 flex-col overflow-hidden">
              <div className="relative hidden min-h-[24rem] md:block">
                <CrmGrid<PermissionGridRow>
                  className="h-full min-h-[24rem]"
                  columnDefs={permsColumnDefs}
                  fetchPage={fetchPermsGridPage}
                  toolbarKey={permFilterKey}
                  storageKey="crm.ag.settings-permissions.v1"
                  context={permsGridActions}
                  onGridApi={(api) => {
                    permsGridApiRef.current = api;
                  }}
                  onError={(error) => {
                    toast({
                      variant: "error",
                      title: "Could not load permissions",
                      description: error instanceof Error ? error.message : "Please try again.",
                    });
                  }}
                  onStats={({ total }) => {
                    setPermsPagination((prev) => ({
                      ...prev,
                      total,
                      totalPages: Math.max(1, Math.ceil(total / prev.pageSize) || 1),
                    }));
                    setPermsLoading(false);
                  }}
                />
              </div>

              <div className="space-y-3 p-3 md:hidden">
                {permsLoading && pagePerms.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-soft">Loading permissions…</p>
                ) : pagePerms.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-soft">No permissions found.</p>
                ) : (
                  pagePerms.map((p) => (
                    <RecordCard key={p.id}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink-text">{p.label}</p>
                          <code className="mt-1 inline-block rounded bg-signal-soft/60 px-1.5 py-0.5 font-mono-data text-[11px] text-signal">
                            {p.key}
                          </code>
                        </div>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
                            actionBadge[p.action as PermissionAction] ?? "bg-secondary text-slate"
                          )}
                        >
                          {p.action}
                        </span>
                      </div>
                      <InfoGrid>
                        <InfoItem label="Module">{p.module}</InfoItem>
                        <InfoItem label="Description">{p.description || "—"}</InfoItem>
                      </InfoGrid>
                      {canEditMember || canDeleteMember ? (
                        <div className="flex flex-wrap gap-1.5 border-t border-border-soft pt-3">
                          {canEditMember ? (
                            <Button size="sm" variant="outline" onClick={() => openEditPerm(p)}>
                              <Pencil className="size-3.5" /> Edit
                            </Button>
                          ) : null}
                          {canDeleteMember ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-signal"
                              onClick={() =>
                                setDeletePermTarget({
                                  id: p.id,
                                  key: p.key,
                                  module: p.module,
                                  action: p.action as PermissionAction,
                                  label: p.label,
                                  description: p.description,
                                })
                              }
                            >
                              <Trash2 className="size-3.5" /> Delete
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </RecordCard>
                  ))
                )}
              </div>
              <PagePagination
                page={permsPagination.page}
                totalPages={permsPagination.totalPages}
                total={permsPagination.total}
                rangeStart={permsRangeStart}
                rangeEnd={permsRangeEnd}
                onPageChange={setPermPage}
                className="shrink-0 md:hidden"
              />
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Sheet open={memberOpen} onOpenChange={setMemberOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editingMember ? "Edit member" : "Invite member"}</SheetTitle>
            <SheetDescription>
              Set profile details and grant module permissions for this member.
            </SheetDescription>
          </SheetHeader>

          <SheetBody className="space-y-4">
            <Tabs
              value={memberTab}
              onValueChange={(v) => setMemberTab(v as "profile" | "permissions")}
            >
              <TabsList>
                <TabsTrigger value="profile">
                  <User className="size-3.5" /> Profile
                </TabsTrigger>
                <TabsTrigger value="permissions">
                  <Lock className="size-3.5" /> Permissions
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="mt-4 space-y-3">
                <form
                  className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                  autoComplete="on"
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveMember();
                  }}
                >
                  <Field label="Name">
                    <Input
                      name="name"
                      autoComplete="name"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </Field>
                  <Field label="Email">
                    <Input
                      type="email"
                      name="email"
                      autoComplete="username"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </Field>
                  <Field label="Phone (optional)">
                    <Input
                      type="tel"
                      name="tel"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </Field>
                  <Field label="Password">
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        autoComplete={editingMember ? "current-password" : "new-password"}
                        value={form.password}
                        onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                        className="pr-10"
                        placeholder={editingMember ? "••••••••" : "Set a password"}
                      />
                      <button
                        type="button"
                        className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-soft hover:text-ink-text"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </Field>
                  <Field label="Department">
                    <Input
                      name="organization-title"
                      autoComplete="organization-title"
                      value={form.department}
                      onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                    />
                  </Field>
                  <Field label="Member type">
                    <Select value={form.role} onValueChange={(v) => setRole(v as MemberRole)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Status">
                    <Select
                      value={form.status}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, status: v as MemberStatus }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field
                    label="Websites (auto-assign leads)"
                    hint="Optional. New leads from selected sites are auto-assigned equally per day among all users mapped to that site."
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 w-full justify-between font-normal"
                        >
                          <span className="truncate text-left">
                            {form.autoAssignWebsites.length > 0
                              ? formatWebsiteDomains(form.autoAssignWebsites, websites)
                              : "None selected"}
                          </span>
                          {form.autoAssignWebsites.length > 0 ? (
                            <Badge variant="secondary" className="ml-2 shrink-0">
                              {form.autoAssignWebsites.length}
                            </Badge>
                          ) : (
                            <ChevronDown className="size-3.5 shrink-0 text-slate-soft" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="max-h-[16rem] w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto">
                        <DropdownMenuLabel>Tracked websites</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {websites.length === 0 ? (
                          <DropdownMenuItem disabled>No websites configured</DropdownMenuItem>
                        ) : (
                          websites.map((w) => (
                            <DropdownMenuCheckboxItem
                              key={w.domain}
                              checked={form.autoAssignWebsites.includes(w.domain)}
                              onCheckedChange={() =>
                                setForm((f) => ({
                                  ...f,
                                  autoAssignWebsites: toggleValue(f.autoAssignWebsites, w.domain),
                                }))
                              }
                              onSelect={(e) => e.preventDefault()}
                            >
                              {w.label ? `${w.label} (${w.domain})` : w.domain}
                            </DropdownMenuCheckboxItem>
                          ))
                        )}
                        {form.autoAssignWebsites.length > 0 && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-slate"
                              onSelect={() =>
                                setForm((f) => ({ ...f, autoAssignWebsites: [] }))
                              }
                            >
                              Clear all
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Field>
                </form>
              </TabsContent>

              <TabsContent value="permissions" className="mt-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge variant="violet" className="font-normal">
                    {grantedCount} / {totalPermCount} permissions granted
                  </Badge>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-teal"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          permissionKeys: state.systemPermissions.map((p) => p.key),
                        }))
                      }
                    >
                      Grant all
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-signal"
                      onClick={() => setForm((f) => ({ ...f, permissionKeys: [] }))}
                    >
                      Revoke all
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {modules.map((module, idx) => {
                    const modulePerms = state.systemPermissions.filter((p) => p.module === module);
                    const keys = modulePerms.map((p) => p.key);
                    const granted = keys.filter((k) => form.permissionKeys.includes(k)).length;
                    const open = expandedModules.includes(`member-${module}`);
                    const allChecked = keys.length > 0 && granted === keys.length;
                    return (
                      <div
                        key={module}
                        className="overflow-hidden rounded-md border border-border"
                      >
                        <div className="flex items-center gap-2 bg-wash px-3 py-2">
                          <Checkbox
                            checked={allChecked}
                            onCheckedChange={(v) =>
                              toggleModulePermissions(module, keys, v === true)
                            }
                          />
                          <button
                            type="button"
                            className="flex flex-1 items-center gap-2 text-left"
                            onClick={() =>
                              setExpandedModules((prev) =>
                                prev.includes(`member-${module}`)
                                  ? prev.filter((x) => x !== `member-${module}`)
                                  : [...prev, `member-${module}`]
                              )
                            }
                          >
                            <span
                              className={cn(
                                "size-2 rounded-full",
                                moduleDot[idx % moduleDot.length]
                              )}
                            />
                            <span className="flex-1 text-sm font-medium">{module}</span>
                            <span className="font-mono-data text-[11px] text-slate-soft">
                              {granted}/{keys.length}
                            </span>
                            <ChevronDown
                              className={cn(
                                "size-4 text-slate-soft transition-transform",
                                open && "rotate-180"
                              )}
                            />
                          </button>
                        </div>
                        {open ? (
                          <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
                            {modulePerms.map((p) => (
                              <label
                                key={p.key}
                                className="flex cursor-pointer items-start gap-2 rounded-md border border-border-soft p-2 hover:bg-secondary/40"
                              >
                                <Checkbox
                                  checked={form.permissionKeys.includes(p.key)}
                                  onCheckedChange={() => togglePermission(p.key)}
                                  className="mt-0.5"
                                />
                                <span>
                                  <span className="block text-sm font-medium text-ink-text">
                                    {p.label}
                                  </span>
                                  <span className="block font-mono-data text-[10px] text-slate-soft">
                                    {p.key}
                                  </span>
                                </span>
                              </label>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
          </SheetBody>

          <SheetFooter>
            <Button variant="outline" onClick={() => setMemberOpen(false)}>
              Discard
            </Button>
            <Button variant="marigold" onClick={() => void saveMember()} disabled={savingMember}>
              {savingMember ? "Saving…" : "Save changes"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={permFormOpen} onOpenChange={setPermFormOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editingPerm ? "Edit permission" : "Add permission"}</SheetTitle>
            <SheetDescription>
              Define a module permission key that can be granted to members.
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-3">
            <Field label="Module">
              <Input
                value={permForm.module}
                onChange={(e) => setPermForm((f) => ({ ...f, module: e.target.value }))}
                placeholder="Leads"
              />
            </Field>
            <Field label="Action">
              <Select
                value={permForm.action}
                onValueChange={(v) =>
                  setPermForm((f) => ({ ...f, action: v as PermissionAction }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {actions.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Permission key">
              <Input
                value={permForm.key}
                onChange={(e) => setPermForm((f) => ({ ...f, key: e.target.value }))}
                placeholder="leads.view"
                className="font-mono-data"
              />
            </Field>
            <Field label="Label">
              <Input
                value={permForm.label}
                onChange={(e) => setPermForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="View Leads"
              />
            </Field>
            <Field label="Description">
              <Input
                value={permForm.description}
                onChange={(e) => setPermForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional"
              />
            </Field>
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={() => setPermFormOpen(false)}>
              Cancel
            </Button>
            <Button variant="marigold" onClick={savePermission}>
              {editingPerm ? "Save permission" : "Add permission"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteMemberTarget}
        onOpenChange={(open) => !open && setDeleteMemberTarget(null)}
        title="Remove member?"
        description={
          deleteMemberTarget
            ? `${deleteMemberTarget.name} will lose CRM access. This cannot be undone in the demo.`
            : ""
        }
        onConfirm={() => {
          if (!deleteMemberTarget) return;
          deleteMember(deleteMemberTarget.id);
          toast({
            variant: "info",
            title: "Member removed",
            description: deleteMemberTarget.name,
          });
          setDeleteMemberTarget(null);
          membersGridApiRef.current?.refreshInfiniteCache();
          if (!isDesktop) void loadMembersPage();
        }}
      />

      <ConfirmDialog
        open={!!deletePermTarget}
        onOpenChange={(open) => !open && setDeletePermTarget(null)}
        title="Delete permission?"
        description={
          deletePermTarget
            ? `"${deletePermTarget.key}" will be removed from the catalog. Member grants for this key stay until edited.`
            : ""
        }
        onConfirm={() => {
          if (!deletePermTarget) return;
          deleteSystemPermission(deletePermTarget.id);
          toast({
            variant: "info",
            title: "Permission deleted",
            description: deletePermTarget.key,
          });
          setDeletePermTarget(null);
          permsGridApiRef.current?.refreshInfiniteCache();
          if (!isDesktop) void loadPermsPage();
        }}
      />
    </>
  );
}
