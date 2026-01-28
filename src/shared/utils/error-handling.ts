export interface ErrorResponse {
  success: false;
  error: string;
  canceled?: boolean;
}

export interface SuccessResponse<T = unknown> {
  success: true;
  data?: T;
}

export type IpcResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

export function createErrorResponse(error: unknown, canceled?: boolean): ErrorResponse {
  const message = error instanceof Error ? error.message : String(error);
  return {
    success: false,
    error: message,
    ...(canceled !== undefined && { canceled }),
  };
}

export function createSuccessResponse<T>(data?: T): SuccessResponse<T> {
  return {
    success: true,
    ...(data !== undefined && { data }),
  };
}
