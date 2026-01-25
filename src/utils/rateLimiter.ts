import { CONFIG } from '../config/index.js';
import { logWarning } from './logger.js';

interface RateLimitError extends Error {
  status?: number;
  code?: string;
}

function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const rateLimitError = error as RateLimitError;
    return (
      rateLimitError.status === 429 ||
      rateLimitError.code === 'rate_limit_exceeded' ||
      error.message.toLowerCase().includes('rate limit')
    );
  }
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = CONFIG.MAX_RETRIES,
  baseDelay: number = CONFIG.RETRY_DELAY_MS
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        break;
      }

      const isRateLimit = isRateLimitError(error);
      const delayMs = isRateLimit
        ? baseDelay * Math.pow(2, attempt) + Math.random() * 1000
        : baseDelay * (attempt + 1);

      if (isRateLimit) {
        logWarning(
          `Rate limit hit. Retrying in ${Math.round(delayMs / 1000)}s (attempt ${attempt + 1}/${maxRetries})`
        );
      } else {
        logWarning(
          `Request failed: ${lastError.message}. Retrying in ${Math.round(delayMs / 1000)}s (attempt ${attempt + 1}/${maxRetries})`
        );
      }

      await delay(delayMs);
    }
  }

  throw lastError ?? new Error('Unknown error during retry');
}

export async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function processNext(): Promise<void> {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      const item = items[index];
      results[index] = await fn(item, index);
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => processNext()
  );

  await Promise.all(workers);

  return results;
}

export class ConcurrencyPool {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(private limit: number) {}

  async acquire(): Promise<void> {
    if (this.running < this.limit) {
      this.running++;
      return;
    }

    await new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
    this.running++;
  }

  release(): void {
    this.running--;
    const next = this.queue.shift();
    if (next) {
      next();
    }
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}
