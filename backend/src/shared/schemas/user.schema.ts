import { Schema, model, Document } from 'mongoose';
import { UserRole } from '../types';

/**
 * UserDocument — representa a cualquier usuario registrado en el sistema.
 *
 * El campo `wallet` es la llave primaria de identidad (public key Stellar).
 * El campo `dniHash` (SHA256 del DNI + salt) nunca se expone en las respuestas API.
 * El salt se guarda para que el backend pueda verificar/resolver DNI en búsquedas.
 */
export interface IUser extends Document {
  /** Stellar public key (G...) — identificador único inmutable */
  wallet: string;
  /** Rol dentro del sistema */
  role: UserRole;
  /** Hash del DNI (solo para individuos): SHA256(DNI + salt) */
  dniHash?: string;
  /** Salt usado para el hash del DNI (guardado de forma segura) */
  dniSalt?: string;
  /** Nombre del individuo o del centro de salud */
  name: string;
  /** Email de contacto (opcional) */
  email?: string;
  /** ——— Campos exclusivos de HealthCenter ——— */
  /** NIT / identificador fiscal */
  nit?: string;
  /** País de operación */
  country?: string;
  /** Indica si el usuario está activo */
  active: boolean;
  /** Contract ID del IdentityRegistry (referencia) */
  onChainId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    wallet: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      enum: ['individual', 'health_center', 'admin'],
    },
    dniHash: {
      type: String,
      index: true,
      sparse: true,
    },
    dniSalt: {
      type: String,
      select: false, // Nunca se devuelve en queries por defecto
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
    },
    nit: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
      uppercase: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    onChainId: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.dniSalt; // garantía adicional: nunca sale en JSON
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

// Índice compuesto para búsqueda de HC por país + nombre
UserSchema.index({ role: 1, country: 1 });

export const UserModel = model<IUser>('User', UserSchema);
