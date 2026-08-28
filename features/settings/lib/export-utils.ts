import "server-only";

import type { ExportRecord } from "@/features/settings/lib/export-types";

const PAGE_SIZE = 1000;
const ID_CHUNK_SIZE = 100;

type QueryResult<T> = {
  data: T[] | null;
  error: {
    message?: string;
  } | null;
};

export async function fetchAllPages<T>(
  label: string,
  fetchPage: (from: number, to: number) => PromiseLike<QueryResult<T>>,
): Promise<T[]> {
  const allRows: T[] = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await fetchPage(from, to);

    if (error) {
      throw new Error(
        `Failed to export ${label}: ${
          error.message || "Unknown database error"
        }`,
      );
    }

    const rows = data ?? [];

    allRows.push(...rows);

    if (rows.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return allRows;
}

export async function fetchAllPagesInChunks<TValue, TRow>(
  label: string,
  values: TValue[],
  fetchPage: (
    values: TValue[],
    from: number,
    to: number,
  ) => PromiseLike<QueryResult<TRow>>,
): Promise<TRow[]> {
  if (values.length === 0) {
    return [];
  }

  const result: TRow[] = [];

  for (let index = 0; index < values.length; index += ID_CHUNK_SIZE) {
    const chunk = values.slice(index, index + ID_CHUNK_SIZE);

    const rows = await fetchAllPages(
      label,
      async (from, to) => await fetchPage(chunk, from, to),
    );

    result.push(...rows);
  }

  return result;
}

export function asExportRecords<T extends object>(rows: T[]): ExportRecord[] {
  return rows as ExportRecord[];
}

export function uniqueById<T extends Record<string, unknown>>(rows: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const row of rows) {
    const id = typeof row.id === "string" ? row.id : null;

    if (!id) {
      result.push(row);
      continue;
    }

    if (seen.has(id)) {
      continue;
    }

    seen.add(id);
    result.push(row);
  }

  return result;
}
