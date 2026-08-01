// ============================================================================
// JanitorForge - Form Data Export Utilities
// CSV and JSON export for form submissions
// ============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExportRow {
  [key: string]: string | number | boolean | string[];
}

function formatExportValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value))
    return value.map((item) => String(item)).join(" | ");
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // If contains comma, newline, or double-quote, wrap in quotes and escape quotes
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function serializeExportRowsToCsv(
  data: ExportRow[],
  options?: { includeBom?: boolean },
): string {
  if (data.length === 0) return "";

  // Collect all unique column names preserving order
  const columns = new Set<string>();
  data.forEach((row) => Object.keys(row).forEach((key) => columns.add(key)));
  const columnNames = Array.from(columns);

  // Build CSV content
  const header = columnNames.map((col) => escapeCsvValue(col)).join(",");
  const rows = data.map((row) =>
    columnNames.map((col) => escapeCsvValue(row[col])).join(","),
  );
  const csv = [header, ...rows].join("\n");

  if (options?.includeBom === false) {
    return csv;
  }

  return `\uFEFF${csv}`;
}

export function serializeExportDataToJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

export function exportToCsv(data: ExportRow[], filename: string): void {
  if (data.length === 0) {
    console.warn("No data to export");
    return;
  }

  const csvWithBom = serializeExportRowsToCsv(data, { includeBom: true });

  // Download
  downloadFile(csvWithBom, filename, "text/csv;charset=utf-8;");
}

// ---------------------------------------------------------------------------
// JSON Export
// ---------------------------------------------------------------------------

export function exportToJson(data: unknown, filename: string): void {
  const json = serializeExportDataToJson(data);
  downloadFile(json, filename, "application/json;charset=utf-8;");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function downloadFile(
  content: string,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Form submissions transformation
// ---------------------------------------------------------------------------

export interface SubmissionExportItem {
  submittedAt: string;
  status: string;
  submitterName: string;
  responses: Record<string, string>;
}

export function transformSubmissionsForExport(
  submissions: Array<{
    id?: string;
    form_title?: string;
    created_at?: string;
    status?: string;
    submitter_name?: string;
    responses?: Record<string, unknown>;
    response_labels?: Record<string, string>;
  }>,
  sectionMap?: Record<
    string,
    { label: string; fields: Record<string, string> }
  >,
  options?: { includeMetadata?: boolean },
): ExportRow[] {
  return submissions.map((sub) => {
    const responses = sub.responses || {};
    const labelMap = sub.response_labels || {};
    const flattened: ExportRow = {};

    if (options?.includeMetadata !== false) {
      flattened["Request ID"] = sub.id || "";
      flattened["Form Title"] = sub.form_title || "";
      flattened["Submission Date"] = sub.created_at
        ? new Date(sub.created_at).toLocaleString()
        : "";
      flattened["Status"] = sub.status || "new";
      flattened["Submitter Name"] = sub.submitter_name || "Anonymous";
    }

    // Flatten responses into columns using field labels instead of IDs
    Object.entries(responses).forEach(([fieldId, value]) => {
      // Use label from response_labels, or sectionMap, or fall back to fieldId
      const label = labelMap[fieldId] || fieldId;

      // Prevent duplicate column names
      let colName = label;
      let suffix = 2;
      while (flattened[colName] !== undefined) {
        colName = `${label} (${suffix++})`;
      }

      flattened[colName] = formatExportValue(value);
    });

    return flattened;
  });
}
