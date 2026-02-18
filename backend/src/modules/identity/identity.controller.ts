import { Request, Response } from 'express';
import { z } from 'zod';
import { identityService } from './identity.service';
import { AuthenticatedRequest } from '../../shared/types';
import * as respond from '../../shared/utils/response';

const registerIndividualSchema = z.object({
  name: z.string().min(2).max(120),
  dni: z.string().min(5).max(20),
  email: z.string().email().optional(),
});

const registerHealthCenterSchema = z.object({
  wallet: z.string().length(56),
  name: z.string().min(2).max(200),
  nit: z.string().min(5).max(30),
  country: z.string().length(2),
  email: z.string().email().optional(),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  email: z.string().email().optional(),
});

export class IdentityController {
  /**
   * POST /api/identity/individual/register
   * Registra el individuo autenticado como paciente.
   */
  async registerIndividual(req: Request, res: Response): Promise<void> {
    try {
      const { sub: wallet } = (req as AuthenticatedRequest).user!;
      const result = registerIndividualSchema.safeParse(req.body);
      if (!result.success) {
        respond.badRequest(res, result.error.errors.map((e) => e.message).join(', '));
        return;
      }

      const user = await identityService.registerIndividual({
        ...result.data,
        wallet,
      });

      respond.created(res, user, 'Individuo registrado exitosamente');
    } catch (error) {
      if (error instanceof Error) {
        respond.conflict(res, error.message);
      } else {
        respond.serverError(res, error);
      }
    }
  }

  /**
   * POST /api/identity/health-center/register
   * Registra un centro de salud (solo admin).
   */
  async registerHealthCenter(req: Request, res: Response): Promise<void> {
    try {
      const result = registerHealthCenterSchema.safeParse(req.body);
      if (!result.success) {
        respond.badRequest(res, result.error.errors.map((e) => e.message).join(', '));
        return;
      }

      const healthCenter = await identityService.registerHealthCenter(result.data);
      respond.created(res, healthCenter, 'Centro de salud registrado exitosamente');
    } catch (error) {
      if (error instanceof Error) {
        respond.conflict(res, error.message);
      } else {
        respond.serverError(res, error);
      }
    }
  }

  /**
   * GET /api/identity/search?dni=...
   * Busca un paciente por DNI (solo health centers).
   */
  async searchByDni(req: Request, res: Response): Promise<void> {
    try {
      const { dni } = req.query as { dni?: string };
      if (!dni || dni.trim().length < 5) {
        respond.badRequest(res, 'Parámetro dni inválido (mínimo 5 caracteres)');
        return;
      }

      const patient = await identityService.resolvePatientByDni(dni.trim());
      if (!patient) {
        respond.notFound(res, 'Paciente no encontrado con ese DNI');
        return;
      }

      // No retornar dniHash ni dniSalt
      const { dniHash: _dniHash, dniSalt: _dniSalt, ...safePatient } = patient as any;
      respond.ok(res, safePatient);
    } catch (error) {
      respond.serverError(res, error);
    }
  }

  /**
   * GET /api/identity/profile
   * Retorna el perfil completo del usuario autenticado.
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const { sub: wallet } = (req as AuthenticatedRequest).user!;
      const user = await identityService.getUserByWallet(wallet);
      if (!user) {
        respond.notFound(res, 'Usuario no encontrado');
        return;
      }
      respond.ok(res, user);
    } catch (error) {
      respond.serverError(res, error);
    }
  }

  /**
   * PUT /api/identity/profile
   * Actualiza el perfil del usuario autenticado.
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const { sub: wallet } = (req as AuthenticatedRequest).user!;
      const result = updateProfileSchema.safeParse(req.body);
      if (!result.success) {
        respond.badRequest(res, result.error.errors.map((e) => e.message).join(', '));
        return;
      }

      const user = await identityService.updateProfile(wallet, result.data);
      respond.ok(res, user, 'Perfil actualizado');
    } catch (error) {
      respond.serverError(res, error);
    }
  }

  /**
   * GET /api/identity/health-centers
   * Lista todos los centros de salud activos.
   */
  async listHealthCenters(_req: Request, res: Response): Promise<void> {
    try {
      const centers = await identityService.listHealthCenters();
      respond.ok(res, centers);
    } catch (error) {
      respond.serverError(res, error);
    }
  }

  /**
   * GET /api/identity/user/:wallet
   * Obtiene datos públicos de un usuario por su wallet.
   */
  async getUserByWallet(req: Request, res: Response): Promise<void> {
    try {
      const { wallet } = req.params;
      const user = await identityService.getUserByWallet(wallet);
      if (!user) {
        respond.notFound(res, 'Usuario no encontrado');
        return;
      }
      respond.ok(res, user);
    } catch (error) {
      respond.serverError(res, error);
    }
  }
}

export const identityController = new IdentityController();
