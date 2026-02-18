/**
 * JWT Auth Middleware
 *
 * Verifica que el token Bearer del header Authorization sea válido.
 * Adjunta el payload al objeto `req.user` para uso en controllers.
 *
 * Uso:
 *   router.get('/protected', authMiddleware, (req, res) => { ... });
 *
 * El token debe incluirse en el header:
 *   Authorization: Bearer <token>
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthenticatedRequest, JwtPayload } from '../shared/types';
import * as respond from '../shared/utils/response';

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    respond.unauthorized(res, 'Token de autenticación requerido');
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, env.jwt.secret) as JwtPayload;
    (req as AuthenticatedRequest).user = payload;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      respond.unauthorized(res, 'Token expirado. Por favor vuelve a iniciar sesión.');
    } else if (error instanceof jwt.JsonWebTokenError) {
      respond.unauthorized(res, 'Token inválido.');
    } else {
      respond.serverError(res, error);
    }
  }
}

/**
 * Middleware de autorización por rol.
 * Se usa DESPUÉS de authMiddleware.
 *
 * Uso:
 *   router.post('/admin-only', authMiddleware, requireRole('admin'), handler)
 *   router.post('/hc-only', authMiddleware, requireRole('health_center'), handler)
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      respond.unauthorized(res);
      return;
    }
    if (!user.role || !roles.includes(user.role)) {
      respond.forbidden(
        res,
        `Acceso denegado. Roles requeridos: ${roles.join(', ')}`
      );
      return;
    }
    next();
  };
}
