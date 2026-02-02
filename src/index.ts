import { generatePrompts } from "./agents/promptGenerationAgent.js";
import { generateAllImages, setReferenceImage } from "./agents/imageGenerationAgent.js";
import {
    readMarkdownFile,
    ensureOutputDir,
    savePromptsToFile,
    readCustomInstructions,
    findReferenceImage,
} from "./utils/fileHelpers.js";
import { logInfo, logError, logSummary, logSuccess } from "./utils/logger.js";
import { CONFIG } from "./config/index.js";

async function main(): Promise<void> {
    const mdFilePath = process.argv[2];

    if (!mdFilePath) {
        console.error("Usage: npx tsx src/index.ts <path-to-markdown-file>");
        console.error("");
        console.error("Example:");
        console.error("  npx tsx src/index.ts ./my-blog-article.md");
        process.exit(1);
    }

    console.log("");
    console.log("=".repeat(50));
    console.log("  MD-TO-IMAGES: Agentic Image Generation Pipeline");
    console.log("=".repeat(50));
    console.log("");

    try {
        // Step 1: Read the markdown file
        logInfo(`Reading markdown file: ${mdFilePath}`);
        const articleContent = await readMarkdownFile(mdFilePath);
        logSuccess(`Loaded article (${articleContent.length} characters)`);

        // Step 2: Read custom instructions (if available)
        const customInstructions = await readCustomInstructions();
        if (customInstructions) {
            logSuccess(`Loaded custom instructions from ${CONFIG.INSTRUCTIONS_FILE}`);
            logInfo(`Instructions: "${customInstructions.substring(0, 100)}${customInstructions.length > 100 ? "..." : ""}"`);
        } else {
            logInfo(`No custom instructions found (create ${CONFIG.INSTRUCTIONS_FILE} to add custom instructions)`);
        }

        // Step 3: Find reference image (if available)
        const referenceImage = await findReferenceImage();
        if (referenceImage) {
            logSuccess(`Found reference image: ${referenceImage.filename}`);
            setReferenceImage(referenceImage);
        } else {
            logInfo(`No reference image found (add an image to ${CONFIG.REFERENCE_IMAGE_DIR}/ for style reference)`);
        }

        // Step 4: Show configuration
        if (CONFIG.COVER_IMAGE_MODE) {
            logSuccess("Cover image mode: ENABLED (images will be suitable for blog headers)");
        }
        logInfo(`Generating ${CONFIG.PROMPT_COUNT} images`);

        // Step 5: Ensure output directory exists
        await ensureOutputDir();
        logInfo(`Output directory: ${CONFIG.OUTPUT_DIR}`);

        // Step 6: Generate prompts using Agent 1 (GPT-5.2-Pro)
        console.log("");
        logInfo("Phase 1: Generating image prompts...");
        const prompts = await generatePrompts({
            articleContent,
            customInstructions,
            hasReferenceImage: !!referenceImage,
        });
        logSuccess(`Generated ${prompts.length} image prompts`);

        // Save prompts to file for reference
        const promptsFilePath = await savePromptsToFile(prompts);
        logInfo(`Prompts saved to: ${promptsFilePath}`);

        // Step 7: Generate images using Agent 2 (gpt-image-1.5)
        console.log("");
        logInfo("Phase 2: Generating images...");
        if (referenceImage) {
            logInfo(`Using reference image for style transfer: ${referenceImage.filename}`);
        }
        const results = await generateAllImages(prompts);

        // Step 8: Calculate and display summary
        const successful = results.filter((r) => r.success);
        const failed = results.filter((r) => !r.success);

        logSummary(prompts.length, successful.length, failed.length);

        // Log failed images if any
        if (failed.length > 0) {
            console.log("\nFailed images:");
            failed.forEach((f) => {
                console.log(`  - Image ${f.id}: ${f.error}`);
            });
        }

        // Final status
        if (failed.length === 0) {
            logSuccess("All images generated successfully!");
        } else if (successful.length > 0) {
            logInfo(`Pipeline completed with ${failed.length} failures. Check output directory for generated images.`);
        } else {
            logError(new Error("No images were generated"), "Pipeline failed");
            process.exit(1);
        }
    } catch (error) {
        logError(error, "Pipeline failed");
        process.exit(1);
    }
}

main();
