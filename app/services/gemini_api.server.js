import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config } from 'dotenv';

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
        console.error("GEMINI_API_KEY environment variable is not set.");
        // Return mock JSON structure to prevent JSON.parse errors in policy_generator.server.js
        if (schema) {
            return JSON.stringify({ 
                privacyPolicyContent: "<h1>Mock Privacy Policy</h1><p>API key is missing, content not generated.</p>", 
                termsOfServiceContent: "<h1>Mock Terms of Service</h1>",
                refundPolicyContent: "<h1>Mock Refund Policy</h1>"
            });
        }
        return "Error: AI generation failed due to missing API key.";
    }
    
    // Attempt exponential backoff for API calls
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            // CRITICAL FIX: The top-level configuration field must be 'generationConfig' 
            // for Gemini API, not 'config'.
            const payload = {
                contents: [{ parts: [{ text: userQuery }] }],
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                },
                generationConfig: {} // <-- CORRECTED FIELD NAME
            };

            if (schema) {
                // Configure payload for structured JSON output
                payload.generationConfig.responseMimeType = "application/json";
                payload.generationConfig.responseSchema = schema;
            }

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
                const errorBody = await response.text();
                throw new Error(`API call failed with status: ${response.status} - ${response.statusText}. Details: ${errorBody}`);
            }

            const result = await response.json();
            
            // Check for prompt filtering or other safety errors
            if (result.candidates?.[0]?.finishReason === 'SAFETY') {
                throw new Error("Content generation failed due to safety settings.");
            }

            // Extract the generated text content
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) {
                throw new Error("Gemini API returned no usable content.");
            }

            return text; 

        } catch (error) {
            console.error(`Attempt ${attempt + 1} failed:`, error.message);
            if (attempt === 2) throw error;
        }
    }
}