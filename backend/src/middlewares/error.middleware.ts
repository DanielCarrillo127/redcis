import { Request, Response, NextFunction } from 'express';

/**
 * Global error handler middleware.
 * Debe registrarse DESPUÉS de todas las rutas.
 */
export function errorMiddleware(
  err: Error & { status?: number; code?: string },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[Error]', err.message, err.stack);

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      success: false,
      error: `El archivo supera el tamaño máximo permitido.`,
    });
    return;
  }

  const status = err.status || 500;
  const message =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'Error interno del servidor'
      : err.message;

  res.status(status).json({ success: false, error: message });
}

/**
 * 404 handler — debe registrarse antes del errorMiddleware pero después de las rutas.
 */
export function notFoundMiddleware(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
}
