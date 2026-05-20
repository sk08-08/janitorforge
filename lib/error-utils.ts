import { v4 as uuidv4 } from "uuid";

export function friendlySupabaseError(
  err: unknown,
  fallback = "Something went wrong",
) {
  try {
    console.error("Supabase error:", err);
  } catch {}

  const msg =
    typeof err === "object" && err !== null && "message" in (err as any)
      ? String((err as any).message)
      : String(err ?? "");

  const l = msg.toLowerCase();
  if (l.includes("row-level security") || l.includes("rls")) {
    return "Unauthenticated (RLS): please sign in via Supabase";
  }
  if (l.includes("null value") && l.includes("shareable_link")) {
    return "Internal server error: missing shareable link. Please try again.";
  }
  if (l.includes("null value") && l.includes("description")) {
    return "Internal server error: missing description. Please try again.";
  }
  // Generic constraint violation
  if (l.includes("violates not-null constraint") || l.includes("null value")) {
    return "Internal server error: a required value is missing. Please check your input and try again.";
  }
  // Fall back to a safe message
  return fallback;
}

export function ensureShareableLink(link?: string | null) {
  if (link && String(link).trim() !== "") return link;
  return `form-${uuidv4().slice(0, 8)}`;
}
