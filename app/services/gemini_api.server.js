import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config } from 'dotenv';
// Note: In a standard Remix environment, `fetch` is globally available,
// but for self-contained server environments, it is often useful to import.
// const fetch = global.fetch; // Or ensure 'node-fetch' is installed if needed outside of Remix's runtime.

// Load environment variables from .env file (if running locally outside the platform)
// NOTE: This dotenv setup is typically not needed in the canvas environment, but useful for local development.
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);
// config({ path: `${__dirname}/../../../.env` }); 

// CRITICAL: We rely on the global GEMINI_API_KEY environment variable.
const API_KEY = process.env.GEMINI_API_KEY || ""; 
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";

/**
 * Generates content using the Gemini API, optionally enforcing JSON structure.
 * * @param {string} systemPrompt - The instruction for the model's role and persona.
 * @param {string} userQuery - The specific request for content generation.
 * @param {object} [schema] - Optional JSON schema for structured output.
 * @returns {Promise<string>} The generated text content (raw text or JSON string).
 */
export async function generateGeminiContent(systemPrompt, userQuery, schema = null) {
    if (!API_KEY) {
        // This should not happen in the target platform, but is a useful check.
        console.error("GEMINI_API_KEY environment variable is not set.");
        // Return a mock response for development stability
        if (schema) {
            return JSON.stringify({ error: "API Key Missing", content: "MOCK JSON CONTENT" });
        }
        return "Error: AI generation failed due to missing API key.";
    }
    
    // Attempt exponential backoff for API calls
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const payload = {
                contents: [{ parts: [{ text: userQuery }] }],
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                },
                generationConfig: {}
            };

            if (schema) {
                // Configure payload for structured JSON output
                payload.generationConfig.responseMimeType = "application/json";
                payload.generationConfig.responseSchema = schema;
            }

            // In a standard Shopify Remix app, the host environment (like Fly.io or Render) 
            // often provides the API key access, so we rely on the global process.env.
            const response = await fetch(`${API_URL}?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                if (response.status === 429 && attempt < 2) {
                    const delay = Math.pow(2, attempt) * 1000;
                    console.warn(`Rate limit hit. Retrying in ${delay / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                throw new Error(`API call failed with status: ${response.status} - ${response.statusText}`);
            }

            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) {
                throw new Error("Gemini API returned no content in candidate part.");
            }

            return text;

        } catch (error) {
            console.error(`Attempt ${attempt + 1} failed:`, error.message);
            if (attempt === 2) throw error;
        }
    }
}
