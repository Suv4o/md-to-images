export function logProgress(current: number, total: number, message: string): void {
  const percentage = Math.round((current / total) * 100);
  const progressBar = createProgressBar(percentage);
  process.stdout.write(`\r${progressBar} ${current}/${total} (${percentage}%) - ${message}`);
}

export function logProgressComplete(total: number): void {
  process.stdout.write(`\r${createProgressBar(100)} ${total}/${total} (100%) - Complete!\n`);
}

function createProgressBar(percentage: number): string {
  const filled = Math.round(percentage / 5);
  const empty = 20 - filled;
  return `[${'='.repeat(filled)}${' '.repeat(empty)}]`;
}

export function logError(error: unknown, context: string): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`\n[ERROR] ${context}: ${errorMessage}`);
}

export function logSuccess(message: string): void {
  console.log(`[SUCCESS] ${message}`);
}

export function logInfo(message: string): void {
  console.log(`[INFO] ${message}`);
}

export function logWarning(message: string): void {
  console.warn(`[WARNING] ${message}`);
}

export function logSummary(
  total: number,
  successful: number,
  failed: number
): void {
  console.log('\n' + '='.repeat(50));
  console.log('Pipeline Summary');
  console.log('='.repeat(50));
  console.log(`Total prompts:      ${total}`);
  console.log(`Successful images:  ${successful}`);
  console.log(`Failed images:      ${failed}`);
  console.log(`Success rate:       ${Math.round((successful / total) * 100)}%`);
  console.log('='.repeat(50));
}
