"use client";

import * as React from "react";
import { Star, Phone, Car, Plus, Pencil, Trash2, ShieldCheck, ShieldAlert, IndianRupee, MapPin } from "lucide-react";
import { Shell } from "@/components/crm/shell";
import { Topbar } from "@/components/crm/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/crm/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { DriverFormDialog } from "@/components/crm/driver-form-dialog";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { useData } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { Driver } from "@/lib/data";

export default function DriversPage() {
  const { state, addDriver, updateDriver, deleteDriver } = useData();
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = React.useState<Driver | null>(null);

  const { drivers } = state;

  return (
    <Shell>
      <Topbar
        title="Drivers & Vehicles"
        action={
          <DriverFormDialog
            trigger={
              <Button variant="marigold">
                <Plus className="size-4" /> Add Driver
              </Button>
            }
            onSubmit={(data) => {
              addDriver(data);
              toast({ variant: "success", title: "Driver added", description: `${data.name} joined the fleet.` });
            }}
          />
        }
      />

      <main className="page-pad">
        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Approved</p>
              <p className="mt-1 font-display text-xl font-semibold text-teal">
                {drivers.filter((d) => d.status === "Approved").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Rejected</p>
              <p className="mt-1 font-display text-xl font-semibold text-signal">
                {drivers.filter((d) => d.status === "Rejected").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Deactivated</p>
              <p className="mt-1 font-display text-xl font-semibold text-slate-soft">
                {drivers.filter((d) => d.status === "Deactivated").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Docs pending</p>
              <p className="mt-1 font-display text-xl font-semibold text-signal">
                {drivers.filter((d) => !d.documentsVerified).length}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {drivers.map((d) => {
            const saveDriver = (data: Parameters<typeof updateDriver>[1]) => {
              updateDriver(d.id, data);
              toast({ variant: "success", title: "Driver updated", description: `${d.name}'s profile was saved.` });
            };
            return (
            <Card key={d.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
                      {d.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink-text">{d.name}</p>
                      <p className="font-mono-data text-[11px] text-slate-soft">{d.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusBadge status={d.status} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="size-7">
                          <span className="sr-only">Actions</span>⋮
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DriverFormDialog
                          driver={d}
                          trigger={
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Pencil className="size-3.5" /> Edit profile
                            </DropdownMenuItem>
                          }
                          onSubmit={saveDriver}
                        />
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-signal focus:bg-signal-soft"
                          onSelect={(e) => {
                            e.preventDefault();
                            setDeleteTarget(d);
                          }}
                        >
                          <Trash2 className="size-3.5" /> Remove driver
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-slate">
                  <div className="flex items-center gap-2">
                    <Car className="size-3.5 shrink-0 text-slate-soft" />
                    {d.vehicleType} · <span className="font-mono-data">{d.vehicle}</span>
                    {d.vehicleCapacity && <span className="text-slate-soft">· {d.vehicleCapacity} seater</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="size-3.5 shrink-0 text-slate-soft" />
                    <span className="font-mono-data">{d.phone}</span>
                  </div>
                  {d.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="size-3.5 shrink-0 text-slate-soft" />
                      <span className="truncate">{d.address}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <IndianRupee className="size-3.5 shrink-0 text-slate-soft" />
                    {d.commission ?? 0}% commission per trip
                  </div>
                  <div className="flex items-center gap-2">
                    {d.documentsVerified ? (
                      <ShieldCheck className="size-3.5 shrink-0 text-teal" />
                    ) : (
                      <ShieldAlert className="size-3.5 shrink-0 text-signal" />
                    )}
                    {d.documentsVerified ? "Documents verified" : "Documents pending"}
                    {d.insuranceExpiry && (
                      <span className="text-slate-soft">· insurance to {d.insuranceExpiry}</span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-ink-text">
                    <Star className="size-3.5 fill-marigold text-marigold" />
                    {d.rating}
                    <span className="text-slate-soft">· {d.trips} trips</span>
                  </div>
                  {d.vendor && <Badge variant="violet">Vendor</Badge>}
                </div>

                {d.notes && (
                  <p className="mt-3 rounded-md bg-secondary/60 p-2 text-[11px] text-slate">{d.notes}</p>
                )}

                <div className="mt-4 flex gap-2">
                  <DriverFormDialog
                    driver={d}
                    trigger={<Button variant="outline" size="sm" className="flex-1">Edit profile</Button>}
                    onSubmit={saveDriver}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      const next = d.status === "Approved" ? "Deactivated" : "Approved";
                      updateDriver(d.id, { status: next });
                      toast({
                        variant: "info",
                        title: "Status updated",
                        description: `${d.name} marked as ${next}.`,
                      });
                    }}
                  >
                    {d.status === "Approved" ? "Deactivate" : "Approve"}
                  </Button>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      </main>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Remove this driver?"
        description={`${deleteTarget?.name ?? ""} (${deleteTarget?.id ?? ""}) will be removed from your active fleet. Existing bookings will keep the driver's name on record.`}
        onConfirm={() => {
          if (deleteTarget) {
            deleteDriver(deleteTarget.id);
            toast({ variant: "info", title: "Driver removed", description: `${deleteTarget.name} was removed from the fleet.` });
          }
        }}
      />
    </Shell>
  );
}
