export const PROFILE_ASSETS_BUCKET = "profile-assets";
export const BOT_ASSETS_BUCKET = "bot-assets";

function normalizePathSegment(segment: string) {
  return encodeURIComponent(segment).replace(/%2F/g, "/");
}

export function getStoragePublicUrl(bucket: string, path?: string | null) {
  const safePath = String(path || "").trim();
  if (!safePath) return "";

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return "";

  return `${baseUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${normalizePathSegment(safePath)}`;
}

export function extractStorageObjectPathFromPublicUrl(
  url: string | null | undefined,
  bucket: string,
) {
  const raw = String(url || "").trim();
  if (!raw) return "";

  const marker = `/storage/v1/object/public/${bucket}/`;
  const markerIndex = raw.indexOf(marker);
  if (markerIndex === -1) return "";

  const encodedPath = raw.slice(markerIndex + marker.length).split("?")[0];
  if (!encodedPath) return "";

  try {
    return decodeURIComponent(encodedPath);
  } catch {
    return encodedPath;
  }
}
