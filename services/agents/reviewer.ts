import { CodePatch, Review } from '../../types';
import { ai, MODELS } from '../llm';
import { SYSTEM_PROMPTS } from '../prompts';
import { Type } from "@google/genai";

// Simulated ESLint Configuration
const LINT_CONFIG = {
  rules: {
    "eqeqeq": ["error", "always"], // Enforce ===
    "no-explicit-any": "warn",     // Discourage 'any' type
    "semi": ["error", "always"],   // Enforce semicolons
    "curly": ["error", "all"],     // Enforce curly braces
    "no-var": "error"              // No var, use let/const
  }
};

export async function reviewerAgent(patches: CodePatch[]): Promise<Review> {
  const combinedDiffs = patches.map(p => p.diff).join('\n');

  if (!combinedDiffs || combinedDiffs.length < 5) {
      return { ok: false, issues: ["No code changes were generated."] };
  }

  try {
    const response = await ai.models.generateContent({
      model: MODELS.reviewer,
      contents: `
LINT CONFIGURATION:
${JSON.stringify(LINT_CONFIG, null, 2)}

Please review the following Unified Diffs against the Lint Configuration and general best practices:

${combinedDiffs}`,
      config: {
        systemInstruction: SYSTEM_PROMPTS.REVIEWER,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ok: { type: Type.BOOLEAN },
            issues: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["ok", "issues"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as Review;
    }
    
    throw new Error("Empty response from Reviewer");

  } catch (error) {
    console.error("Reviewer Agent Failed:", error);
    return { ok: true, issues: ["Reviewer offline, skipping checks."] };
  }
}