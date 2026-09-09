"use client";

import {
  AllCommunityModule,
  ModuleRegistry,
  colorSchemeDark,
  colorSchemeLight,
  themeQuartz,
  type ColDef,
  type GridOptions,
  type Theme,
} from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

export const CRM_GRID_PAGE_SIZE = 25;

const lightTheme = themeQuartz.withParams({
  backgroundColor: "var(--card)",
  foregroundColor: "var(--ink-text)",
  borderColor: "var(--border-soft)",
  headerBackgroundColor: "var(--secondary)",
  headerTextColor: "var(--ink-text)",
  oddRowBackgroundColor: "transparent",
  rowHoverColor: "color-mix(in oklab, var(--secondary) 80%, transparent)",
  selectedRowBackgroundColor: "var(--marigold-soft)",
  accentColor: "var(--marigold)",
  fontFamily: "inherit",
  fontSize: 13,
  headerFontSize: 12,
  headerFontWeight: 600,
  borderRadius: 8,
  wrapperBorderRadius: 10,
  spacing: 6,
  cellHorizontalPadding: 12,
});

const darkTheme = themeQuartz
  .withPart(colorSchemeDark)
  .withParams({
    backgroundColor: "var(--card)",
    foregroundColor: "var(--ink-text)",
    borderColor: "var(--border-soft)",
    headerBackgroundColor: "var(--secondary)",
    headerTextColor: "var(--ink-text)",
    oddRowBackgroundColor: "transparent",
    rowHoverColor: "color-mix(in oklab, var(--secondary) 70%, transparent)",
    selectedRowBackgroundColor: "var(--marigold-soft)",
    accentColor: "var(--marigold)",
    fontFamily: "inherit",
    fontSize: 13,
    headerFontSize: 12,
    headerFontWeight: 600,
    borderRadius: 8,
    wrapperBorderRadius: 10,
    spacing: 6,
    cellHorizontalPadding: 12,
  });

export function crmGridTheme(dark: boolean): Theme {
  return dark ? darkTheme : lightTheme;
}

export const crmDefaultColDef: ColDef = {
  sortable: true,
  filter: true,
  resizable: true,
  minWidth: 80,
  flex: 0,
  suppressHeaderMenuButton: false,
};

export function crmBaseGridOptions<TData>(): Partial<GridOptions<TData>> {
  return {
    rowModelType: "infinite",
    pagination: true,
    paginationPageSize: CRM_GRID_PAGE_SIZE,
    paginationPageSizeSelector: [25, 50, 100],
    cacheBlockSize: CRM_GRID_PAGE_SIZE,
    maxBlocksInCache: 2,
    animateRows: false,
    suppressCellFocus: true,
    enableCellTextSelection: true,
    ensureDomOrder: true,
    rowHeight: 56,
    headerHeight: 40,
    defaultColDef: crmDefaultColDef,
    getRowId: (params) => String((params.data as { id?: string } | undefined)?.id ?? ""),
  };
}

export { colorSchemeLight, colorSchemeDark };
