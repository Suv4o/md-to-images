# md-to-images

An agentic image generation pipeline that automatically generates a large set of images for blog articles using OpenAI's GPT-5.2-Pro and gpt-image-1.5.5 models.

## Features

- **Automated Prompt Generation**: Uses GPT-5.2-Pro to analyze your blog article and generate 100 diverse, high-quality image prompts
- **Parallel Image Generation**: Generates images concurrently with configurable rate limiting
- **Style Diversity**: Automatically varies visual styles (playful, cyberpunk, minimal, isometric, etc.)
- **Brand Colors**: Incorporates your custom color palette into all generated images
- **Retry Logic**: Handles API rate limits with exponential backoff
- **Progress Tracking**: Real-time progress bar and detailed logging

## Prerequisites

- Node.js v20.0.0 or higher
- OpenAI API key with access to GPT-5.2-Pro and gpt-image-1.5

## Installation

```bash
# Clone or navigate to the project
cd md-to-images

# Install dependencies
npm install

# Set up your API key
cp .env.example .env
# Edit .env and add your OpenAI API key
```

## Usage

```bash
# Basic usage
npx tsx src/index.ts <path-to-markdown-file>

# Example
npx tsx src/index.ts ./my-blog-article.md

# Or use npm scripts
npm start ./my-blog-article.md
```

### Output

The pipeline generates:

- **100 images** in the `./output/` directory with deterministic filenames:
    - `image_001_playful.png`
    - `image_002_cyberpunk.png`
    - `image_003_minimal.png`
    - etc.

- **prompts.json** - A JSON file containing all generated prompts for reference

## Architecture

### Agent 1: Prompt Generation Agent

- **Model**: GPT-5.2-Pro
- **Purpose**: Analyzes the blog article and generates 100 unique image prompts
- **Output**: Structured JSON array with prompt text and style metadata

### Agent 2: Image Generation Agent

- **Model**: gpt-image-1.5
- **Purpose**: Generates images from prompts with parallel execution
- **Features**: Rate limiting, retry logic, base64 decoding, file saving

## Configuration

Edit `src/config/index.ts` to customize:

```typescript
export const CONFIG = {
    CONCURRENCY_LIMIT: 5, // Parallel image generation limit
    MAX_RETRIES: 3, // Retry attempts for failed requests
    RETRY_DELAY_MS: 2000, // Base delay between retries
    IMAGE_MODEL: "gpt-image-1.5", // Image generation model
    TEXT_MODEL: "gpt-5.2-pro", // Text/prompt generation model
    IMAGE_SIZE: "1024x1024", // Image dimensions
    IMAGE_QUALITY: "medium", // low | medium | high | auto
    OUTPUT_FORMAT: "png", // png | jpeg | webp
    OUTPUT_DIR: "./output", // Output directory
    PROMPT_COUNT: 100, // Number of prompts to generate
};
```

### Color Palette

The following brand colors are incorporated into generated images:

| Color            | Hex       |
| ---------------- | --------- |
| Primary          | `#ee5f53` |
| Primary Light    | `#f1918b` |
| Code Inline Blue | `#295a92` |
| Secondary        | `#173353` |
| Secondary Light  | `#37506e` |
| Green Light      | `#00dd82` |
| Green Blue       | `#bfd9db` |
| Green            | `#40979d` |
| Beige            | `#d8d7c1` |
| Beige Light      | `#efe8df` |
| Beige Gray       | `#9b9b9b` |
| Gray             | `#6d6e71` |
| Gray Secondary   | `#74869b` |

### Visual Styles

Prompts are distributed across these visual styles:

- Playful
- Fun
- Minimal
- Illustrative
- Hand-drawn
- Technical diagram
- Cyberpunk
- Flat design
- Isometric
- Abstract
- Editorial
- Dark / Moody
- Light / Pastel

## Project Structure

```
md-to-images/
├── src/
│   ├── index.ts                      # CLI entry point
│   ├── agents/
│   │   ├── promptGenerationAgent.ts  # GPT-5.2-Pro prompt generation
│   │   └── imageGenerationAgent.ts   # gpt-image-1.5 image generation
│   ├── config/
│   │   └── index.ts                  # Configuration constants
│   ├── types/
│   │   └── index.ts                  # TypeScript interfaces
│   └── utils/
│       ├── fileHelpers.ts            # File I/O operations
│       ├── logger.ts                 # Progress logging
│       └── rateLimiter.ts            # Concurrency & retry logic
├── output/                           # Generated images (gitignored)
├── package.json
├── tsconfig.json
└── .env.example
```

## Environment Variables

| Variable         | Description         |
| ---------------- | ------------------- |
| `OPENAI_API_KEY` | Your OpenAI API key |

## Error Handling

- **Rate Limits**: Automatically retries with exponential backoff
- **Failed Images**: Logged and skipped; pipeline continues with remaining prompts
- **Network Errors**: Retried up to 3 times (configurable)

## Example Output

```
==================================================
  MD-TO-IMAGES: Agentic Image Generation Pipeline
==================================================

[INFO] Reading markdown file: ./my-blog-article.md
[SUCCESS] Loaded article (2847 characters)
[INFO] Output directory: ./output

[INFO] Phase 1: Generating image prompts...
[INFO] Starting prompt generation with GPT-5.2-Pro...
[SUCCESS] Generated 100 image prompts
[INFO] Prompts saved to: ./output/prompts.json

[INFO] Phase 2: Generating images...
[INFO] Starting image generation for 100 prompts...
[INFO] Concurrency limit: 5
[====================] 100/100 (100%) - Complete!

==================================================
Pipeline Summary
==================================================
Total prompts:      100
Successful images:  98
Failed images:      2
Success rate:       98%
==================================================

[INFO] Pipeline completed with 2 failures. Check output directory for generated images.
```

## License

MIT
