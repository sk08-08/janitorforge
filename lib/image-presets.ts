export const IMAGE_PRESETS = {
  formBanner: {
    label: "Form banner",
    recommendedWidth: 1600,
    recommendedHeight: 400,
    aspect: 4,
    cropShape: "rect" as const,
  },

  profileBanner: {
    label: "Profile banner",
    recommendedWidth: 1600,
    recommendedHeight: 400,
    aspect: 4,
    cropShape: "rect" as const,
  },

  profileAvatar: {
    label: "Profile picture",
    recommendedWidth: 512,
    recommendedHeight: 512,
    aspect: 1,
    cropShape: "round" as const,
  },
} as const;
