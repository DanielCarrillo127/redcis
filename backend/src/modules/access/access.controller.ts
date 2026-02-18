import { Request, Response } from 'express';
import { z } from 'zod';
import { accessService } from './access.service';
import { AuthenticatedRequest } from '../../shared/types';
import * as respond from '../../shared/utils/response';

const grantSchema = z.object({
  centerWallet: z.string().length(56),
  permission: z.enum(['view', 'add']).default('view'),
  durationSeconds: z.number().int().nonnegative().default(0),
});

const revokeSchema = z.object({
  centerWallet: z.string().length(56),
});

const checkAccessSchema = z.object({
  patientWallet: z.string().length(56),
  centerWallet: z.string().length(56),
});

export class AccessController {
  /**
   * POST /api/access/grant
   * El paciente autenticado otorga acceso a un centro de salud.
   */
  async grantAccess(req: Request, res: Response): Promise<void> {
    try {
      const { sub: patientWallet } = (req as AuthenticatedRequest).user!;
      const result = grantSchema.safeParse(req.body);
      if (!result.success) {
        respond.badRequest(res, result.error.errors.map((e) => e.message).join(', '));
        return;
      }

      const grant = await accessService.grantAccess({
        patientWallet,
        ...result.data,
      });

      respond.created(res, grant, 'Acceso otorgado exitosamente');
    } catch (error) {
      if (error instanceof Error) {
        respond.conflict(res, error.message);
      } else {
        respond.serverError(res, error);
      }
    }
  }

  /**
   * POST /api/access/revoke
   * El paciente autenticado revoca el acceso a un centro de salud.
   */
  async revokeAccess(req: Request, res: Response): Promise<void> {
    try {
      const { sub: patientWallet } = (req as AuthenticatedRequest).user!;
      const result = revokeSchema.safeParse(req.body);
      if (!result.success) {
        respond.badRequest(res, result.error.errors.map((e) => e.message).join(', '));
        return;
      }

      const grant = await accessService.revokeAccess({
        patientWallet,
        centerWallet: result.data.centerWallet,
      });

      respond.ok(res, grant, 'Acceso revocado exitosamente');
    } catch (error) {
      if (error instanceof Error) {
        respond.badRequest(res, error.message);
      } else {
        respond.serverError(res, error);
      }
    }
  }

  /**
   * GET /api/access/my-grants
   * El paciente ve todos los permisos que ha otorgado.
   */
  async getMyGrants(req: Request, res: Response): Promise<void> {
    try {
      const { sub: patientWallet } = (req as AuthenticatedRequest).user!;
      const grants = await accessService.getPatientGrants(patientWallet);
      respond.ok(res, grants);
    } catch (error) {
      respond.serverError(res, error);
    }
  }

  /**
   * GET /api/access/my-patients
   * El centro de salud ve todos los pacientes que le han dado acceso.
   */
  async getMyPatients(req: Request, res: Response): Promise<void> {
    try {
      const { sub: centerWallet } = (req as AuthenticatedRequest).user!;
      const grants = await accessService.getCenterGrants(centerWallet);
      respond.ok(res, grants);
    } catch (error) {
      respond.serverError(res, error);
    }
  }

  /**
   * GET /api/access/check?patientWallet=...&centerWallet=...
   * Verifica si un centro tiene acceso activo a un paciente.
   */
  async checkAccess(req: Request, res: Response): Promise<void> {
    try {
      const result = checkAccessSchema.safeParse(req.query);
      if (!result.success) {
        respond.badRequest(res, 'Se requieren patientWallet y centerWallet.');
        return;
      }

      const { patientWallet, centerWallet } = result.data;
      const hasAccess = await accessService.hasAccess(patientWallet, centerWallet);
      respond.ok(res, { hasAccess, patientWallet, centerWallet });
    } catch (error) {
      respond.serverError(res, error);
    }
  }

  /**
   * GET /api/access/grant/:centerWallet
   * El paciente autenticado consulta el detalle de un permiso específico.
   */
  async getGrant(req: Request, res: Response): Promise<void> {
    try {
      const { sub: patientWallet } = (req as AuthenticatedRequest).user!;
      const { centerWallet } = req.params;

      const grant = await accessService.getGrant(patientWallet, centerWallet);
      if (!grant) {
        respond.notFound(res, 'No existe permiso para este par paciente-centro');
        return;
      }
      respond.ok(res, grant);
    } catch (error) {
      respond.serverError(res, error);
    }
  }
}

export const accessController = new AccessController();
