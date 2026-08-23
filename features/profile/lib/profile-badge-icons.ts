import {
  Award,
  BadgeCheck,
  Crown,
  Gem,
  Shield,
  Sparkles,
  Star,
  Trophy,
  type LucideIcon,
} from "lucide-react";

const badgeIconMap: Record<string, LucideIcon> = {
  Award,
  BadgeCheck,
  Crown,
  Gem,
  Shield,
  Sparkles,
  Star,
  Trophy,
};

export function getProfileBadgeIcon(iconName?: string) {
  if (!iconName) return Award;
  return badgeIconMap[iconName] || Award;
}

export function getProfileBadgeIconOptions() {
  return Object.keys(badgeIconMap);
}
