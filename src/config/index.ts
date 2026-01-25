import type { ImageSize, ImageQuality, OutputFormat } from "../types/index.js";

export const CONFIG = {
    CONCURRENCY_LIMIT: 5,
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 2000,
    IMAGE_MODEL: "gpt-image-1.5",
    TEXT_MODEL: "gpt-5.2-pro",
    IMAGE_SIZE: "1536x1024" as ImageSize,
    IMAGE_QUALITY: "medium" as ImageQuality,
    OUTPUT_FORMAT: "png" as OutputFormat,
    OUTPUT_DIR: "./output",
    PROMPT_COUNT: 100,
} as const;

export const COLOR_PALETTE = {
    primary: "#ee5f53",
    primaryLight: "#f1918b",
    codeInlineBlue: "#295a92",
    secondary: "#173353",
    secondaryLight: "#37506e",
    greenLight: "#00dd82",
    greenBlue: "#bfd9db",
    green: "#40979d",
    beige: "#d8d7c1",
    beigeLight: "#efe8df",
    beigeGray: "#9b9b9b",
    gray: "#6d6e71",
    graySecondary: "#74869b",
} as const;

export const VISUAL_STYLES = [
    "Playful",
    "Fun",
    "Minimal",
    "Illustrative",
    "Hand-drawn",
    "Technical diagram",
    "Cyberpunk",
    "Flat design",
    "Isometric",
    "Abstract",
    "Editorial",
    "Dark / Moody",
    "Light / Pastel",
] as const;

export type VisualStyle = (typeof VISUAL_STYLES)[number];
