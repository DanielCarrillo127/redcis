import { Schema, model, Document, Types } from 'mongoose';

/**
 * AccessGrantDocument — permiso de un paciente hacia un centro de salud.
 *
 * Espeja el estado del contrato AccessControl de Soroban.
 * La fuente de verdad es el contrato; este schema es el índice off-chain.
 */
export interface IAccessGrant extends Document {
  /** Wallet del paciente que otorga el permiso */
  patientWallet: string;
  patientId: Types.ObjectId;
  /** Wallet del centro de salud autorizado */
  centerWallet: string;
  centerId: Types.ObjectId;
  /** Nombre del centro (desnormalizado) */
  centerName: string;
  /** Nivel de permiso: view = solo lectura, add = puede registrar eventos */
  permission: 'view' | 'add';
  /** Cuándo fue otorgado */
  grantedAt: Date;
  /** Cuándo expira (null = sin expiración) */
  expiresAt?: Date | null;
  /** Si fue revocado activamente por el paciente */
  active: boolean;
  /** Hash de la tx de Stellar donde se registró el grant */
  stellarGrantTxHash?: string;
  /** Hash de la tx de Stellar donde se registró la revocación */
  stellarRevokeTxHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AccessGrantSchema = new Schema<IAccessGrant>(
  {
    patientWallet: { type: String, required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    centerWallet: { type: String, required: true, index: true },
    centerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    centerName: { type: String, required: true },
    permission: {
      type: String,
      required: true,
      enum: ['view', 'add'],
      default: 'view',
    },
    grantedAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, default: null },
    active: { type: Boolean, default: true, index: true },
    stellarGrantTxHash: { type: String },
    stellarRevokeTxHash: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

// Índice compuesto para la consulta principal: ¿tiene acceso este centro a este paciente?
AccessGrantSchema.index({ patientWallet: 1, centerWallet: 1 }, { unique: true });

export const AccessGrantModel = model<IAccessGrant>(
  'AccessGrant',
  AccessGrantSchema
);
