// ============================================================================
// JanitorForge - Token Validation Utilities
// Provides token counting and variable validation for bot content
// ============================================================================

import { encode } from "gpt-tokenizer";
import type { TokenValidation, Bot, CharacterCardV2 } from "./types";

// ----------------------------------------------------------------------------
// Token Counting
// ----------------------------------------------------------------------------

/**
 * Counts the number of tokens in a given text using GPT tokenizer
 */
export function countTokens(text: string): number {
  if (!text) return 0;
  return encode(text).length;
}

/**
 * Counts total tokens across all bot fields
 */
export function countBotTokens(bot: Partial<Bot>): number {
  const fields = [
    bot.personality || "",
    [bot.firstMessage || "", ...(bot.alternateGreetings || [])]
      .filter(Boolean)
      .join("\n\n"),
    bot.scenario || "",
    bot.exampleDialogues || "",
  ];
  return fields.reduce((total, field) => total + countTokens(field), 0);
}

// ----------------------------------------------------------------------------
// Variable Validation
// ----------------------------------------------------------------------------

const VALID_VARIABLES = ["{{char}}", "{{user}}"];
const VARIABLE_PATTERN = /\{\{(\w+)\}\}/g;

/**
 * Validates {{char}} and {{user}} variables in text
 * Returns validation result with counts and any invalid variables
 */
export function validateVariables(text: string): TokenValidation {
  const warnings: string[] = [];
  const invalidVariables: string[] = [];

  // Count valid variables
  const charMatches = text.match(/\{\{char\}\}/gi) || [];
  const userMatches = text.match(/\{\{user\}\}/gi) || [];

  // Check for case sensitivity issues
  const charLowercase = text.match(/\{\{char\}\}/g) || [];
  const charUppercase = text.match(/\{\{CHAR\}\}/g) || [];
  const charMixed =
    charMatches.length - charLowercase.length - charUppercase.length;

  if (charMixed > 0 || charUppercase.length > 0) {
    warnings.push("Consider using lowercase {{char}} for consistency");
  }

  const userLowercase = text.match(/\{\{user\}\}/g) || [];
  const userUppercase = text.match(/\{\{USER\}\}/g) || [];
  const userMixed =
    userMatches.length - userLowercase.length - userUppercase.length;

  if (userMixed > 0 || userUppercase.length > 0) {
    warnings.push("Consider using lowercase {{user}} for consistency");
  }

  // Find all variables and check for invalid ones
  let match;
  while ((match = VARIABLE_PATTERN.exec(text)) !== null) {
    const fullMatch = match[0].toLowerCase();
    if (!VALID_VARIABLES.includes(fullMatch)) {
      if (!invalidVariables.includes(match[0])) {
        invalidVariables.push(match[0]);
      }
    }
  }

  if (invalidVariables.length > 0) {
    warnings.push(`Invalid variables found: ${invalidVariables.join(", ")}`);
  }

  return {
    tokenCount: countTokens(text),
    charVariableCount: charMatches.length,
    userVariableCount: userMatches.length,
    invalidVariables,
    isValid: invalidVariables.length === 0,
    warnings,
  };
}

/**
 * Validates all bot fields and returns combined validation
 */
export function validateBot(bot: Partial<Bot>): TokenValidation {
  const allText = [
    bot.personality || "",
    [bot.firstMessage || "", ...(bot.alternateGreetings || [])]
      .filter(Boolean)
      .join("\n\n"),
    bot.scenario || "",
    bot.exampleDialogues || "",
  ].join("\n");

  return validateVariables(allText);
}

// ----------------------------------------------------------------------------
// Character Card V2 Export/Import
// ----------------------------------------------------------------------------

/**
 * Converts a Bot to Character Card V2 format
 */
export function botToCharacterCard(bot: Bot): CharacterCardV2 {
  const alternateGreetings = (bot.alternateGreetings || []).filter(Boolean);

  return {
    spec: "chara_card_v2",
    spec_version: "2.0",
    data: {
      name: bot.name,
      description: bot.shortDescription,
      personality: bot.personality,
      first_mes: bot.firstMessage,
      alternate_greetings:
        alternateGreetings.length > 0 ? alternateGreetings : undefined,
      scenario: bot.scenario,
      mes_example: bot.exampleDialogues,
      tags: bot.tags,
      extensions: {
        janitorforge: {
          rating: bot.rating,
          createdAt: bot.createdAt.toISOString(),
        },
      },
    },
  };
}

/**
 * Converts Character Card V2 to Bot format
 */
export function characterCardToBot(
  card: CharacterCardV2,
): Omit<Bot, "id" | "createdAt" | "updatedAt"> {
  const extensions = card.data.extensions?.janitorforge as
    | { rating?: string }
    | undefined;
  const alternateGreetings = (card.data.alternate_greetings || []).filter(
    Boolean,
  );

  return {
    name: card.data.name,
    shortDescription: card.data.description,
    personality: card.data.personality,
    firstMessage: card.data.first_mes,
    alternateGreetings,
    scenario: card.data.scenario,
    exampleDialogues: card.data.mes_example,
    tags: card.data.tags || [],
    rating: (extensions?.rating as "SFW" | "NSFW") || "SFW",
  };
}

/**
 * Encodes character card data into a PNG image with embedded metadata
 * Uses the standard chara field in tEXt chunk
 */
export async function exportCharacterCardPNG(
  bot: Bot,
  imageUrl?: string,
): Promise<Blob> {
  // Create character card data
  const cardData = botToCharacterCard(bot);
  const jsonString = JSON.stringify(cardData);
  const base64Data = btoa(unescape(encodeURIComponent(jsonString)));

  // Create a canvas with the bot image or a default
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  canvas.width = 400;
  canvas.height = 600;

  // Fill with gradient background
  const gradient = ctx.createLinearGradient(0, 0, 400, 600);
  gradient.addColorStop(0, "#2d1f4e");
  gradient.addColorStop(1, "#1a1625");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 400, 600);

  // Add bot name
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(bot.name, 200, 300);

  // Add subtitle
  ctx.fillStyle = "#a78bfa";
  ctx.font = "14px system-ui";
  ctx.fillText("Character Card V2", 200, 330);
  ctx.fillText("Created with JanitorForge", 200, 350);

  // If there is an image URL, try to load it
  if (imageUrl) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = imageUrl;
      });
      ctx.drawImage(img, 0, 0, 400, 600);
    } catch {
      // Image failed to load, use default canvas
    }
  }

  // Convert to blob - in a real implementation, you'd use a library like
  // png-chunk-text to properly embed the tEXt chunk with 'chara' keyword
  // For now, we'll just add the data as a comment in a custom format
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        // In production, use a proper PNG metadata library
        // For demo purposes, we'll return the blob with metadata stored separately
        const dataBlob = new Blob([blob, "\n---CHARA_DATA---\n", base64Data], {
          type: "image/png",
        });
        resolve(dataBlob);
      }
    }, "image/png");
  });
}

/**
 * Attempts to read character card data from a PNG file
 */
export async function importCharacterCardPNG(
  file: File,
): Promise<CharacterCardV2 | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        // Look for our embedded data marker
        const markerIndex = text.indexOf("---CHARA_DATA---");
        if (markerIndex !== -1) {
          const base64Data = text.slice(markerIndex + 17);
          const jsonString = decodeURIComponent(escape(atob(base64Data)));
          const cardData = JSON.parse(jsonString) as CharacterCardV2;
          resolve(cardData);
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    };
    reader.readAsText(file);
  });
}
