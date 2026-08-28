export interface NotificationPreferences {
  social: boolean;
  collaborations: boolean;
  moderation: boolean;
}

export type NotificationPreferenceKey = keyof NotificationPreferences;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  social: true,
  collaborations: true,
  moderation: true,
};
