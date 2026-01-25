import OpenAI from "openai";
import { CONFIG } from "../config/index.js";
import type { ImagePrompt, GeneratedImage } from "../types/index.js";
import { withRetry, ConcurrencyPool } from "../utils/rateLimiter.js";
import { saveImage, saveImageFromUrl, generateImageFilename } from "../utils/fileHelpers.js";
import { logProgress, logProgressComplete, logError, logInfo } from "../utils/logger.js";

const openai = new OpenAI();

interface ImageGenerationResponse {
    data: Array<{
        b64_json?: string;
        url?: string;
        revised_prompt?: string;
    }>;
}

async function generateSingleImage(prompt: ImagePrompt): Promise<GeneratedImage> {
    return withRetry(async () => {
        const response = (await openai.images.generate({
            model: CONFIG.IMAGE_MODEL,
            prompt: prompt.prompt,
            size: CONFIG.IMAGE_SIZE,
            quality: CONFIG.IMAGE_QUALITY,
            output_format: CONFIG.OUTPUT_FORMAT,
            n: 1,
        })) as ImageGenerationResponse;

        const imageData = response.data[0];
        const filename = generateImageFilename(prompt.id, prompt.style);

        // Handle both base64 and URL responses
        if (imageData.b64_json) {
            await saveImage(imageData.b64_json, filename);
        } else if (imageData.url) {
            await saveImageFromUrl(imageData.url, filename);
        } else {
            throw new Error("No image data received from API");
        }

        return {
            id: prompt.id,
            filename,
            success: true,
        };
    });
}

export async function generateAllImages(prompts: ImagePrompt[]): Promise<GeneratedImage[]> {
    logInfo(`Starting image generation for ${prompts.length} prompts...`);
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

export async function generateImage(prompt: ImagePrompt): Promise<GeneratedImage> {
    try {
        return await generateSingleImage(prompt);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            id: prompt.id,
            filename: "",
            success: false,
            error: errorMessage,
        };
    }
}
