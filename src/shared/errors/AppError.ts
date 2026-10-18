export type AppErrorCode =
  | 'validation'
  | 'permission_denied'
  | 'unauthenticated'
  | 'persistence'
  | 'network'
  | 'conflict'
  | 'unexpected';

const defaultMessages: Record<AppErrorCode, string> = {
  validation: 'Revisá los datos ingresados.',
  permission_denied: 'No tenés permiso para realizar esta acción.',
  unauthenticated: 'Tu sesión no está disponible. Volvé a ingresar.',
  persistence: 'No se pudieron guardar los cambios.',
  network: 'No se pudo conectar con el servicio.',
  conflict: 'El registro cambió mientras lo estabas editando.',
  unexpected: 'Ocurrió un problema inesperado.',
};

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message = defaultMessages[code],
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const toAppError = (error: unknown, fallback: AppErrorCode = 'unexpected') =>
  error instanceof AppError ? error : new AppError(fallback, defaultMessages[fallback], error);

