import { Agent, run } from "@openai/agents";
import { z } from "zod";
import { CONFIG, COLOR_PALETTE, VISUAL_STYLES } from "../config/index.js";
import type { ImagePrompt } from "../types/index.js";
import { logInfo } from "../utils/logger.js";

const ImagePromptSchema = z.object({
    id: z.number().describe("Sequential ID starting from 1"),
    prompt: z.string().describe("Detailed image generation prompt"),
    style: z.string().describe("Visual style category"),
});

const PromptsOutputSchema = z.object({
    prompts: z.array(ImagePromptSchema).describe("Array of 100 image prompts"),
});

interface PromptsOutput {
    prompts: ImagePrompt[];
}

const colorPaletteDescription = Object.entries(COLOR_PALETTE)
    .map(([name, hex]) => `  - ${name}: ${hex}`)
    .join("\n");

const stylesDescription = VISUAL_STYLES.map((s) => `  - ${s}`).join("\n");

const systemInstructions = `You are an expert visual prompt engineer specializing in creating diverse, high-quality image generation prompts.

Your task is to generate exactly ${CONFIG.PROMPT_COUNT} unique image generation prompts based on the blog article content provided.

## REQUIREMENTS

### Style Diversity
Use each of these visual styles multiple times (aim for at least 5 prompts per style):
${stylesDescription}

### Color Palette
Incorporate these brand colors into your prompts where appropriate:
${colorPaletteDescription}

### Prompt Quality
Each prompt MUST:
1. Be self-contained and explicit about visual style, mood, and composition
2. Be optimized for AI image generation models
3. Include specific details about:
   - Subject matter and focal point
   - Color scheme (using the brand colors)
   - Lighting and atmosphere
   - Perspective and composition
   - Visual style from the list above
4. Be unique - avoid repetition in concept, composition, or visual approach
5. Draw inspiration from the blog article content

### Output Format
Return exactly ${CONFIG.PROMPT_COUNT} prompts as a JSON object with a "prompts" array.

Each prompt object must have:
- id: Sequential number (1 to ${CONFIG.PROMPT_COUNT})
- prompt: The full image generation prompt (be detailed and specific)
- style: The visual style category used

### Example Prompt Formats:
- "A minimal illustration of [subject] using a coral red (#ee5f53) and dark blue (#173353) color palette, clean lines, white background, modern flat design aesthetic"
- "Cyberpunk-style visualization of [concept] with neon green (#00dd82) accents against dark backgrounds, featuring glowing elements and futuristic tech motifs"
- "Hand-drawn sketch style depicting [scene], warm beige (#d8d7c1) tones with subtle green (#40979d) highlights, artistic imperfections, organic lines"`;

const promptGenerationAgent = new Agent({
    name: "Prompt Generation Agent",
    model: CONFIG.TEXT_MODEL,
    instructions: systemInstructions,
    outputType: PromptsOutputSchema,
});

export async function generatePrompts(articleContent: string): Promise<ImagePrompt[]> {
    logInfo("Starting prompt generation with GPT-5.2-Pro...");

    const userMessage = `Generate ${CONFIG.PROMPT_COUNT} diverse image prompts inspired by the following blog article. Each prompt should capture different aspects, concepts, or themes from the article while using varied visual styles and the specified color palette.

## Blog Article Content:

${articleContent}

---

Remember to:
1. Generate exactly ${CONFIG.PROMPT_COUNT} prompts
2. Use all visual styles from the list
3. Incorporate the brand colors
4. Make each prompt unique and detailed
5. Draw inspiration from the article content`;

    const result = await run(promptGenerationAgent, userMessage);

    if (!result.finalOutput) {
        throw new Error("Failed to generate prompts: No output received from agent");
    }

    const output = result.finalOutput as PromptsOutput;
    const prompts = output.prompts;

    if (prompts.length !== CONFIG.PROMPT_COUNT) {
        logInfo(`Warning: Expected ${CONFIG.PROMPT_COUNT} prompts but received ${prompts.length}`);
    }

    return prompts;
}
