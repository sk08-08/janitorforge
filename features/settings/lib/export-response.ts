import "server-only";

import { NextResponse } from "next/server";

export function sanitizeExportFilenamePart(value: string): string {
  const safe = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return safe || "account";
}

export function getExportDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function createExportErrorResponse(error: string) {
  if (error === "Not authenticated") {
    return NextResponse.json(
      {
        success: false,
        error: "Not authenticated",
      },
      {
        status: 401,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  }

  return NextResponse.json(
    {
      success: false,
      error: "Could not generate export",
    },
    {
      status: 500,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
}

export function createJsonExportResponse(
  data: unknown,
  filename: string,
): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
