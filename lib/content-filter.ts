// ============================================================================
// Content Safety Filter
// Detects dangerous content: self-harm, suicide, severe harassment
// Does NOT censor slang, casual language, or neutral words
// ============================================================================

export interface ContentFilterResult {
  isSafe: boolean;
  riskLevel: "safe" | "warning" | "dangerous";
  flags: string[];
  reason?: string;
}

// Categorized patterns for safety detection.
// Keep patterns specific to reduce false positives.

// Suicidal / self-harm encouragement (highest severity)
const SUICIDE_PATTERNS: RegExp[] = [
  /\bkill yourself\b/i,
  /\bgo kill yourself\b/i,
  /\bkys\b/i,
  /\b(i want to die|i wanna die|i want to kill myself|want to end my life|end it all)\b/i,
  /\b(im going to kill myself|i'm going to kill myself|i will kill myself|i'll kill myself|im gonna kill myself|i'm gonna kill myself)\b/i,
  /\b(hurt myself|harm myself|cut myself|cutting myself)\b/i,
  /\boverdose( myself)?\b/i,
  /\bhang myself\b/i,
  /\bdeep cuts?\b/i,
  /\bself[- ]harm\b/i,
  /\bsuicide\b/i,
  /\bsuicidal\b/i,
];

// Severe threats (direct violence toward others)
const THREAT_PATTERNS: RegExp[] = [
  /\b(i will kill you|i'll kill you|im going to kill you|i'm going to kill you|i will murder you)\b/i,
  /\bi will (rape|assault|abuse) you\b/i,
  /\b(i will beat you|i'll beat you|im going to beat you|i'm going to beat you|i will hit you|i'll hit you)\b/i,
];

// Hate speech / severe slurs (sensitive)
const HATE_SPEECH_PATTERNS: RegExp[] = [/\b(faggot|nigger|retard)\b/i];

// General insults and dehumanization (warning level)
const INSULT_PATTERNS: RegExp[] = [
  /\b(bitch|slut|cunt|motherfucker|bastard|scumbag|asshole|dickhead|cumdump)\b/i,
  /\b(fuck you|fuck u|suck my dick|suck it)\b/i,
  /\b(go die|drop dead|you should die|you deserve to die|you don't deserve to live|youre garbage|you're garbage|you're trash|youre trash)\b/i,
];

// Spanish equivalents
const SPANISH_SUICIDE_PATTERNS: RegExp[] = [
  /\b(suicidarse?|suicidio|me voy a matar|voy a matarme?|quiero morirme?|suicid)\b/i,
  /\bmatate?s?\b/i,
  /\bdeberias? morirte?\b/i,
  /\bmuerete?\b/i,
];

const SPANISH_SELFHARM_PATTERNS: RegExp[] = [
  /\b(cortarme?|cortarte?|automutilaci[óo]n|mutilaci[óo]n|hacerme?|daño)\b/i,
  /\bcortes? profundos?\b/i,
];

const SPANISH_THREAT_PATTERNS: RegExp[] = [
  /\b(te voy a violar|violarte|voy a abusarte)\b/i,
  /\b(te voy a matar|voy a matarte|voy a asesinarte)\b/i,
  /\b(te voy a pegar|voy a golpearte|agresión)\b/i,
];

const SPANISH_DEHUMANIZE_PATTERNS: RegExp[] = [
  /\b(mereces? morir|no mereces? vivir|eres? basura|eres? menos que basura)\b/i,
];

const DANGEROUS_CATEGORY_MAP: { [key: string]: RegExp[] } = {
  suicide: SUICIDE_PATTERNS,
  threat: THREAT_PATTERNS,
  hate: HATE_SPEECH_PATTERNS,
  insult: INSULT_PATTERNS,
  spanish_suicide: SPANISH_SUICIDE_PATTERNS,
  spanish_selfharm: SPANISH_SELFHARM_PATTERNS,
  spanish_threat: SPANISH_THREAT_PATTERNS,
  spanish_dehumanize: SPANISH_DEHUMANIZE_PATTERNS,
};

// Spam/abuse patterns
const SPAM_PATTERNS = [
  /^(.{0,3})\1{20,}$/g, // Repetitive characters (aaaaa...)
  /(http|https|www)[^\s]*(.ru|.tk|.cf|.ml)/gi, // Suspicious domains
  /viagra|cialis|casino|lottery|prize|winner|claim|free money/gi, // Classic spam
];

// URLs that are commonly malicious
const MALICIOUS_DOMAINS = [
  "bit.do",
  "short.link",
  "tinyurl",
  "goo.gl",
  "ow.ly",
  "rebrand",
];

/**
 * Check if content contains dangerous patterns (suicide, self-harm, threats)
 */
export function checkDangerousPatterns(text: string): string[] {
  const flags: string[] = [];

  for (const [category, patterns] of Object.entries(DANGEROUS_CATEGORY_MAP)) {
    for (const pattern of patterns) {
      try {
        if ((pattern as RegExp).lastIndex !== undefined)
          (pattern as RegExp).lastIndex = 0;

        if (pattern.test(text)) {
          // Map categories to flags
          if (
            category === "suicide" ||
            category === "spanish_suicide" ||
            category === "spanish_selfharm"
          ) {
            flags.push("dangerous_content_detected");
          } else if (category === "threat" || category === "spanish_threat") {
            flags.push("threat_detected");
          } else if (category === "hate") {
            flags.push("hate_speech_detected");
          } else if (
            category === "insult" ||
            category === "spanish_dehumanize"
          ) {
            flags.push("insult_detected");
          }

          // stop at first match for performance
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (flags.length > 0) break;
  }

  return flags;
}

/**
 * Normalize text for more reliable matching: unicode normalize, lowercase,
 * collapse whitespace and strip zero-width chars and simple leetspeak.
 */
export function normalizeText(text: string): string {
  if (!text) return text;
  // Normalize unicode
  let s = text.normalize("NFC");
  // Remove zero-width spaces and control chars
  s = s.replace(/[\u200B-\u200F\uFEFF]/g, "");
  // Simple leetspeak normalization: 0->o, 1|!->i, 3->e, 4->a, 5->s, 7->t
  s = s
    .replace(/0/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t");
  // Collapse multiple whitespace/punctuation into single spaces for matching
  s = s.replace(/[\s\p{P}]+/gu, " ").trim();
  return s;
}

/**
 * Check for spam patterns
 */
export function checkSpamPatterns(text: string): string[] {
  const flags: string[] = [];

  // Check for extreme repetition
  if (/(.\S)\1{15,}/.test(text)) {
    flags.push("spam_repetition");
  }

  // Check for spam keywords
  if (
    /viagra|cialis|casino|lottery|prize|winner|claim|free money/i.test(text)
  ) {
    flags.push("spam_keywords");
  }

  return flags;
}

/**
 * Check for malicious URLs
 */
export function checkMaliciousUrls(text: string): string[] {
  const flags: string[] = [];

  // Extract URLs from text
  const urlPattern = /https?:\/\/[^\s]+/g;
  const urls = text.match(urlPattern) || [];

  for (const url of urls) {
    try {
      const domain = new URL(url).hostname;

      // Check against known malicious domains
      for (const maliciousDomain of MALICIOUS_DOMAINS) {
        if (domain.includes(maliciousDomain)) {
          flags.push("malicious_url");
          break;
        }
      }

      // Check for suspicious domains (.ru, .tk, .cf, .ml are often abuse vectors)
      if (/(\.ru|\.tk|\.cf|\.ml)$/i.test(domain)) {
        flags.push("suspicious_url_domain");
      }
    } catch (e) {
      // Invalid URL, skip
    }
  }

  return flags;
}

/**
 * Check for excessive capitals/aggression indicators
 */
export function checkAggression(text: string): string[] {
  const flags: string[] = [];

  if (text.length > 20) {
    const upperCount = (text.match(/[A-Z]/g) || []).length;
    const upperRatio = upperCount / text.length;

    // If more than 70% is uppercase, it's likely aggressive
    if (upperRatio > 0.7) {
      flags.push("all_caps_aggression");
    }
  }

  // Multiple exclamation marks or question marks
  if (/!{3,}|\?{3,}/.test(text)) {
    flags.push("excessive_punctuation");
  }

  return flags;
}

/**
 * Main filter function - analyzes content and returns safety assessment
 */
export function filterContent(text: string): ContentFilterResult {
  if (!text || typeof text !== "string") {
    return { isSafe: true, riskLevel: "safe", flags: [] };
  }

  // Normalize text to improve matching (handles unicode, simple leet, punctuation)
  const normalized = normalizeText(text);

  const allFlags: string[] = [];

  // Check dangerous content first (highest priority)
  const dangerousFlags = checkDangerousPatterns(normalized);
  allFlags.push(...dangerousFlags);

  // Check spam
  const spamFlags = checkSpamPatterns(text);
  allFlags.push(...spamFlags);

  // Check malicious URLs
  const urlFlags = checkMaliciousUrls(text);
  allFlags.push(...urlFlags);

  // Check aggression indicators (lower priority)
  const aggressionFlags = checkAggression(text);
  allFlags.push(...aggressionFlags);

  // Determine safety level
  // Dangerous when suicidal content, direct threats, or malicious URLs are found
  if (
    allFlags.includes("dangerous_content_detected") ||
    allFlags.includes("threat_detected") ||
    allFlags.includes("malicious_url")
  ) {
    return {
      isSafe: false,
      riskLevel: "dangerous",
      flags: allFlags,
      reason: "Dangerous content detected",
    };
  }
  // Warning for hate speech, insults, spam, or aggression indicators
  if (allFlags.length > 0) {
    return {
      isSafe: false,
      riskLevel: "warning",
      flags: allFlags,
      reason: "Suspicious content detected",
    };
  }

  return {
    isSafe: true,
    riskLevel: "safe",
    flags: [],
  };
}

/**
 * Filter all responses in a form submission
 */
export function filterFormResponses(responses: Record<string, any>): {
  isClean: boolean;
  flaggedFields: Record<string, ContentFilterResult>;
  overallRisk: "safe" | "warning" | "dangerous";
} {
  const flaggedFields: Record<string, ContentFilterResult> = {};
  let overallRisk: "safe" | "warning" | "dangerous" = "safe";

  for (const [fieldName, value] of Object.entries(responses)) {
    // Handle string or array values
    const valuesToCheck: string[] = [];

    if (typeof value === "string") {
      valuesToCheck.push(value);
    } else if (Array.isArray(value)) {
      valuesToCheck.push(...value.filter((v) => typeof v === "string"));
    }

    // Check each value
    for (const strValue of valuesToCheck) {
      const result = filterContent(strValue);

      if (!result.isSafe) {
        flaggedFields[fieldName] = result;

        // Update overall risk (dangerous > warning > safe)
        if (result.riskLevel === "dangerous") {
          overallRisk = "dangerous";
        } else if (
          result.riskLevel === "warning" &&
          overallRisk !== "dangerous"
        ) {
          overallRisk = "warning";
        }
      }
    }
  }

  return {
    isClean: Object.keys(flaggedFields).length === 0,
    flaggedFields,
    overallRisk,
  };
}
