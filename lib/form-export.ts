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

export function exportToCsv(data: ExportRow[], filename: string): void {
  if (data.length === 0) {
    console.warn("No data to export");
    return;
  }

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

  // Download
  downloadFile(csv, filename, "text/csv;charset=utf-8;");
}

// ---------------------------------------------------------------------------
// JSON Export
// ---------------------------------------------------------------------------

export function exportToJson(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
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
): ExportRow[] {
  return submissions.map((sub) => {
    const responses = sub.responses || {};
    const labelMap = sub.response_labels || {};
    const flattened: ExportRow = {
      "Fecha de envío": sub.created_at
        ? new Date(sub.created_at).toLocaleString()
        : "",
      Estado: sub.status || "pending",
      "Nombre del remitente": sub.submitter_name || "Anónimo",
    };

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

      if (Array.isArray(value)) {
        flattened[colName] = value.join("; ");
      } else if (value !== null && value !== undefined) {
        flattened[colName] = String(value);
      } else {
        flattened[colName] = "";
      }
    });

    return flattened;
  });
}
