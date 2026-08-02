import { ShieldCheck, Users, User, Plus } from "lucide-react";
import { Shell } from "@/components/crm/shell";
import { Topbar } from "@/components/crm/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { rolePermissions } from "@/lib/data";

const roles = [
  { name: "Super Admin", desc: "Full access across all modules and users", icon: ShieldCheck, variant: "marigold" as const, count: 2 },
  { name: "Admin", desc: "Assigns leads, manages team, views all data", icon: Users, variant: "violet" as const, count: 4 },
  { name: "User", desc: "Works assigned leads and bookings only", icon: User, variant: "teal" as const, count: 11 },
];

export default function SettingsPage() {
  return (
    <Shell>
      <Topbar eyebrow="Module 15 · Roles & permissions" title="Roles & Permissions" action={<Button variant="marigold"><Plus className="size-4" /> Invite User</Button>} />

      <main className="px-6 py-6 lg:px-8">
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {roles.map((r) => {
            const Icon = r.icon;
            return (
              <Card key={r.name}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div
                      className={
                        r.variant === "marigold"
                          ? "flex size-9 items-center justify-center rounded-md bg-marigold-soft text-marigold-ink"
                          : r.variant === "violet"
                          ? "flex size-9 items-center justify-center rounded-md bg-violet-soft text-violet"
                          : "flex size-9 items-center justify-center rounded-md bg-teal-soft text-teal"
                      }
                    >
                      <Icon className="size-4.5" />
                    </div>
                    <span className="font-mono-data text-xs text-slate-soft">{r.count} people</span>
                  </div>
                  <p className="mt-3 font-display text-sm font-semibold text-ink-text">{r.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{r.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Permission matrix</CardTitle>
            <CardDescription>
              Configurable per module — read, write, edit, delete, export and assign
            </CardDescription>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module</TableHead>
                <TableHead>Super Admin</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rolePermissions.map((p) => (
                <TableRow key={p.module}>
                  <TableCell className="text-sm font-medium text-ink-text">{p.module}</TableCell>
                  <TableCell className="text-sm text-teal">{p.superAdmin}</TableCell>
                  <TableCell className="text-sm text-violet">{p.admin}</TableCell>
                  <TableCell className="text-sm text-slate">{p.user}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </main>
    </Shell>
  );
}
