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
import { Shell } from "@/components/crm/shell";
import { Topbar } from "@/components/crm/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Field } from "@/components/crm/field";
import { StatusBadge } from "@/components/crm/status-badge";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
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
import { cn } from "@/lib/utils";
import { InfoGrid, InfoItem, RecordCard } from "@/components/crm/record-card";

const roles: MemberRole[] = ["Super Admin", "Admin", "Employee"];
const statuses: MemberStatus[] = ["Active", "Inactive"];
const actions: PermissionAction[] = ["view", "create", "edit", "delete", "assign", "export"];

const actionBadge: Record<PermissionAction, string> = {
  view: "bg-teal-soft text-teal",
  create: "bg-marigold-soft text-marigold-ink",
  edit: "bg-violet-soft text-violet",
  delete: "bg-signal-soft text-signal",
  assign: "bg-secondary text-ink-text",
  export: "bg-secondary text-slate",
};

const moduleDot = [
  "bg-marigold",
  "bg-teal",
  "bg-violet",
  "bg-signal",
  "bg-ink",
  "bg-slate-soft",
];

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
  };
}

export default function SettingsPage() {
  const {
    state,
    addMember,
    updateMember,
    deleteMember,
    addSystemPermission,
    updateSystemPermission,
    deleteSystemPermission,
  } = useData();
  const { toast } = useToast();

  const [section, setSection] = React.useState<"members" | "permissions">("members");
  const [memberQuery, setMemberQuery] = React.useState("");
  const [permQuery, setPermQuery] = React.useState("");
  const [expandedModules, setExpandedModules] = React.useState<string[]>(["Leads"]);
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

  const modules = React.useMemo(
    () => [...new Set(state.systemPermissions.map((p) => p.module))],
    [state.systemPermissions]
  );

  const filteredMembers = state.members.filter((m) => {
    const q = memberQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q)
    );
  });

  const filteredPerms = state.systemPermissions.filter((p) => {
    const q = permQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      p.key.toLowerCase().includes(q) ||
      p.module.toLowerCase().includes(q) ||
      p.label.toLowerCase().includes(q) ||
      p.action.toLowerCase().includes(q)
    );
  });

  const permsByModule = React.useMemo(() => {
    const map = new Map<string, SystemPermission[]>();
    for (const p of filteredPerms) {
      const list = map.get(p.module) ?? [];
      list.push(p);
      map.set(p.module, list);
    }
    return [...map.entries()];
  }, [filteredPerms]);

  function openCreateMember() {
    setEditingMember(null);
    setForm(emptyMember());
    setShowPassword(false);
    setMemberTab("profile");
    setMemberOpen(true);
  }

  function openEditMember(m: Member) {
    setEditingMember(m);
    setForm({
      name: m.name,
      email: m.email,
      phone: m.phone,
      password: m.password ?? "",
      department: m.department,
      role: m.role,
      status: m.status,
      permissionKeys: [...m.permissionKeys],
    });
    setShowPassword(false);
    setMemberTab("profile");
    setMemberOpen(true);
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

  function saveMember() {
    if (!form.name.trim() || !form.email.trim()) {
      toast({ variant: "error", title: "Name and email are required" });
      return;
    }
    if (!form.password.trim()) {
      toast({ variant: "error", title: "Password is required" });
      return;
    }
    if (editingMember) {
      updateMember(editingMember.id, form);
      toast({ variant: "success", title: "Member updated", description: form.name });
    } else {
      addMember(form);
      toast({ variant: "success", title: "Member invited", description: form.name });
    }
    setMemberOpen(false);
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

  function openEditPerm(p: SystemPermission) {
    setEditingPerm(p);
    setPermForm({
      module: p.module,
      action: p.action,
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
  }

  function toggleExpand(module: string) {
    setExpandedModules((prev) =>
      prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module]
    );
  }

  const grantedCount = form.permissionKeys.length;
  const totalPermCount = state.systemPermissions.length;

  return (
    <Shell>
      <Topbar
        title="Roles & Permissions"
        action={
          section === "members" ? (
            <Button variant="marigold" onClick={openCreateMember}>
              <Plus className="size-4" /> Invite member
            </Button>
          ) : (
            <Button variant="marigold" onClick={openCreatePerm}>
              <Plus className="size-4" /> Add permission
            </Button>
          )
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
                const count = state.members.filter((m) => m.role === role).length;
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

            <Card className="overflow-hidden">
              <div className="hidden md:block">
              <Table containerClassName="min-w-[48rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[6rem]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <p className="text-sm font-medium text-ink-text">{m.name}</p>
                        <p className="text-xs text-slate-soft">{m.email}</p>
                        <p className="font-mono-data text-[11px] text-slate-soft">{m.id}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{m.role}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate">
                        {m.department || "—"}
                      </TableCell>
                      <TableCell className="font-mono-data text-xs text-slate">
                        {m.permissionKeys.length}/{allPermissionKeys.length}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={m.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            onClick={() => openEditMember(m)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 text-signal"
                            onClick={() => setDeleteMemberTarget(m)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>

              <div className="space-y-3 p-3 md:hidden">
                {filteredMembers.map((m) => (
                  <RecordCard key={m.id}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-base font-semibold break-words text-ink-text">{m.name}</p>
                        <p className="break-all text-xs text-slate-soft">{m.email}</p>
                        <p className="font-mono-data text-[11px] text-slate-soft">{m.id}</p>
                      </div>
                      <StatusBadge status={m.status} />
                    </div>
                    <InfoGrid>
                      <InfoItem label="Role">{m.role}</InfoItem>
                      <InfoItem label="Department">{m.department || "—"}</InfoItem>
                      <InfoItem label="Permissions">
                        {m.permissionKeys.length}/{allPermissionKeys.length}
                      </InfoItem>
                    </InfoGrid>
                    <div className="flex flex-wrap gap-1.5 border-t border-border-soft pt-3">
                      <Button size="sm" variant="outline" onClick={() => openEditMember(m)}>
                        <Pencil className="size-3.5" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-signal"
                        onClick={() => setDeleteMemberTarget(m)}
                      >
                        <Trash2 className="size-3.5" /> Remove
                      </Button>
                    </div>
                  </RecordCard>
                ))}
              </div>
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
                    {state.systemPermissions.length}
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

            <div className="space-y-2">
              {permsByModule.map(([module, perms], idx) => {
                const open = expandedModules.includes(module);
                return (
                  <Card key={module} className="overflow-hidden">
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-secondary/40"
                      onClick={() => toggleExpand(module)}
                    >
                      <span
                        className={cn(
                          "size-2.5 rounded-full",
                          moduleDot[idx % moduleDot.length]
                        )}
                      />
                      <span className="flex-1 text-sm font-medium text-ink-text">{module}</span>
                      <Badge variant="secondary" className="font-normal">
                        {perms.length} permission{perms.length === 1 ? "" : "s"}
                      </Badge>
                      <ChevronDown
                        className={cn(
                          "size-4 text-slate-soft transition-transform",
                          open && "rotate-180"
                        )}
                      />
                    </button>
                    {open ? (
                      <div className="border-t border-border-soft">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Permission key</TableHead>
                              <TableHead>Action</TableHead>
                              <TableHead>Label</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead className="w-[5.5rem]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {perms.map((p) => (
                              <TableRow key={p.id}>
                                <TableCell>
                                  <code className="rounded bg-signal-soft/60 px-1.5 py-0.5 font-mono-data text-[11px] text-signal">
                                    {p.key}
                                  </code>
                                </TableCell>
                                <TableCell>
                                  <span
                                    className={cn(
                                      "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
                                      actionBadge[p.action]
                                    )}
                                  >
                                    {p.action}
                                  </span>
                                </TableCell>
                                <TableCell className="text-sm">{p.label}</TableCell>
                                <TableCell className="text-xs text-slate-soft">
                                  {p.description || "—"}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="size-7"
                                      onClick={() => openEditPerm(p)}
                                    >
                                      <Pencil className="size-3.5" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="size-7 text-signal"
                                      onClick={() => setDeletePermTarget(p)}
                                    >
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : null}
                  </Card>
                );
              })}
            </div>
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
            <Button variant="marigold" onClick={saveMember}>
              Save changes
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
        }}
      />
    </Shell>
  );
}
