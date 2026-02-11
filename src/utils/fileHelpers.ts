import { readFile, writeFile, mkdir, access, readdir } from 'node:fs/promises';
import { join, resolve, dirname, extname } from 'node:path';
import { createReadStream } from 'node:fs';
import type { ReadStream } from 'node:fs';
import { CONFIG } from '../config/index.js';

const SUPPORTED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

export async function readMarkdownFile(filePath: string): Promise<string> {
  const absolutePath = resolve(filePath);
  const content = await readFile(absolutePath, 'utf-8');
  return content;
}

export async function saveImage(
  base64Data: string,
  filename: string
): Promise<string> {
  const outputPath = join(CONFIG.OUTPUT_DIR, filename);
  const absolutePath = resolve(outputPath);

  await ensureDirectoryExists(dirname(absolutePath));

  const buffer = Buffer.from(base64Data, 'base64');
  await writeFile(absolutePath, buffer);

  return absolutePath;
}

export async function saveImageFromUrl(
  imageUrl: string,
  filename: string
): Promise<string> {
  const outputPath = join(CONFIG.OUTPUT_DIR, filename);
  const absolutePath = resolve(outputPath);

  await ensureDirectoryExists(dirname(absolutePath));

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await writeFile(absolutePath, buffer);

  return absolutePath;
}

export async function ensureOutputDir(): Promise<void> {
  await ensureDirectoryExists(resolve(CONFIG.OUTPUT_DIR));
}

async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await access(dirPath);
  } catch {
    await mkdir(dirPath, { recursive: true });
  }
}

export async function savePromptsToFile(
  prompts: Array<{ id: number; prompt: string; style: string }>
): Promise<string> {
  const outputPath = join(CONFIG.OUTPUT_DIR, 'prompts.json');
  const absolutePath = resolve(outputPath);

  await ensureDirectoryExists(dirname(absolutePath));

  const content = JSON.stringify(prompts, null, 2);
  await writeFile(absolutePath, content, 'utf-8');

  return absolutePath;
}

export function generateImageFilename(id: number, style: string): string {
  const paddedId = String(id).padStart(3, '0');
  const sanitizedStyle = style
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `image_${paddedId}_${sanitizedStyle}.${CONFIG.OUTPUT_FORMAT}`;
}

export async function readPromptsFromFile(): Promise<
  Array<{ id: number; prompt: string; style: string }>
> {
  const outputPath = join(CONFIG.OUTPUT_DIR, 'prompts.json');
  const absolutePath = resolve(outputPath);
  const content = await readFile(absolutePath, 'utf-8');
  return JSON.parse(content) as Array<{ id: number; prompt: string; style: string }>;
}

export async function readCustomInstructions(): Promise<string | null> {
  try {
    const absolutePath = resolve(CONFIG.INSTRUCTIONS_FILE);
    await access(absolutePath);
    const content = await readFile(absolutePath, 'utf-8');
    const trimmed = content.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

export interface ReferenceImage {
  path: string;
  filename: string;
  stream: () => ReadStream;
}

export async function findReferenceImage(): Promise<ReferenceImage | null> {
  try {
    const refDir = resolve(CONFIG.REFERENCE_IMAGE_DIR);
    await access(refDir);

    const files = await readdir(refDir);
    const imageFile = files.find((file) => {
      const ext = extname(file).toLowerCase();
      return SUPPORTED_IMAGE_EXTENSIONS.includes(ext);
    });

    if (!imageFile) {
      return null;
    }

    const imagePath = join(refDir, imageFile);
    return {
      path: imagePath,
      filename: imageFile,
      stream: () => createReadStream(imagePath),
    };
  } catch {
    return null;
  }
}

export async function readReferenceImageAsBase64(): Promise<string | null> {
  const refImage = await findReferenceImage();
  if (!refImage) {
    return null;
  }

  const buffer = await readFile(refImage.path);
  return buffer.toString('base64');
}
