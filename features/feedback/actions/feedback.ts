"use server";

import { createClient } from "@/lib/supabase/server";
import { friendlySupabaseError } from "@/lib/error-utils";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { z } from "zod";

const feedbackSchema = z.object({
  feedbackType: z.enum(["suggestion", "bug"]),
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(10).max(4000),
  contact: z.string().trim().max(160).optional().or(z.literal("")),
  sourcePage: z.string().trim().max(120).optional().default(""),
  sourceLabel: z.string().trim().max(160).optional().default(""),
  sourcePath: z.string().trim().max(240).optional().default(""),
  relatedId: z.string().trim().max(120).optional().or(z.literal("")),
  metadata: z.record(z.unknown()).optional(),
});

export async function submitFeedbackAction(
  input: z.infer<typeof feedbackSchema>,
) {
  const supabase = await createClient();
  const requestHeaders = await headers();
  const clientIp = getClientIp(requestHeaders);

  const rateCheck = checkRateLimit(`feedback:${clientIp}`);
  if (!rateCheck.allowed) {
    return {
      success: false,
      error:
        "You've sent too many messages. Please wait a moment and try again.",
    };
  }

  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please complete the feedback form before submitting it.",
    };
  }

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id ?? null;

  const payload = {
    feedback_type: parsed.data.feedbackType,
    subject: parsed.data.subject,
    message: parsed.data.message,
    contact: parsed.data.contact?.trim() || null,
    source_page: parsed.data.sourcePage || "",
    source_label: parsed.data.sourceLabel || "",
    source_path: parsed.data.sourcePath || "",
    related_id: parsed.data.relatedId?.trim() || null,
    metadata: {
      ...(parsed.data.metadata ?? {}),
      clientIp,
      submittedAt: new Date().toISOString(),
    },
    submitter_user_id: userId,
  };

  const { data, error } = await supabase
    .from("feedback_submissions")
    .insert(payload)
    .select("id, feedback_type, subject")
    .single();

  if (error) {
    return {
      success: false,
      error: friendlySupabaseError(error, "Failed to send feedback"),
    };
  }

  return { success: true, feedback: data };
}
