// ============================================================================
// Safety & Security Actions
// Rate limiting, content filtering, and flagging for form submissions
// ============================================================================

"use server";

import { createClient } from "@/lib/supabase/server";
import {
  filterFormResponses,
  checkDangerousPatterns,
} from "@/lib/content-filter";
import { checkRateLimit } from "@/lib/rate-limit";
import type { ContentFilterResult } from "@/lib/content-filter";

type SupabaseClientType = Awaited<ReturnType<typeof createClient>>;

async function getAuthenticatedUserId(supabase: SupabaseClientType) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return user?.id ?? null;
}

async function assertOwnedForm(
  formId: string,
): Promise<
  | { success: true; supabase: SupabaseClientType; userId: string }
  | { success: false; error: string }
> {
  const supabase = await createClient();
  const userId = await getAuthenticatedUserId(supabase);

  if (!userId) {
    return { success: false, error: "Unauthenticated" };
  }

  const { data, error } = await supabase
    .from("request_forms")
    .select("id")
    .eq("id", formId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { success: false, error: String(error.message || error) };
  }

  if (!data) {
    return { success: false, error: "Forbidden" };
  }

  return { success: true, supabase, userId };
}

/**
 * Validate form submission for security issues
 * Returns: { isValid, isFlagged, reason, details }
 */
export async function validateFormSubmission(
  formId: string,
  responses: Record<string, any>,
  clientIp?: string,
): Promise<{
  isValid: boolean;
  isFlagged: boolean;
  riskLevel: "safe" | "warning" | "dangerous";
  reason?: string;
  flaggedFields?: Record<string, ContentFilterResult>;
}> {
  // Check rate limiting
  const ip = clientIp || "unknown";
  const rateCheck = checkRateLimit(ip);

  if (!rateCheck.allowed) {
    return {
      isValid: false,
      isFlagged: true,
      riskLevel: "warning",
      reason:
        "Rate limit exceeded. Please wait a moment before submitting again.",
    };
  }

  // Load custom blocklist for this form and check matches (owner-independent)
  try {
    const supabaseClient = await createClient();
    const { data: customPatterns, error: cbError } = await supabaseClient
      .from("custom_blocklists")
      .select("pattern, is_regex")
      .eq("form_id", formId);

    if (
      !cbError &&
      Array.isArray(customPatterns) &&
      customPatterns.length > 0
    ) {
      const blockedFields: Record<string, ContentFilterResult> = {};

      // Helper to escape regex when pattern is plain text
      const escapeRegex = (s: string) =>
        s.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");

      for (const [fieldName, value] of Object.entries(responses)) {
        const valuesToCheck: string[] = [];

        if (typeof value === "string") {
          valuesToCheck.push(value);
        } else if (Array.isArray(value)) {
          valuesToCheck.push(...value.filter((v) => typeof v === "string"));
        }

        for (const strValue of valuesToCheck) {
          for (const p of customPatterns as any[]) {
            let matched = false;

            if (p.is_regex) {
              try {
                const re = new RegExp(p.pattern, "i");
                if (re.test(strValue)) matched = true;
              } catch (e) {
                // invalid regex in DB - skip
              }
            } else {
              const re = new RegExp(`\\b${escapeRegex(p.pattern)}\\b`, "i");
              if (re.test(strValue)) matched = true;
            }

            if (matched) {
              blockedFields[fieldName] = {
                isSafe: false,
                riskLevel: "warning",
                flags: ["custom_blocklist_match"],
                reason: `Matched custom blocklist pattern: ${p.pattern}`,
              } as ContentFilterResult;

              break;
            }
          }
        }
      }

      if (Object.keys(blockedFields).length > 0) {
        return {
          isValid: true,
          isFlagged: true,
          riskLevel: "warning",
          reason: "Submission matched custom blocklist patterns",
          flaggedFields: blockedFields,
        };
      }
    }
  } catch (e) {
    // Non-fatal: if blocklist check fails, continue with standard filtering
    console.warn("Custom blocklist check failed:", e);
  }

  // Filter form responses
  const filterResult = filterFormResponses(responses);

  if (filterResult.overallRisk === "dangerous") {
    return {
      isValid: false,
      isFlagged: true,
      riskLevel: "dangerous",
      reason: "Submission contains content that violates our safety policy.",
      flaggedFields: filterResult.flaggedFields,
    };
  }

  // Warning level - still accept but flag for review
  if (filterResult.overallRisk === "warning") {
    return {
      isValid: true,
      isFlagged: true,
      riskLevel: "warning",
      reason: "Submission flagged for review due to suspicious content.",
      flaggedFields: filterResult.flaggedFields,
    };
  }

  return {
    isValid: true,
    isFlagged: false,
    riskLevel: "safe",
  };
}

/**
 * Record a flagged submission for later review
 */
export async function recordFlaggedRequest(
  formId: string,
  requestId: string,
  riskLevel: "warning" | "dangerous",
  flaggedFields: Record<string, ContentFilterResult>,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const payload = {
    form_id: formId,
    request_id: requestId,
    risk_level: riskLevel,
    flagged_fields: flaggedFields,
    reason,
    reviewed: false,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("flagged_requests").insert(payload);

  if (error) {
    console.error("Failed to record flagged request:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get flagged requests for a form (for the form creator)
 */
export async function getFlaggedRequestsForForm(
  formId: string,
  limit: number = 50,
): Promise<{
  success: boolean;
  flaggedRequests?: any[];
  error?: string;
}> {
  const ownedForm = await assertOwnedForm(formId);

  if (!ownedForm.success) {
    return { success: false, error: ownedForm.error };
  }
  const supabaseClient = (ownedForm as any).supabase;

  const { data, error } = await supabaseClient
    .from("flagged_requests")
    .select("*")
    .eq("form_id", formId)
    .eq("reviewed", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch flagged requests:", error);
    return { success: false, error: error.message };
  }

  return { success: true, flaggedRequests: data };
}

/**
 * Mark a flagged request as reviewed
 */
export async function markFlaggedAsReviewed(
  flaggedRequestId: string,
  action: "approved" | "rejected",
  notes?: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: flaggedRequest, error: lookupError } = await supabase
    .from("flagged_requests")
    .select("form_id")
    .eq("id", flaggedRequestId)
    .maybeSingle();

  if (lookupError) {
    console.error("Failed to load flagged request:", lookupError);
    return { success: false, error: lookupError.message };
  }

  if (!flaggedRequest?.form_id) {
    return { success: false, error: "Forbidden" };
  }

  const ownedForm = await assertOwnedForm(flaggedRequest.form_id);

  if (!ownedForm.success) {
    return { success: false, error: ownedForm.error };
  }

  const supabaseClient = (ownedForm as any).supabase;

  const { error } = await supabaseClient
    .from("flagged_requests")
    .update({
      reviewed: true,
      review_action: action,
      review_notes: notes || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", flaggedRequestId);

  if (error) {
    console.error("Failed to update flagged request:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Block an IP address (for severe violations)
 */
export async function blockIpAddress(
  formId: string,
  ipAddress: string,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  const ownedForm = await assertOwnedForm(formId);

  if (!ownedForm.success) {
    return { success: false, error: ownedForm.error };
  }

  const { supabase: supabaseClient } = ownedForm as any;

  const payload = {
    form_id: formId,
    ip_address: ipAddress,
    reason,
    blocked_at: new Date().toISOString(),
  };

  const { error } = await supabaseClient.from("blocked_ips").insert(payload);

  if (error) {
    console.error("Failed to block IP:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Check if an IP is blocked for a specific form
 */
export async function isIpBlocked(
  formId: string,
  ipAddress: string,
): Promise<boolean> {
  const ownedForm = await assertOwnedForm(formId);

  if (!ownedForm.success) {
    return false;
  }
  const { supabase: supabaseClient } = ownedForm as any;

  const { data, error } = await supabaseClient
    .from("blocked_ips")
    .select("id")
    .eq("form_id", formId)
    .eq("ip_address", ipAddress)
    .single();

  return !!data && !error;
}

/**
 * Add a word to the form's custom blocklist
 */
export async function addToCustomBlocklist(
  formId: string,
  pattern: string,
  isRegex: boolean = false,
): Promise<{ success: boolean; error?: string }> {
  const ownedForm = await assertOwnedForm(formId);

  if (!ownedForm.success) {
    return { success: false, error: ownedForm.error };
  }

  const { supabase: supabaseClient } = ownedForm as any;

  const payload = {
    form_id: formId,
    pattern,
    is_regex: isRegex,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabaseClient
    .from("custom_blocklists")
    .insert(payload);

  if (error) {
    console.error("Failed to add to blocklist:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get custom blocklist for a form
 */
export async function getCustomBlocklist(formId: string): Promise<{
  success: boolean;
  patterns?: any[];
  error?: string;
}> {
  const ownedForm = await assertOwnedForm(formId);

  if (!ownedForm.success) {
    return { success: false, error: ownedForm.error };
  }
  const { supabase: supabaseClient } = ownedForm as any;

  const { data, error } = await supabaseClient
    .from("custom_blocklists")
    .select("id, pattern, is_regex, created_at")
    .eq("form_id", formId);

  if (error) {
    console.error("Failed to fetch blocklist:", error);
    return { success: false, error: error.message };
  }

  return { success: true, patterns: data || [] };
}

/**
 * Remove a pattern from custom blocklist
 */
export async function removeFromCustomBlocklist(
  formId: string,
  pattern: string,
): Promise<{ success: boolean; error?: string }> {
  const ownedForm = await assertOwnedForm(formId);

  if (!ownedForm.success) {
    return { success: false, error: ownedForm.error };
  }
  const { supabase: supabaseClient } = ownedForm as any;

  const { error } = await supabaseClient
    .from("custom_blocklists")
    .delete()
    .eq("form_id", formId)
    .eq("pattern", pattern);

  if (error) {
    console.error("Failed to remove from blocklist:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
