/**
 * IdentityService — Gestión de identidades (individuos y centros de salud)
 *
 * Responsabilidades:
 * - Registrar individuos (vinculando wallet + hash DNI en MongoDB)
 * - Registrar centros de salud
 * - Buscar pacientes por DNI hash
 * - Consultar perfil y rol de usuarios
 */

import crypto from 'crypto';
import { UserModel, IUser } from '../../shared/schemas/user.schema';
import { UserRole } from '../../shared/types';
import { sorobanService } from '../soroban/soroban.service';

export interface RegisterIndividualDto {
  wallet: string;
  name: string;
  dni: string;         // DNI en texto claro — el servicio calcula el hash
  email?: string;
}

export interface RegisterHealthCenterDto {
  wallet: string;
  name: string;
  nit: string;
  country: string;
  email?: string;
}

export interface UpdateProfileDto {
  name?: string;
  email?: string;
}

export class IdentityService {
  /**
   * Calcula el hash del DNI con un salt aleatorio.
   * salt es retornado para guardarlo junto al hash.
   */
  private hashDni(dni: string, salt?: string): { hash: string; salt: string } {
    const resolvedSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto
      .createHash('sha256')
      .update(`${dni}:${resolvedSalt}`)
      .digest('hex');
    return { hash, salt: resolvedSalt };
  }

  /**
   * Registra un individuo en el sistema.
   * Si ya existe (por wallet), actualiza sus datos.
   */
  async registerIndividual(dto: RegisterIndividualDto): Promise<IUser> {
    const existing = await UserModel.findOne({ wallet: dto.wallet });

    if (existing && existing.role !== 'individual') {
      throw new Error('Esta wallet ya está registrada con un rol diferente.');
    }

    // Verificar que el DNI no esté en uso por otra wallet
    const { hash: dniHash, salt: dniSalt } = this.hashDni(dto.dni);

    const dniConflict = await UserModel.findOne({
      dniHash,
      wallet: { $ne: dto.wallet },
    });
    if (dniConflict) {
      throw new Error('El DNI ingresado ya está vinculado a otra wallet.');
    }

    if (existing) {
      // Actualizar datos si ya existe
      existing.name = dto.name;
      existing.email = dto.email;
      existing.dni = dto.dni;
      existing.dniHash = dniHash;
      existing.dniSalt = dniSalt;
      existing.active = true;
      return existing.save();
    }

    return UserModel.create({
      wallet: dto.wallet,
      role: 'individual',
      name: dto.name,
      email: dto.email,
      dni: dto.dni,
      dniHash,
      dniSalt,
      active: true,
    });
  }

  /**
   * Completa el registro de un nuevo usuario (viene del flujo de auth).
   * Solo puede llamarse si el usuario aún tiene el nombre por defecto.
   */
  async completeIndividualRegistration(
    wallet: string,
    dto: Omit<RegisterIndividualDto, 'wallet'>
  ): Promise<IUser> {
    return this.registerIndividual({ ...dto, wallet });
  }

  /**
   * Registra un centro de salud.
   * Solo puede hacerlo el admin del sistema.
   * También registra el HC en el contrato identity-registry.
   */
  async registerHealthCenter(dto: RegisterHealthCenterDto): Promise<IUser> {
    const existing = await UserModel.findOne({ wallet: dto.wallet });
    if (existing) {
      throw new Error('Esta wallet ya está registrada en el sistema.');
    }

    const nitConflict = await UserModel.findOne({ nit: dto.nit, role: 'health_center' });
    if (nitConflict) {
      throw new Error('El NIT ingresado ya está registrado.');
    }

    // Crear en MongoDB primero
    const user = await UserModel.create({
      wallet: dto.wallet,
      role: 'health_center',
      name: dto.name,
      nit: dto.nit,
      country: dto.country.toUpperCase(),
      email: dto.email,
      active: true,
    });

    // Registrar en el contrato Soroban
    try {
      const txHash = await sorobanService.registerHealthCenter({
        wallet: dto.wallet,
        name: dto.name,
        nit: dto.nit,
        country: dto.country.toUpperCase(),
      });

      // Guardar el hash de la transacción para referencia
      user.onChainId = txHash;
      await user.save();

      console.log(`Health Center registered on-chain. TX: ${txHash}`);
    } catch (error) {
      console.error('Failed to register HC on-chain:', error);
      // No fallar el registro en MongoDB si el contrato falla
      // En producción, esto debería manejarse con un job queue para reintento
    }

    return user;
  }

  /**
   * Resuelve la wallet de un paciente a partir de su DNI en texto claro.
   * Busca en la DB verificando el hash con el salt almacenado.
   */
  async resolvePatientByDni(dni: string): Promise<IUser | null> {
    // Necesitamos cargar el salt para verificar — incluimos dniSalt
    const individuals = await UserModel.find({ role: 'individual', active: true })
      .select('+dniSalt')
      .lean();

    for (const user of individuals) {
      if (!user.dniHash || !user.dniSalt) continue;
      const { hash } = this.hashDni(dni, user.dniSalt);
      if (hash === user.dniHash) {
        return user as unknown as IUser;
      }
    }

    return null;
  }

  /**
   * Obtiene el usuario por su wallet.
   */
  async getUserByWallet(wallet: string): Promise<IUser | null> {
    return UserModel.findOne({ wallet, active: true }).lean() as Promise<IUser | null>;
  }

  /**
   * Obtiene el perfil público del paciente para centros de salud autorizados.
   */
  async getPatientProfileWithDni(
    wallet: string
  ): Promise<{ wallet: string; name: string; email?: string; dni?: string } | null> {
    const user = await UserModel.findOne({ wallet, role: 'individual', active: true })
      .lean<{ wallet: string; name: string; email?: string; dni?: string }>();

    if (!user) return null;

    return { wallet: user.wallet, name: user.name, email: user.email, dni: user.dni };
  }

  /**
   * Obtiene el rol de un usuario por su wallet.
   */
  async getUserRole(wallet: string): Promise<UserRole | null> {
    const user = await UserModel.findOne({ wallet }, 'role').lean();
    return user?.role || null;
  }

  /**
   * Verifica si una wallet está registrada como HealthCenter.
   */
  async isHealthCenter(wallet: string): Promise<boolean> {
    const user = await UserModel.findOne(
      { wallet, role: 'health_center', active: true },
      '_id'
    ).lean();
    return !!user;
  }

  /**
   * Lista todos los centros de salud activos.
   */
  async listHealthCenters(): Promise<IUser[]> {
    const centers = await UserModel.find(
      { role: 'health_center', active: true },
      '-dniHash -dniSalt'
    ).lean();
    return centers as unknown as IUser[];
  }

  /**
   * Busca centros de salud activos por nombre o NIT (búsqueda parcial, case-insensitive).
   * Máximo 10 resultados.
   */
  async searchHealthCenters(query: string): Promise<IUser[]> {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');

    const centers = await UserModel.find(
      {
        role: 'health_center',
        active: true,
        $or: [{ name: regex }, { nit: regex }],
      },
      '-dniHash -dniSalt'
    )
      .limit(10)
      .lean();

    return centers as unknown as IUser[];
  }

  /**
   * Actualiza el perfil de un usuario.
   */
  async updateProfile(wallet: string, dto: UpdateProfileDto): Promise<IUser> {
    const user = await UserModel.findOneAndUpdate(
      { wallet, active: true },
      { $set: dto },
      { new: true }
    ).lean();

    if (!user) throw new Error('Usuario no encontrado.');
    return user as unknown as IUser;
  }
}

export const identityService = new IdentityService();
