import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { CONFIG } from '../config/index.js';

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
