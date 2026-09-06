"use client";

import * as React from "react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function ResizableTableHead({
  id,
  label,
  width,
  locked,
  align,
  className,
  onMove,
  onResize,
}: {
  id: string;
  label: string;
  width: number;
  locked?: boolean;
  align?: "left" | "right";
  className?: string;
  onMove: (fromId: string, toId: string) => void;
  onResize: (id: string, width: number) => void;
}) {
  const startX = React.useRef(0);
  const startWidth = React.useRef(width);

  function onResizeStart(event: React.PointerEvent<HTMLSpanElement>) {
    event.preventDefault();
    event.stopPropagation();
    startX.current = event.clientX;
    startWidth.current = width;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);

    function onMovePointer(moveEvent: PointerEvent) {
      onResize(id, startWidth.current + (moveEvent.clientX - startX.current));
    }
    function onUp(upEvent: PointerEvent) {
      target.releasePointerCapture(upEvent.pointerId);
      window.removeEventListener("pointermove", onMovePointer);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMovePointer);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <TableHead
      draggable={!locked}
      onDragStart={(event) => {
        if (locked) return;
        event.dataTransfer.setData("text/plain", id);
        event.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(event) => {
        if (locked) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={(event) => {
        event.preventDefault();
        const fromId = event.dataTransfer.getData("text/plain");
        if (fromId) onMove(fromId, id);
      }}
      style={{ width, minWidth: width, maxWidth: width }}
      className={cn(
        "sticky top-0 z-20 bg-secondary",
        !locked && "cursor-grab active:cursor-grabbing",
        align === "right" && "text-right",
        className
      )}
      title={locked ? label : `${label} · drag to reorder`}
    >
      <div className={cn("relative flex items-center gap-1", align === "right" && "justify-end")}>
        <span className="truncate">{label}</span>
        <span
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize ${label} column`}
          onPointerDown={onResizeStart}
          className="absolute top-0 -right-1.5 z-10 h-full w-3 cursor-col-resize touch-none"
        >
          <span className="absolute top-1.5 right-1 h-5 w-0.5 rounded-full bg-border-soft" />
        </span>
      </div>
    </TableHead>
  );
}
