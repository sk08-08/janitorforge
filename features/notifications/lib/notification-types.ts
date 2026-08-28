export const NOTIFICATION_TYPES = [
  "new_follower",
  "collaboration_invite",
  "collaboration_accepted",
  "collaboration_declined",
  "collaboration_role_changed",
  "collaborator_removed",
  "change_request_created",
  "change_request_approved",
  "change_request_rejected",
  "flagged_submission",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationRecord {
  id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export function isNotificationType(value: unknown): value is NotificationType {
  return (
    typeof value === "string" &&
    (NOTIFICATION_TYPES as readonly string[]).includes(value)
  );
}
