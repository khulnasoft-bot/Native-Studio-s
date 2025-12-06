import { GoogleGenAI } from "@google/genai";

// Initialize the client with the environment variable API Key
// This assumes the environment handles the injection of process.env.API_KEY
export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const MODELS = {
  architect: 'gemini-2.5-flash', // Fast reasoning
  coder: 'gemini-3-pro-preview', // Complex coding tasks
  reviewer: 'gemini-2.5-flash', // Fast critique
};