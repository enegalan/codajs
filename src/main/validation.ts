/**
 * Validation utilities for IPC input
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validates script execution parameters
 */
export function validateScriptExecution(
  script: unknown,
  options: unknown
): { script: string; options: { runtime: 'node' | 'deno' | 'bun'; timeout: number } } {
  if (typeof script !== 'string') {
    throw new ValidationError('Script must be a string');
  }

  if (script.length === 0) {
    throw new ValidationError('Script cannot be empty');
  }

  if (script.length > 1000000) {
    throw new ValidationError('Script exceeds maximum length (1MB)');
  }

  if (options === null || typeof options !== 'object') {
    throw new ValidationError('Options must be an object');
  }

  const opts = options as Record<string, unknown>;

  const runtimeInput = typeof opts.runtime === 'string' ? opts.runtime : 'node';
  const validRuntimes = ['node', 'deno', 'bun'] as const;
  if (!validRuntimes.includes(runtimeInput as (typeof validRuntimes)[number])) {
    throw new ValidationError(
      `Invalid runtime: ${runtimeInput}. Must be one of: ${validRuntimes.join(', ')}`
    );
  }
  const runtime = runtimeInput as 'node' | 'deno' | 'bun';

  const timeout = typeof opts.timeout === 'number' ? opts.timeout : 5000;
  if (timeout < 100 || timeout > 300000) {
    throw new ValidationError('Timeout must be between 100ms and 300000ms');
  }

  return {
    script,
    options: { runtime, timeout },
  };
}

/**
 * Validates a file path
 */
export function validateFilePath(filePath: unknown): string {
  if (typeof filePath !== 'string') {
    throw new ValidationError('File path must be a string');
  }

  if (filePath.length === 0) {
    throw new ValidationError('File path cannot be empty');
  }

  // Check for path traversal attempts
  if (filePath.includes('..')) {
    throw new ValidationError('Path traversal not allowed');
  }

  return filePath;
}

/**
 * Validates file content for saving
 */
export function validateFileContent(content: unknown): string {
  if (typeof content !== 'string') {
    throw new ValidationError('File content must be a string');
  }

  if (content.length > 10000000) {
    throw new ValidationError('File content exceeds maximum size (10MB)');
  }

  return content;
}

/**
 * Sanitizes a filename
 */
export function sanitizeFileName(name: unknown): string {
  if (typeof name !== 'string') {
    return 'untitled';
  }

  return name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50) || 'untitled';
}
