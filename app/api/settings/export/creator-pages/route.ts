import { buildCurrentUserCreatorPagesExport } from "@/features/settings/lib/build-creator-pages-export";
import {
  createExportErrorResponse,
  createJsonExportResponse,
  getExportDate,
} from "@/features/settings/lib/export-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await buildCurrentUserCreatorPagesExport();

  if (!result.success) {
    return createExportErrorResponse(result.error);
  }

  return createJsonExportResponse(
    result.data,
    `janitorforge-creator-pages-export-${getExportDate()}.json`,
  );
}
