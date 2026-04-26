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

const coverImageInstructions = CONFIG.COVER_IMAGE_MODE
    ? `

### COVER IMAGE MODE (CRITICAL - This is the most important requirement!)
All images MUST be suitable for use as blog cover/hero images. This means:

1. **Clean, Uncluttered Composition**: Keep the design simple and focused. Avoid busy or chaotic visuals.
2. **Space for Text Overlay**: Leave negative space (preferably on the left or top portion) where a blog title could be placed.
3. **Strong Visual Focus**: Have a clear focal point that draws the eye but doesn't overwhelm.
4. **Professional & Polished**: Images should look professional, suitable for a tech blog or business website.
5. **Landscape Orientation**: Design for wide/horizontal format (16:9 or similar ratio).
6. **Eye-catching but Subtle**: The image should attract attention without being distracting from the article content.
7. **Consistent Theme**: Each image should clearly relate to the blog article's main topic.
8. **No Text in Images**: Do not include any text, titles, or words within the image itself.
9. **High Visual Impact**: Use bold colors from the palette, strong contrasts, and clear shapes.

Think of these as professional blog header images you'd see on Medium, Dev.to, or tech company blogs.
`
    : "";

const systemInstructions = `You are an expert visual prompt engineer specializing in creating diverse, high-quality image generation prompts.

Your task is to generate exactly ${CONFIG.PROMPT_COUNT} unique image generation prompts based on the blog article content provided.

## REQUIREMENTS
${coverImageInstructions}
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
5. Draw inspiration from the blog article content${CONFIG.COVER_IMAGE_MODE ? "\n6. Be suitable as a blog cover/hero image (clean, professional, with space for text)" : ""}

### Output Format
Return exactly ${CONFIG.PROMPT_COUNT} prompts as a JSON object with a "prompts" array.

Each prompt object must have:
- id: Sequential number (1 to ${CONFIG.PROMPT_COUNT})
- prompt: The full image generation prompt (be detailed and specific)
- style: The visual style category used

### Example Prompt Formats:${CONFIG.COVER_IMAGE_MODE ? `
- "A clean, professional cover image featuring [subject] in a minimal style, coral red (#ee5f53) accent on dark blue (#173353) background, strong focal point on the right with negative space on the left for title text, modern tech blog aesthetic"
- "Blog hero image with isometric visualization of [concept], clean composition with breathing room, neon green (#00dd82) highlights against muted beige (#d8d7c1) background, professional and polished look suitable for a tech article header"` : `
- "A minimal illustration of [subject] using a coral red (#ee5f53) and dark blue (#173353) color palette, clean lines, white background, modern flat design aesthetic"
- "Cyberpunk-style visualization of [concept] with neon green (#00dd82) accents against dark backgrounds, featuring glowing elements and futuristic tech motifs"
- "Hand-drawn sketch style depicting [scene], warm beige (#d8d7c1) tones with subtle green (#40979d) highlights, artistic imperfections, organic lines"`}`;

const promptGenerationAgent = new Agent({
    name: "Prompt Generation Agent",
    model: CONFIG.TEXT_MODEL,
    instructions: systemInstructions,
    outputType: PromptsOutputSchema,
});

export interface GeneratePromptsOptions {
    articleContent: string;
    customInstructions?: string | null;
    hasReferenceImage?: boolean;
}

export async function generatePrompts(options: GeneratePromptsOptions): Promise<ImagePrompt[]> {
    const { articleContent, customInstructions, hasReferenceImage } = options;

    logInfo(`Starting prompt generation with ${CONFIG.TEXT_MODEL}...`);

    const coverModeNote = CONFIG.COVER_IMAGE_MODE
        ? " All images must be suitable for use as blog cover/hero images - clean, professional, with space for text overlay."
        : "";

    let userMessage = `Generate ${CONFIG.PROMPT_COUNT} diverse image prompts inspired by the following blog article. Each prompt should capture different aspects, concepts, or themes from the article while using varied visual styles and the specified color palette.${coverModeNote}

## Blog Article Content:

${articleContent}

---`;

    if (customInstructions) {
        userMessage += `

## Custom Instructions (IMPORTANT - Follow these carefully):

${customInstructions}

---`;
    }

    if (hasReferenceImage) {
        userMessage += `

## Reference Image Note:

A reference image has been provided. Each prompt should include the instruction: "Use the same visual style as the reference image." This ensures consistency with the provided reference.

---`;
    }

    userMessage += `

Remember to:
1. Generate exactly ${CONFIG.PROMPT_COUNT} prompts
2. Use all visual styles from the list
3. Incorporate the brand colors
4. Make each prompt unique and detailed
5. Draw inspiration from the article content${customInstructions ? "\n6. Follow the custom instructions provided above" : ""}${hasReferenceImage ? "\n" + (customInstructions ? "7" : "6") + ". Reference the style from the provided reference image in each prompt" : ""}`;

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
