import { NextResponse } from "next/server";

export function escapeCsvCell(value: unknown): string {
  if (value == null) return "";
  const str = typeof value === "string" ? value : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function rowsToCsv(headers: string[], rows: Array<Array<unknown>>): string {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];
  return lines.join("\r\n");
}

export function csvResponse(
  body: string,
  filename: string,
  opts?: { count?: number }
): NextResponse {
  const bom = "\uFEFF";
  const headers: Record<string, string> = {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
  };
  if (opts?.count != null) {
    headers["X-Export-Count"] = String(opts.count);
  }
  return new NextResponse(bom + body, { status: 200, headers });
}

export function exportFilename(prefix: string, filtered = false): string {
  const day = new Date().toISOString().slice(0, 10);
  return filtered ? `${prefix}-export-filtered-${day}.csv` : `${prefix}-export-${day}.csv`;
}
