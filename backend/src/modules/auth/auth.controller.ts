import { Request, Response } from 'express';
import { z } from 'zod';
import { authService } from './auth.service';
import { AuthenticatedRequest } from '../../shared/types';
import * as respond from '../../shared/utils/response';

const getNonceSchema = z.object({
  wallet: z.string().min(56).max(56),
});

const verifySchema = z.object({
  wallet: z.string().min(56).max(56),
  signature: z.string().min(1),
  message: z.string().min(1),
});

export class AuthController {
  /**
   * GET /auth/nonce?wallet=G...
   * Genera un nonce para que el usuario firme con Freighter.
   */
  async getNonce(req: Request, res: Response): Promise<void> {
    try {
      const result = getNonceSchema.safeParse(req.query);
      if (!result.success) {
        respond.badRequest(
          res,
          'Parámetro wallet inválido. Debe ser una Stellar public key (G...).'
        );
        return;
      }

      const { wallet } = result.data;
      const nonceData = await authService.generateNonce(wallet);

      respond.ok(res, {
        wallet,
        message: nonceData.message,
        expiresAt: nonceData.expiresAt,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Wallet inválida')) {
        respond.badRequest(res, error.message);
      } else {
        respond.serverError(res, error);
      }
    }
  }

  /**
   * POST /auth/verify
   * Body: { wallet, signature (base64), message }
   * Verifica la firma y emite JWT.
   */
  async verify(req: Request, res: Response): Promise<void> {
    try {
      const result = verifySchema.safeParse(req.body);
      if (!result.success) {
        respond.badRequest(res, 'Payload inválido: se requiere wallet, signature y message.');
        return;
      }

      const { wallet, signature, message } = result.data;
      const authResult = await authService.verifySignatureAndIssueToken(
        wallet,
        signature,
        message
      );

      respond.ok(res, authResult, authResult.isNewUser ? 'Cuenta creada exitosamente' : 'Autenticación exitosa');
    } catch (error) {
      if (error instanceof Error) {
        respond.unauthorized(res, error.message);
      } else {
        respond.serverError(res, error);
      }
    }
  }

  /**
   * GET /auth/me
   * Retorna el perfil del usuario autenticado.
   */
  async getMe(req: Request, res: Response): Promise<void> {
    try {
      const { sub: wallet } = (req as AuthenticatedRequest).user!;
      const profile = await authService.getProfile(wallet);
      respond.ok(res, profile);
    } catch (error) {
      respond.serverError(res, error);
    }
  }

  /**
   * POST /auth/refresh
   * Renueva el JWT del usuario autenticado.
   */
  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { sub: wallet } = (req as AuthenticatedRequest).user!;
      const result = await authService.refreshToken(wallet);
      respond.ok(res, result);
    } catch (error) {
      respond.serverError(res, error);
    }
  }
}

export const authController = new AuthController();
