export const PROFILE_SOCIAL_PLATFORMS = [
  {
    key: "janitorai",
    label: "Janitor AI",
    placeholder: "https://janitorai.com/...",
  },
  {
    key: "twitter",
    label: "Twitter / X",
    placeholder: "https://x.com/...",
  },
  {
    key: "discord",
    label: "Discord",
    placeholder: "username#0000",
  },
  {
    key: "github",
    label: "GitHub",
    placeholder: "https://github.com/...",
  },
  {
    key: "tiktok",
    label: "TikTok",
    placeholder: "https://tiktok.com/...",
  },
  {
    key: "youtube",
    label: "YouTube",
    placeholder: "https://youtube.com/...",
  },
  {
    key: "twitch",
    label: "Twitch",
    placeholder: "https://twitch.tv/...",
  },
] as const;

export type ProfileSocialKey = (typeof PROFILE_SOCIAL_PLATFORMS)[number]["key"];

export const PROFILE_SOCIAL_KEYS = PROFILE_SOCIAL_PLATFORMS.map(
  (platform) => platform.key,
);

const PROFILE_SOCIAL_LABELS = Object.fromEntries(
  PROFILE_SOCIAL_PLATFORMS.map((platform) => [platform.key, platform.label]),
) as Record<string, string>;

export function getProfileSocialLabel(key: string): string {
  return (
    PROFILE_SOCIAL_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1)
  );
}
