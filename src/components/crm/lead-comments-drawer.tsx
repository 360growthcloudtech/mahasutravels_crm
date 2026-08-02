"use client";

import * as React from "react";
import { MessageCircle, Send } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/crm/status-badge";
import { genId, Lead, LeadComment } from "@/lib/data";

export function LeadCommentsDrawer({
  lead,
  open,
  onOpenChange,
  onAddComment,
}: {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddComment: (leadId: string, comment: LeadComment) => void;
}) {
  const [text, setText] = React.useState("");

  React.useEffect(() => {
    if (open) setText("");
  }, [open, lead?.id]);

  const comments = lead?.comments ?? [];

  function submit() {
    if (!lead || !text.trim()) return;
    onAddComment(lead.id, {
      id: genId("CM"),
      text: text.trim(),
      author: "Priya",
      createdAt: "Just now",
    });
    setText("");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageCircle className="size-4 text-slate" />
            Comments
          </SheetTitle>
          {lead && (
            <>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-ink-text">{lead.name}</span>
                <StatusBadge status={lead.status} />
              </div>
              <SheetDescription>
                {lead.id} · {lead.phone}
              </SheetDescription>
            </>
          )}
        </SheetHeader>

        <SheetBody className="space-y-3">
          {comments.length === 0 ? (
            <div className="rounded-md border border-dashed border-border px-4 py-10 text-center">
              <MessageCircle className="mx-auto size-5 text-slate-soft" />
              <p className="mt-2 text-sm text-muted-foreground">No comments yet</p>
              <p className="mt-0.5 text-xs text-slate-soft">Add the first note for this lead.</p>
            </div>
          ) : (
            [...comments].reverse().map((c) => (
              <div key={c.id} className="rounded-md border border-border-soft bg-secondary/40 px-3 py-2.5">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-ink-text">{c.author}</span>
                  <span className="font-mono-data text-[10px] text-slate-soft">{c.createdAt}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap text-slate">{c.text}</p>
              </div>
            ))
          )}
        </SheetBody>

        <SheetFooter className="flex-col gap-2 sm:flex-col">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a comment…"
            rows={3}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <div className="flex justify-end">
            <Button variant="marigold" disabled={!text.trim()} onClick={submit}>
              <Send className="size-3.5" /> Add comment
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
