import { Plan } from '../../types';
import { ai, MODELS } from '../llm';
import { SYSTEM_PROMPTS } from '../prompts';
import { Type } from "@google/genai";

export async function architectAgent(task: string): Promise<Plan> {
  // Real AI Implementation
  try {
    const response = await ai.models.generateContent({
      model: MODELS.architect,
      contents: `User Task: "${task}"\n\nAnalyze the task and provide a execution plan.`,
      config: {
        systemInstruction: SYSTEM_PROMPTS.ARCHITECT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            task: { type: Type.STRING },
            steps: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            filesToEdit: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "List of relative file paths that need to be created or modified."
            },
            metadata: {
              type: Type.OBJECT,
              properties: {
                strategy: { type: Type.STRING },
                confidence: { type: Type.STRING }
              }
            }
          },
          required: ["task", "steps", "filesToEdit"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as Plan;
    }
    
    throw new Error("Empty response from Architect Agent");
  } catch (error) {
    console.error("Architect Agent Failed:", error);
    // Fallback for demo if API fails or key is missing
    return {
      task,
      steps: ["Error contacting AI. Using fallback plan.", "Check network or API Key."],
      filesToEdit: ["src/index.ts"],
      metadata: { error: "API Failure" }
    };
  }
}