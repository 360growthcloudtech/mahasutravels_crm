"use client";

import * as React from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/crm/field";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { useToast } from "@/lib/toast";
import {
  createVehicleTypeApi,
  deleteVehicleTypeApi,
  fetchVehicleTypes,
  updateVehicleTypeApi,
  type VehicleTypeApi,
} from "@/lib/vehicle-types-api";

export function VehicleTypesManager({
  open,
  onOpenChange,
  canCreate,
  canEdit,
  canDelete,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onChanged?: () => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [types, setTypes] = React.useState<VehicleTypeApi[]>([]);
  const [name, setName] = React.useState("");
  const [editing, setEditing] = React.useState<VehicleTypeApi | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<VehicleTypeApi | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchVehicleTypes();
      setTypes(rows);
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not load vehicle types",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    if (!open) return;
    setName("");
    setEditing(null);
    void load();
  }, [open, load]);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast({
        variant: "error",
        title: "Name required",
        description: "Enter a vehicle type name.",
      });
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateVehicleTypeApi(editing.id, { name: trimmed });
        toast({ variant: "success", title: "Vehicle type updated", description: trimmed });
      } else {
        await createVehicleTypeApi({ name: trimmed, sort_order: (types.length + 1) * 10 });
        toast({ variant: "success", title: "Vehicle type added", description: trimmed });
      }
      setName("");
      setEditing(null);
      await load();
      onChanged?.();
    } catch (error) {
      toast({
        variant: "error",
        title: editing ? "Could not update type" : "Could not add type",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteVehicleTypeApi(deleteTarget.id);
      toast({
        variant: "success",
        title: "Vehicle type deleted",
        description: deleteTarget.name,
      });
      if (editing?.id === deleteTarget.id) {
        setEditing(null);
        setName("");
      }
      setDeleteTarget(null);
      await load();
      onChanged?.();
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not delete type",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Vehicle types</SheetTitle>
            <SheetDescription>
              Add, edit, or remove types shown in the driver & vehicle form.
            </SheetDescription>
          </SheetHeader>

          <SheetBody className="flex-1 space-y-4 overflow-y-auto">
            {(canCreate || (canEdit && editing)) && (
              <div className="space-y-2 rounded-md border border-border p-3">
                <Field label={editing ? "Edit type name" : "New vehicle type"}>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Fortuner"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleSave();
                      }
                    }}
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="marigold"
                    size="sm"
                    disabled={saving || (!canCreate && !editing)}
                    onClick={() => void handleSave()}
                  >
                    {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                    {editing ? "Save changes" : "Add type"}
                  </Button>
                  {editing ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={saving}
                      onClick={() => {
                        setEditing(null);
                        setName("");
                      }}
                    >
                      Cancel edit
                    </Button>
                  ) : null}
                </div>
              </div>
            )}

            {loading ? (
              <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading…
              </p>
            ) : types.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No vehicle types yet. Add your first type above.
              </p>
            ) : (
              <ul className="divide-y divide-border-soft rounded-md border border-border">
                {types.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-text">{t.name}</p>
                      {!t.is_active ? (
                        <p className="text-[11px] text-muted-foreground">Inactive</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {canEdit ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          aria-label={`Edit ${t.name}`}
                          onClick={() => {
                            setEditing(t);
                            setName(t.name);
                          }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-signal"
                          aria-label={`Delete ${t.name}`}
                          onClick={() => setDeleteTarget(t)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SheetBody>

          <SheetFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && !deleting && setDeleteTarget(null)}
        title="Delete vehicle type?"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" will be removed from the type list. Existing drivers keep their saved vehicle type text.`
            : ""
        }
        confirmLabel="Delete"
        confirming={deleting}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
