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

// Patterns for critical safety issues (suicide, self-harm, severe harassment)
// ONLY includes specific phrases/patterns that indicate real danger.
const DANGEROUS_PATTERNS = [
  // English - explicit self-harm / suicidal intent and encouragement
  /\bkill yourself\b/i,
  /\bgo kill yourself\b/i,
  /\b(kill yourself|go kill yourself|go and kill yourself)\b/i,
  /\bkys\b/i,
  /\b(i want to die|i wanna die|i want to kill myself|want to kill myself|want to end my life|end my life|end it all)\b/i,
  /\b(im going to kill myself|i'm going to kill myself|i am going to kill myself|i will kill myself|i'll kill myself)\b/i,
  /\b(im gonna kill myself|i'm gonna kill myself|gonna kill myself)\b/i,
  /\b(i wanna kill myself|i want to kill myself)\b/i,
  /\b(hurt myself|harm myself|cut myself|cutting myself|cutting me)\b/i,
  /\b(hang myself|hang myself)\b/i,
  /\boverdose( myself)?\b/i,
  /\bself[- ]harm\b/i,
  /\bsuicide\b/i,
  /\bsuicidal\b/i,

  // English - severe harassment / threats toward others
  /\b(i will kill you|i'll kill you|im going to kill you|i'm going to kill you|i will murder you)\b/i,
  /\b(i will beat you|i'll beat you|im going to beat you|i'm going to beat you|i will hit you|i'll hit you)\b/i,
  /\bi will (rape|assault|abuse) you\b/i,

  // English - dehumanization / encouragement to die
  /\b(you should die|you should kill yourself|you deserve to die|you don't deserve to live|you dont deserve to live|go die|drop dead|please die|die please)\b/i,
  /\b(you're garbage|youre garbage|you're trash|youre trash)\b/i,

  // Suicide-related (Spanish)
  /\b(suicidarse?|suicidio|me voy a matar|voy a matarme?|quiero morirme?|suicid)\b/i,
  /\bmatate?s?\b/i, // "Mátate" - kill yourself
  /\bdeberias? morirte?\b/i, // "Deberías morir" - you should die
  /\bmueredate?\b/i, // "Muérete" - drop dead

  // Self-harm (Spanish)
  /\b(cortarme?|cortarte?|automutilaci[óo]n|mutilaci[óo]n|hacerme?|daño)\b/i,
  /\bcortes? profundos?\b/i,
  /\bdeep cuts\b/i,
  /\bdeep cut\b/i,

  // Severe harassment/threats (Spanish)
  /\b(te voy a violar|violarte|voy a abusarte|sexual abuse|rape)\b/i,
  /\b(te voy a matar|voy a matarte|voy a asesinarte)\b/i,
  /\b(te voy a pegar|voy a golpearte|agresión)\b/i,

  // Extreme dehumanization (Spanish)
  /\b(mereces? morir|no mereces? vivir|eres? basura|eres? menos que basura)\b/i,
];

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

  for (const pattern of DANGEROUS_PATTERNS) {
    try {
      // Ensure regex state is consistent if a global flag sneaks in
      if ((pattern as RegExp).lastIndex !== undefined)
        (pattern as RegExp).lastIndex = 0;

      if (pattern.test(text)) {
        flags.push("dangerous_content_detected");
        break;
      }
    } catch (e) {
      // If a pattern is malformed for any reason, skip it rather than crash
      continue;
    }
  }

  return flags;
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

  const allFlags: string[] = [];

  // Check dangerous content first (highest priority)
  const dangerousFlags = checkDangerousPatterns(text);
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
  if (
    allFlags.includes("dangerous_content_detected") ||
    allFlags.includes("malicious_url")
  ) {
    return {
      isSafe: false,
      riskLevel: "dangerous",
      flags: allFlags,
      reason: "Dangerous content detected",
    };
  }

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
