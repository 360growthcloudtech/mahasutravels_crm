function setCsvParam(params: URLSearchParams, key: string, value?: string | string[] | null) {
  if (value == null) return;
  if (Array.isArray(value)) {
    if (value.length) params.set(key, value.join(","));
    return;
  }
  const trimmed = value.trim();
  if (trimmed) params.set(key, trimmed);
}

export function buildExportParams(
  query: Record<string, string | string[] | null | undefined>
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    setCsvParam(params, key, value);
  }
  return params;
}

/** Trigger a browser download from a CSV fetch response. Returns X-Export-Count. */
export async function downloadCsvFromResponse(res: Response, fallbackFilename: string): Promise<number> {
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to export CSV");
  }

  const countHeader = res.headers.get("X-Export-Count");
  const count = countHeader != null && Number.isFinite(Number(countHeader)) ? Number(countHeader) : 0;

  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = /filename="([^"]+)"/i.exec(disposition);
  const filename = match?.[1] || fallbackFilename;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  return count;
}
