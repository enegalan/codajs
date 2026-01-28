import { createErrorResponse } from '../../shared/utils/error-handling';

export function handleIpcError(error: unknown, context: string): { success: false; error: string } {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`${context}:`, message);
  return createErrorResponse(error);
}
