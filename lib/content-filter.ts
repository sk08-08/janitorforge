// ============================================================================
// Content Safety Filter
// Detects dangerous content directed at REAL people: self-harm encouragement,
// direct threats, hate speech, harassment
// Does NOT filter: fiction, roleplay, Dead Dove content, internet slang,
// casual swearing, memes, harmless expressions in any language
// ============================================================================

export interface ContentFilterResult {
  isSafe: boolean;
  riskLevel: "safe" | "warning" | "dangerous";
  flags: string[];
  reason?: string;
  matchedPattern?: string;
}

// ============================================================================
// DANGEROUS CONTENT — Targets real people, not fiction
// ============================================================================

// Suicide/self-harm ENCOURAGEMENT (directed at someone, not self-expression)
// These use word boundaries and "you/yourself" to avoid catching fictional context
const SUICIDE_PATTERNS: RegExp[] = [
  /\bkill\s*(your|ur)self\b/i,
  /\bk*y+s\b/i,
  /\bgo\s+kill\s*(your|ur)self\b/i,
  /\b(you\s+should|you\s+need\s+to|why\s+don'?t\s+you)\s+(just\s+)?(kill\s*(your|ur)self|die|end\s+it)\b/i,
  /\bcommit\s+suicide\b/i,
  /\bneck\s+rope\b/i,
  /\brope\s+and\s+stool\b/i,
  // First person suicidal ideation (directed at self, not fiction)
  /\b(i\s+want\s+to\s+die|i\s+wanna\s+die|i\s+want\s+to\s+kill\s+myself|want\s+to\s+end\s+my\s+life|end\s+it\s+all)\b/i,
  /\b(im|i'm|iam)\s+going\s+to\s+kill\s+myself\b/i,
  /\b(i\s+will|i'll)\s+kill\s+myself\b/i,
  /\b(i'm|im|i\s+am)\s+going\s+to\s+end\s+it\b/i,
  /\b(hurt|harm|cut)\s+myself\b/i,
  /\boverdose\s*(myself)?\b/i,
  /\bhang\s+myself\b/i,
  /\bself[- ]?harm\b/i,
];

// Severe threats (directed at a real person present in conversation)
const THREAT_PATTERNS: RegExp[] = [
  /\b(i\s+will|i'?ll|i'?m\s+going\s+to)\s+(kill|murder|execute)\s+(you|u|him|her|them)\b/i,
  /\b(i\s+will|i'?ll)\s+(rape|molest|assault)\s+(you|u|him|her|them)\b/i,
  /\bi'?ll\s+(beat|stab|shoot|burn)\s+(you|u)\s+(up|down)\b/i,
  /\bi'?m\s+going\s+to\s+(beat|stab|shoot|burn)\s+(you|u)\b/i,
  /\bi\s+know\s+where\s+(you|u)\s+live\b/i,
  /\bi'?ll\s+find\s+where\s+(you|u)\s+live\b/i,
  /\bdox|doxx|doxing|doxxing\b/i,
  /\bswat(ting|s)?\b/i,
];

// Hate speech — severe slurs directed at someone
const HATE_SPEECH_PATTERNS: RegExp[] = [
  /\b(f+a+g+o*t+|n+i+g+g+(e*r|a+h*)|r+e+t+a+r+d+)\b/i,
];

// Direct harassment (these are ONLY flagged when directed at someone with "you/ur")
const HARASSMENT_PATTERNS: RegExp[] = [
  /\byou'?re?\s*(a\s+)?(worthless|trash|garbage|subhuman|disgusting|pathetic|waste\s+of\s+(space|oxygen|life))\b/i,
  /\byou\s+don'?t\s+deserve\s+to\s+(live|exist|be\s+here)\b/i,
  /\bthe\s+world\s+would\s+be\s+better\s+without\s+(you|u)\b/i,
  /\bno\s+one\s+(would|will)\s+(care|miss)\s+if\s+(you|u)\s+(died|disappeared|were\s+gone)\b/i,
];

// Spanish — Suicide encouragement directed at someone
const SPANISH_SUICIDE_PATTERNS: RegExp[] = [
  /\b(mata[rt]e|suicida[rt]e)\b/i,
  /\b(anda|ve|vete)\s+a\s+mata[rt]e\b/i,
  /\b(deberias|debes?|tendrias?\s+que)\s+mori[rt]e?\b/i,
  /\b(muerete|muere[rt]e?)\b/i,
  /\bpor\s+qu[eé]\s+no\s+te\s+(mata[rt]e|mueres)\b/i,
  /\bkys\b/i,
];

// Spanish — Direct threats
const SPANISH_THREAT_PATTERNS: RegExp[] = [
  /\bte\s+(voy\s+a\s+)?(matar|asesinar|violar|golpear)\b/i,
  /\b(voy\s+a\s+)?(matar|asesinar|violar|golpear)te\b/i,
  /\bsé\s+dónde\s+vives?\b/i,
  /\bte\s+voy\s+a\s+(buscar|encontrar)\b/i,
];

// Spanish — Dehumanization directed at someone
const SPANISH_DEHUMANIZE_PATTERNS: RegExp[] = [
  /\b(eres?|son)\s+(basura|inutil|inútil|insecto|cucaracha)\b/i,
  /\bno\s+mereces?\s+(vivir|existir|estar\s+aqu[ií])\b/i,
  /\bmereces?\s+(morir|sufrir|lo\s+peor)\b/i,
];

// Portuguese — Common threats
const PORTUGUESE_PATTERNS: RegExp[] = [
  /\b(vai|vai\s+se)\s+matar\b/i,
  /\bte\s+matar\b/i,
  /\bmata[- ]?te\b/i,
  /\bmor(re|ra)\b/i,
];

const DANGEROUS_CATEGORY_MAP: Record<string, RegExp[]> = {
  suicide: SUICIDE_PATTERNS,
  threat: THREAT_PATTERNS,
  hate: HATE_SPEECH_PATTERNS,
  harassment: HARASSMENT_PATTERNS,
  spanish_suicide: SPANISH_SUICIDE_PATTERNS,
  spanish_threat: SPANISH_THREAT_PATTERNS,
  spanish_dehumanize: SPANISH_DEHUMANIZE_PATTERNS,
  portuguese: PORTUGUESE_PATTERNS,
};

// ============================================================================
// SPAM PATTERNS
// ============================================================================

const SPAM_PATTERNS: RegExp[] = [
  /(.)\1{19,}/, // Extreme character repetition
  /\b(viagra|cialis|casino|lottery|prize|winner|claim\s+now|free\s+money|hot\s+singles|click\s+here)\b/i,
  /(https?:\/\/[^\s]*\.(ru|tk|cf|ml|ga|gq|pw|cc)\b)/i, // Suspicious TLDs in links
];

// Known URL shorteners / phishing domains
const MALICIOUS_DOMAINS = [
  "bit.do",
  "short.link",
  "cutt.ly",
  "rb.gy",
  "tinyurl.com", // Only suspicious, not auto-blocked
];

const SUSPICIOUS_TLDS = [".ru", ".tk", ".cf", ".ml", ".ga", ".gq", ".pw"];

// ============================================================================
// PUBLIC INTERNET SLANG — Explicitly excluded from all filters
// These are common expressions that could false-positive on regex patterns.
// Adding them here ensures we never flag harmless internet culture.
// ============================================================================

const SLANG_WHITELIST = [
  "kms", // "kill me" as slang expression (e.g. "kms that's so funny")
  "lmao",
  "lmfao",
  "rofl",
  "bruh",
  "nah",
  "fr fr",
  "no cap",
  "ong",
  "deadass",
  "tbh",
  "ngl",
  "imo",
  "smh",
  "gg",
  "glhf",
  "rip",
  "oof",
  "yeet",
  "based",
  "cringe",
  "sus",
  "slay",
  "periodt",
  "stan",
  "woke",
  "tea",
  "period",
  "simp",
  "vibe check",
  "touch grass",
  "ratio",
  "cope",
  "seethe",
  "dingus",
  "brb",
  "idk",
  "idc",
  "afk",
  "ty",
  "ttyl",
  "btw",
];

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Normalize text for matching: unicode normalize, strip zero-width chars,
 * collapse whitespace, normalize simple leetspeak
 */
export function normalizeText(text: string): string {
  if (!text) return text;
  let s = text.normalize("NFC");
  // Remove zero-width spaces and invisible control chars
  s = s.replace(/[\u200B-\u200F\uFEFF\u2060-\u2064]/g, "");
  // Simple leetspeak (common bypass attempts)
  s = s
    .replace(/0/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t");
  // Collapse multiple whitespace into single space
  s = s.replace(/[\s\u00A0]+/g, " ").trim();
  return s;
}

/**
 * Check if the text contains any whitelisted slang expression
 * If so, it's likely safe internet talk, not actual danger
 */
function containsWhitelistedSlang(text: string): boolean {
  const lower = text.toLowerCase();
  return SLANG_WHITELIST.some((term) => lower.includes(term));
}

/**
 * Check dangerous content patterns (suicide, threats, hate, harassment)
 * Returns category flags for matched patterns
 */
export function checkDangerousPatterns(text: string): string[] {
  const flags: string[] = [];
  const seenCategories = new Set<string>();

  for (const [category, patterns] of Object.entries(DANGEROUS_CATEGORY_MAP)) {
    for (const pattern of patterns) {
      try {
        // Reset regex state for global patterns
        pattern.lastIndex = 0;
        if (pattern.test(text)) {
          seenCategories.add(category);
          if (
            category === "suicide" ||
            category === "spanish_suicide" ||
            category === "portuguese"
          ) {
            flags.push("dangerous_content_detected");
          } else if (category === "threat" || category === "spanish_threat") {
            flags.push("threat_detected");
          } else if (category === "hate") {
            flags.push("hate_speech_detected");
          } else if (
            category === "harassment" ||
            category === "spanish_dehumanize"
          ) {
            flags.push("harassment_detected");
          }
          break; // First match per category is enough
        }
      } catch {
        continue;
      }
    }
    // Don't break early — check all categories for comprehensive flags
  }

  return flags;
}

/**
 * Check for spam indicators
 */
export function checkSpamPatterns(text: string): string[] {
  const flags: string[] = [];

  if (SPAM_PATTERNS[0].test(text)) {
    flags.push("spam_repetition");
  }

  if (SPAM_PATTERNS[1].test(text)) {
    flags.push("spam_keywords");
  }

  // Ahora sí estamos usando tu tercera regla de spam
  if (SPAM_PATTERNS[2].test(text)) {
    flags.push("suspicious_url_domain");
  }

  return flags;
}

/**
 * Check for malicious or suspicious URLs in content
 */
export function checkMaliciousUrls(text: string): string[] {
  const flags: string[] = [];

  const urlPattern = /https?:\/\/[^\s)]+/g;
  const urls = text.match(urlPattern) || [];

  for (const url of urls) {
    try {
      const domain = new URL(url).hostname.toLowerCase();

      for (const maliciousDomain of MALICIOUS_DOMAINS) {
        if (domain.includes(maliciousDomain)) {
          flags.push("malicious_url");
          break;
        }
      }

      for (const tld of SUSPICIOUS_TLDS) {
        if (domain.endsWith(tld)) {
          flags.push("suspicious_url_domain");
          break;
        }
      }
    } catch {
      // Invalid URL, skip
    }
  }

  return flags;
}

/**
 * Check for aggression indicators in text
 */
export function checkAggression(text: string): string[] {
  const flags: string[] = [];

  // ALL CAPS aggression (only for longer messages — short caps are normal)
  if (text.length > 50) {
    const letters = text.replace(/[^a-zA-ZáéíóúñüÁÉÍÓÚÑÜ]/g, "");
    if (letters.length > 20) {
      const upperCount = (letters.match(/[A-ZÁÉÍÓÚÑÜ]/g) || []).length;
      if (upperCount / letters.length > 0.85) {
        flags.push("all_caps_aggression");
      }
    }
  }

  // Excessive punctuation (4+ exclamation/question marks)
  if (/!{4,}|\?{4,}/.test(text)) {
    flags.push("excessive_punctuation");
  }

  return flags;
}

/**
 * Main content filter — analyzes text for safety
 * Returns a safety assessment with flags and risk level
 */
export function filterContent(text: string): ContentFilterResult {
  if (!text || typeof text !== "string") {
    return { isSafe: true, riskLevel: "safe", flags: [] };
  }

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

  // Check aggression (lowest priority)
  const aggressionFlags = checkAggression(text);
  allFlags.push(...aggressionFlags);

  // If only aggression/spam flags AND text contains common slang, downgrade to safe
  const hasOnlyMinorFlags =
    allFlags.length > 0 &&
    allFlags.every(
      (f) => f === "all_caps_aggression" || f === "excessive_punctuation",
    );

  if (hasOnlyMinorFlags && containsWhitelistedSlang(text)) {
    return { isSafe: true, riskLevel: "safe", flags: [] };
  }

  // Dangerous: suicidal content, threats, hate speech, malicious URLs
  if (
    allFlags.includes("dangerous_content_detected") ||
    allFlags.includes("threat_detected") ||
    allFlags.includes("hate_speech_detected") ||
    allFlags.includes("malicious_url")
  ) {
    return {
      isSafe: false,
      riskLevel: "dangerous",
      flags: allFlags,
      reason: "Dangerous content detected",
    };
  }

  // Warning: harassment, spam, aggression
  if (allFlags.length > 0) {
    return {
      isSafe: false,
      riskLevel: "warning",
      flags: allFlags,
      reason: "Suspicious content detected",
    };
  }

  return { isSafe: true, riskLevel: "safe", flags: [] };
}

/**
 * Filter all text responses in a form submission
 * Returns per-field results and overall risk assessment
 */
export function filterFormResponses(responses: Record<string, any>): {
  isClean: boolean;
  flaggedFields: Record<string, ContentFilterResult>;
  overallRisk: "safe" | "warning" | "dangerous";
} {
  const flaggedFields: Record<string, ContentFilterResult> = {};
  let overallRisk: "safe" | "warning" | "dangerous" = "safe";

  for (const [fieldName, value] of Object.entries(responses)) {
    const valuesToCheck: string[] = [];

    if (typeof value === "string") {
      valuesToCheck.push(value);
    } else if (Array.isArray(value)) {
      valuesToCheck.push(...value.filter((v) => typeof v === "string"));
    }

    for (const strValue of valuesToCheck) {
      const result = filterContent(strValue);

      if (!result.isSafe) {
        flaggedFields[fieldName] = result;

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
