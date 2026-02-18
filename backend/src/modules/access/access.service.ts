/**
 * AccessService — Gestión de permisos de acceso
 *
 * Espeja la lógica del contrato AccessControl de Soroban en la base de datos.
 * La base de datos actúa como índice off-chain para consultas rápidas.
 * La fuente de verdad definitiva es el contrato on-chain.
 */

import { AccessGrantModel, IAccessGrant } from '../../shared/schemas/access-grant.schema';
import { UserModel } from '../../shared/schemas/user.schema';

export interface GrantAccessDto {
  patientWallet: string;
  centerWallet: string;
  permission?: 'view' | 'add';
  durationSeconds?: number; // 0 = sin expiración
}

export interface RevokeAccessDto {
  patientWallet: string;
  centerWallet: string;
}

export class AccessService {
  /**
   * Verifica que el acceso de un centro a un paciente está activo.
   */
  async hasAccess(patientWallet: string, centerWallet: string): Promise<boolean> {
    const grant = await AccessGrantModel.findOne({
      patientWallet,
      centerWallet,
      active: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ],
    });
    return !!grant;
  }

  /**
   * Otorga acceso a un centro de salud para ver el historial de un paciente.
   *
   * Validaciones:
   * - El paciente debe existir y ser individuo.
   * - El centro debe existir y ser health_center.
   * - No debe haber un grant activo para este par.
   */
  async grantAccess(dto: GrantAccessDto): Promise<IAccessGrant> {
    const patient = await UserModel.findOne({
      wallet: dto.patientWallet,
      role: 'individual',
      active: true,
    });
    if (!patient) throw new Error('Paciente no encontrado o no registrado.');

    const center = await UserModel.findOne({
      wallet: dto.centerWallet,
      role: 'health_center',
      active: true,
    });
    if (!center) throw new Error('Centro de salud no encontrado o no registrado.');

    // Verificar permiso existente
    const existingGrant = await AccessGrantModel.findOne({
      patientWallet: dto.patientWallet,
      centerWallet: dto.centerWallet,
    });

    const now = new Date();

    if (existingGrant) {
      // Si estaba activo y no expiró, es conflicto
      if (existingGrant.active) {
        const isExpired = existingGrant.expiresAt && existingGrant.expiresAt < now;
        if (!isExpired) {
          throw new Error('Ya existe un permiso activo para este par paciente-centro.');
        }
      }
      // Reusar y actualizar el documento (re-grant)
      existingGrant.active = true;
      existingGrant.permission = dto.permission || 'view';
      existingGrant.grantedAt = now;
      existingGrant.expiresAt =
        dto.durationSeconds && dto.durationSeconds > 0
          ? new Date(now.getTime() + dto.durationSeconds * 1000)
          : null;
      existingGrant.stellarGrantTxHash = undefined;
      existingGrant.stellarRevokeTxHash = undefined;
      return existingGrant.save();
    }

    // Crear nuevo grant
    return AccessGrantModel.create({
      patientWallet: dto.patientWallet,
      patientId: patient._id,
      centerWallet: dto.centerWallet,
      centerId: center._id,
      centerName: center.name,
      permission: dto.permission || 'view',
      grantedAt: now,
      expiresAt:
        dto.durationSeconds && dto.durationSeconds > 0
          ? new Date(now.getTime() + dto.durationSeconds * 1000)
          : null,
      active: true,
    });
  }

  /**
   * Revoca el acceso de un centro de salud.
   * Solo el paciente (o admin) puede revocar.
   */
  async revokeAccess(dto: RevokeAccessDto): Promise<IAccessGrant> {
    const grant = await AccessGrantModel.findOne({
      patientWallet: dto.patientWallet,
      centerWallet: dto.centerWallet,
      active: true,
    });

    if (!grant) {
      throw new Error('No existe un permiso activo para revocar.');
    }

    grant.active = false;
    return grant.save();
  }

  /**
   * Lista todos los permisos activos de un paciente.
   */
  async getPatientGrants(patientWallet: string): Promise<IAccessGrant[]> {
    return AccessGrantModel.find({
      patientWallet,
    })
      .sort({ grantedAt: -1 })
      .lean() as Promise<IAccessGrant[]>;
  }

  /**
   * Lista todos los accesos activos que tiene un centro de salud.
   */
  async getCenterGrants(centerWallet: string): Promise<IAccessGrant[]> {
    return AccessGrantModel.find({
      centerWallet,
      active: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ],
    })
      .sort({ grantedAt: -1 })
      .lean() as Promise<IAccessGrant[]>;
  }

  /**
   * Obtiene el detalle de un permiso específico.
   */
  async getGrant(
    patientWallet: string,
    centerWallet: string
  ): Promise<IAccessGrant | null> {
    return AccessGrantModel.findOne({
      patientWallet,
      centerWallet,
    }).lean() as Promise<IAccessGrant | null>;
  }

  /**
   * Actualiza el tx hash de Stellar en un grant (al sincronizar on-chain).
   */
  async updateGrantTxHash(
    patientWallet: string,
    centerWallet: string,
    txHash: string,
    type: 'grant' | 'revoke'
  ): Promise<void> {
    const update =
      type === 'grant'
        ? { stellarGrantTxHash: txHash }
        : { stellarRevokeTxHash: txHash };

    await AccessGrantModel.findOneAndUpdate(
      { patientWallet, centerWallet },
      { $set: update }
    );
  }
}

export const accessService = new AccessService();
