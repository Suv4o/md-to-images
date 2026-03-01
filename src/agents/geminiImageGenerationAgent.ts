import { GoogleGenAI } from "@google/genai";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { CONFIG } from "../config/index.js";
import type { ImagePrompt, GeneratedImage } from "../types/index.js";
import { withRetry, ConcurrencyPool } from "../utils/rateLimiter.js";
import { saveImage, generateImageFilename, type ReferenceImage } from "../utils/fileHelpers.js";
import { logProgress, logProgressComplete, logError, logInfo } from "../utils/logger.js";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

let referenceImagePath: string | null = null;
let referenceImageFilename: string | null = null;

export function setGeminiReferenceImage(refImage: ReferenceImage | null): void {
    referenceImagePath = refImage?.path ?? null;
    referenceImageFilename = refImage?.filename ?? null;
}

function getMimeType(filename: string): "image/png" | "image/jpeg" | "image/webp" {
    const ext = extname(filename).toLowerCase();
    switch (ext) {
        case ".png":
            return "image/png";
        case ".jpg":
        case ".jpeg":
            return "image/jpeg";
        case ".webp":
            return "image/webp";
        default:
            return "image/png";
    }
}

async function generateSingleImage(prompt: ImagePrompt): Promise<GeneratedImage> {
    return withRetry(async () => {
        let promptText = prompt.prompt;
        const contents: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

        if (referenceImagePath && referenceImageFilename) {
            const imageBuffer = await readFile(referenceImagePath);
            const mimeType = getMimeType(referenceImageFilename);
            const base64Data = imageBuffer.toString("base64");

            contents.push({
                inlineData: {
                    mimeType,
                    data: base64Data,
                },
            });
            promptText = `Use the same visual style as the reference image. ${promptText}`;
        }

        contents.push({ text: promptText });

        const response = await ai.models.generateContent({
            model: CONFIG.GEMINI_IMAGE_MODEL,
            contents,
            config: {
                responseModalities: ["IMAGE"],
                imageConfig: {
                    aspectRatio: CONFIG.GEMINI_ASPECT_RATIO,
                },
            },
        });

        const filename = generateImageFilename(prompt.id, prompt.style);

        const candidates = response.candidates;
        if (!candidates || candidates.length === 0) {
            throw new Error("No candidates received from Gemini API");
        }

        const parts = candidates[0].content?.parts;
        if (!parts || parts.length === 0) {
            throw new Error("No parts received from Gemini API response");
        }

        let imageSaved = false;
        for (const part of parts) {
            if (part.inlineData?.data) {
                await saveImage(part.inlineData.data, filename);
                imageSaved = true;
                break;
            }
        }

        if (!imageSaved) {
            throw new Error("No image data received from Gemini API");
        }

        return {
            id: prompt.id,
            filename,
            success: true,
        };
    });
}

export async function generateAllGeminiImages(prompts: ImagePrompt[]): Promise<GeneratedImage[]> {
    logInfo(`Starting Gemini image generation for ${prompts.length} prompts...`);
    logInfo(`Model: ${CONFIG.GEMINI_IMAGE_MODEL}`);
    logInfo(`Concurrency limit: ${CONFIG.CONCURRENCY_LIMIT}`);

    const pool = new ConcurrencyPool(CONFIG.CONCURRENCY_LIMIT);
    const results: GeneratedImage[] = [];
    let completed = 0;

    const generatePromises = prompts.map((prompt) =>
        pool.run(async () => {
            try {
                const result = await generateSingleImage(prompt);
                completed++;
                logProgress(completed, prompts.length, `Generated: ${result.filename}`);
                return result;
            } catch (error) {
                completed++;
                const errorMessage = error instanceof Error ? error.message : String(error);
                logError(error, `Failed to generate image ${prompt.id} (${prompt.style})`);
                logProgress(completed, prompts.length, `Failed: image ${prompt.id}`);
                return {
                    id: prompt.id,
                    filename: "",
                    success: false,
                    error: errorMessage,
                };
            }
        }),
    );

    const allResults = await Promise.all(generatePromises);
    results.push(...allResults);

    logProgressComplete(prompts.length);

    return results.sort((a, b) => a.id - b.id);
}
