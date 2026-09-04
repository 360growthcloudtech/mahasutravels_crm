"use client";

import * as React from "react";

export type TableColumnDef = {
  id: string;
  label: string;
  defaultVisible?: boolean;
  locked?: boolean;
  align?: "left" | "right";
  defaultWidth?: number;
};

export type TableColumnLayout = {
  order: string[];
  hidden: string[];
  widths: Record<string, number>;
};

const MIN_WIDTH = 80;
const MAX_WIDTH = 520;

function clampWidth(value: number) {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(value)));
}

function defaultLayout(columns: TableColumnDef[]): TableColumnLayout {
  return {
    order: columns.map((column) => column.id),
    hidden: columns.filter((column) => column.defaultVisible === false).map((column) => column.id),
    widths: Object.fromEntries(
      columns.filter((column) => column.defaultWidth).map((column) => [column.id, column.defaultWidth as number])
    ),
  };
}

function sanitizeLayout(columns: TableColumnDef[], stored: TableColumnLayout | null): TableColumnLayout {
  const fallback = defaultLayout(columns);
  const known = new Set(columns.map((column) => column.id));
  const lockedIds = columns.filter((column) => column.locked).map((column) => column.id);

  const orderFromStore = (stored?.order ?? []).filter((id) => known.has(id));
  const missing = fallback.order.filter((id) => !orderFromStore.includes(id));
  const merged = [...orderFromStore, ...missing];

  const firstLocked = lockedIds[0];
  const lastLocked = lockedIds[lockedIds.length - 1];
  const middle = merged.filter((id) => id !== firstLocked && id !== lastLocked);
  const order = [
    ...(firstLocked ? [firstLocked] : []),
    ...middle,
    ...(lastLocked && lastLocked !== firstLocked ? [lastLocked] : []),
  ];

  const hidden = (stored?.hidden ?? fallback.hidden).filter(
    (id) => known.has(id) && !lockedIds.includes(id)
  );

  const widths: Record<string, number> = { ...fallback.widths };
  if (stored?.widths) {
    for (const [id, width] of Object.entries(stored.widths)) {
      if (known.has(id) && Number.isFinite(width)) widths[id] = clampWidth(width);
    }
  }

  return { order, hidden, widths };
}

function readStored(key: string): TableColumnLayout | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TableColumnLayout;
    if (!parsed || !Array.isArray(parsed.order) || !Array.isArray(parsed.hidden)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function useTableColumnLayout(storageKey: string, columns: TableColumnDef[]) {
  const columnsKey = columns.map((column) => column.id).join("|");

  const [layout, setLayout] = React.useState<TableColumnLayout>(() =>
    sanitizeLayout(columns, readStored(storageKey))
  );

  React.useEffect(() => {
    setLayout(sanitizeLayout(columns, readStored(storageKey)));
    // columnsKey captures identity of the column set
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, columnsKey]);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(layout));
    } catch {
      // storage full or unavailable
    }
  }, [storageKey, layout]);

  const defsById = React.useMemo(
    () => new Map(columns.map((column) => [column.id, column])),
    [columns]
  );

  const visibleIds = React.useMemo(
    () => layout.order.filter((id) => defsById.has(id) && !layout.hidden.includes(id)),
    [layout.order, layout.hidden, defsById]
  );

  const isHidden = React.useCallback((id: string) => layout.hidden.includes(id), [layout.hidden]);

  const toggle = React.useCallback(
    (id: string) => {
      const def = defsById.get(id);
      if (!def || def.locked) return;
      setLayout((prev) => ({
        ...prev,
        hidden: prev.hidden.includes(id)
          ? prev.hidden.filter((item) => item !== id)
          : [...prev.hidden, id],
      }));
    },
    [defsById]
  );

  const move = React.useCallback(
    (fromId: string, toId: string) => {
      if (fromId === toId) return;
      const from = defsById.get(fromId);
      const to = defsById.get(toId);
      if (!from || !to || from.locked || to.locked) return;
      setLayout((prev) => {
        const next = [...prev.order];
        const fromIndex = next.indexOf(fromId);
        const toIndex = next.indexOf(toId);
        if (fromIndex < 0 || toIndex < 0) return prev;
        next.splice(fromIndex, 1);
        next.splice(toIndex, 0, fromId);
        return { ...prev, order: next };
      });
    },
    [defsById]
  );

  const setWidth = React.useCallback((id: string, width: number) => {
    setLayout((prev) => ({
      ...prev,
      widths: { ...prev.widths, [id]: clampWidth(width) },
    }));
  }, []);

  const widthFor = React.useCallback(
    (id: string) => layout.widths[id] ?? defsById.get(id)?.defaultWidth ?? 140,
    [layout.widths, defsById]
  );

  const reset = React.useCallback(() => {
    setLayout(defaultLayout(columns));
  }, [columns]);

  const isDirty = React.useMemo(() => {
    const fallback = defaultLayout(columns);
    return (
      fallback.order.join("|") !== layout.order.join("|") ||
      [...fallback.hidden].sort().join("|") !== [...layout.hidden].sort().join("|") ||
      JSON.stringify(fallback.widths) !== JSON.stringify(layout.widths)
    );
  }, [columns, layout]);

  return {
    columns,
    visibleIds,
    isHidden,
    toggle,
    move,
    setWidth,
    widthFor,
    reset,
    isDirty,
  };
}
