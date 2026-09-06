// Creator Page embed URL normalization and provider-specific iframe sources.

import { normalizeCreatorPageHttpUrl } from "./creator-page-links";

export type CreatorEmbedProvider =
  | "youtube"
  | "vimeo"
  | "spotify"
  | "twitch"
  | "custom";

export interface CreatorEmbedSourceResult {
  valid: boolean;
  src: string | null;
  normalizedUrl: string | null;
  message: string;
  requiresParent?: boolean;
}

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "youtu.be",
]);

const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);

const SPOTIFY_HOSTS = new Set(["open.spotify.com", "www.open.spotify.com"]);

const TWITCH_HOSTS = new Set([
  "twitch.tv",
  "www.twitch.tv",
  "m.twitch.tv",
  "player.twitch.tv",
]);

function invalid(message: string): CreatorEmbedSourceResult {
  return {
    valid: false,
    src: null,
    normalizedUrl: null,
    message,
  };
}

function safeUrl(rawUrl: string): URL | null {
  const normalized = normalizeCreatorPageHttpUrl(rawUrl, {
    label: "embed URL",
  });

  if (!normalized.valid || !normalized.href) return null;

  try {
    return new URL(normalized.href);
  } catch {
    return null;
  }
}

function youtubeSource(url: URL): CreatorEmbedSourceResult {
  if (!YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) {
    return invalid("Use a YouTube or youtu.be URL.");
  }

  let id = "";

  if (url.hostname.toLowerCase() === "youtu.be") {
    id = url.pathname.split("/").filter(Boolean)[0] || "";
  } else if (url.pathname === "/watch") {
    id = url.searchParams.get("v") || "";
  } else {
    const parts = url.pathname.split("/").filter(Boolean);
    const markerIndex = parts.findIndex((part) =>
      ["embed", "shorts", "live"].includes(part),
    );

    if (markerIndex >= 0) {
      id = parts[markerIndex + 1] || "";
    }
  }

  if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) {
    return invalid("This YouTube URL does not contain a valid video ID.");
  }

  return {
    valid: true,
    src: `https://www.youtube-nocookie.com/embed/${id}`,
    normalizedUrl: url.toString(),
    message: "YouTube video recognized.",
  };
}

function vimeoSource(url: URL): CreatorEmbedSourceResult {
  if (!VIMEO_HOSTS.has(url.hostname.toLowerCase())) {
    return invalid("Use a Vimeo URL.");
  }

  const id =
    url.pathname
      .split("/")
      .filter(Boolean)
      .find((part) => /^\d+$/.test(part)) || "";

  if (!id) {
    return invalid("This Vimeo URL does not contain a valid video ID.");
  }

  return {
    valid: true,
    src: `https://player.vimeo.com/video/${id}`,
    normalizedUrl: url.toString(),
    message: "Vimeo video recognized.",
  };
}

function spotifySource(url: URL): CreatorEmbedSourceResult {
  if (!SPOTIFY_HOSTS.has(url.hostname.toLowerCase())) {
    return invalid("Use an open.spotify.com URL.");
  }

  const parts = url.pathname.split("/").filter(Boolean);
  const allowedTypes = new Set([
    "track",
    "album",
    "playlist",
    "episode",
    "show",
    "artist",
  ]);

  let typeIndex = 0;

  if (parts[0] === "embed") {
    typeIndex = 1;
  }

  const type = parts[typeIndex] || "";
  const id = parts[typeIndex + 1] || "";

  if (!allowedTypes.has(type) || !/^[A-Za-z0-9]+$/.test(id)) {
    return invalid(
      "Use a Spotify track, album, playlist, episode, show, or artist URL.",
    );
  }

  return {
    valid: true,
    src: `https://open.spotify.com/embed/${type}/${id}`,
    normalizedUrl: url.toString(),
    message: "Spotify content recognized.",
  };
}

function twitchSource(
  url: URL,
  twitchParent?: string,
): CreatorEmbedSourceResult {
  if (!TWITCH_HOSTS.has(url.hostname.toLowerCase())) {
    return invalid("Use a Twitch video or channel URL.");
  }

  const parts = url.pathname.split("/").filter(Boolean);
  let videoId = "";
  let channel = "";

  if (url.hostname.toLowerCase() === "player.twitch.tv") {
    const rawVideo = url.searchParams.get("video") || "";
    videoId = rawVideo.replace(/^v/, "");
    channel = url.searchParams.get("channel") || "";
  } else if (parts[0] === "videos") {
    videoId = parts[1] || "";
  } else if (parts[0]) {
    channel = parts[0];
  }

  if (videoId && !/^\d+$/.test(videoId)) {
    return invalid("This Twitch video URL is not valid.");
  }

  if (channel && !/^[A-Za-z0-9_]{2,25}$/.test(channel)) {
    return invalid("This Twitch channel URL is not valid.");
  }

  if (!videoId && !channel) {
    return invalid("Use a Twitch video or channel URL.");
  }

  if (!twitchParent) {
    return {
      valid: true,
      src: null,
      normalizedUrl: url.toString(),
      message: "Twitch URL recognized.",
      requiresParent: true,
    };
  }

  const params = new URLSearchParams({
    parent: twitchParent,
  });

  if (videoId) {
    params.set("video", `v${videoId}`);
  } else {
    params.set("channel", channel);
  }

  return {
    valid: true,
    src: `https://player.twitch.tv/?${params.toString()}`,
    normalizedUrl: url.toString(),
    message: "Twitch content recognized.",
  };
}

export function normalizeCreatorEmbedSource({
  provider,
  url,
  twitchParent,
}: {
  provider: CreatorEmbedProvider;
  url: string;
  twitchParent?: string;
}): CreatorEmbedSourceResult {
  const parsed = safeUrl(url);

  if (!parsed) {
    return invalid("Enter a valid HTTP or HTTPS URL.");
  }

  switch (provider) {
    case "youtube":
      return youtubeSource(parsed);

    case "vimeo":
      return vimeoSource(parsed);

    case "spotify":
      return spotifySource(parsed);

    case "twitch":
      return twitchSource(parsed, twitchParent);

    case "custom":
      return {
        valid: true,
        src: parsed.toString(),
        normalizedUrl: parsed.toString(),
        message: "Custom URL accepted. It will be sandboxed.",
      };
  }
}

export function creatorEmbedPlaceholder(
  provider: CreatorEmbedProvider,
): string {
  switch (provider) {
    case "youtube":
      return "https://youtube.com/watch?v=...";
    case "vimeo":
      return "https://vimeo.com/...";
    case "spotify":
      return "https://open.spotify.com/track/...";
    case "twitch":
      return "https://twitch.tv/videos/... or https://twitch.tv/channel";
    case "custom":
      return "https://example.com/embed";
  }
}
