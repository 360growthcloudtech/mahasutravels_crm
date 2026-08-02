"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Field } from "@/components/crm/field";
import { Quote, QuoteStage } from "@/lib/data";

const stages: QuoteStage[] = ["Draft", "Sent", "Viewed", "Accepted", "Expired"];
const cabTypes = ["Swift Dzire", "Ertiga", "Innova Crysta", "Tempo Traveller"];

type FormState = Omit<Quote, "id" | "sentVia">;

const empty: FormState = {
  customer: "",
  route: "",
  days: 2,
  cabType: "Innova Crysta",
  amount: 0,
  stage: "Draft",
};

export function QuoteFormDialog({
  trigger,
  quote,
  onSubmit,
}: {
  trigger: React.ReactNode;
  quote?: Quote;
  onSubmit: (data: FormState & { sentVia: Quote["sentVia"] }) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(quote ?? empty);

  React.useEffect(() => {
    if (open) setForm(quote ?? empty);
  }, [open, quote]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    if (!form.customer.trim() || !form.route.trim()) return;
    onSubmit({ ...form, sentVia: quote?.sentVia ?? [] });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{quote ? "Edit quote" : "New quote"}</DialogTitle>
          <DialogDescription>{quote ? `Updating ${quote.id}` : "Draft a route, days and pricing"}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Customer name" className="col-span-2 sm:col-span-1">
            <Input value={form.customer} onChange={(e) => set("customer", e.target.value)} />
          </Field>
          <Field label="Days" className="col-span-2 sm:col-span-1">
            <Input type="number" min={1} value={form.days} onChange={(e) => set("days", Number(e.target.value))} />
          </Field>
          <Field label="Route" className="col-span-2">
            <Input value={form.route} onChange={(e) => set("route", e.target.value)} placeholder="Delhi → Shimla → Delhi" />
          </Field>
          <Field label="Cab type">
            <Select value={form.cabType} onValueChange={(v) => set("cabType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {cabTypes.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Amount (₹)">
            <Input type="number" min={0} value={form.amount} onChange={(e) => set("amount", Number(e.target.value))} />
          </Field>
          <Field label="Stage" className="col-span-2">
            <Select value={form.stage} onValueChange={(v) => set("stage", v as QuoteStage)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {stages.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="marigold" onClick={submit}>{quote ? "Save changes" : "Create quote"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
