import { Schema, model, Document, Types } from 'mongoose';
import { RecordType, RecordSource } from '../types';

/**
 * ClinicalRecordDocument — evento clínico registrado en el sistema.
 *
 * El documento real (PDF, imagen) se almacena en disco o servicio externo.
 * Solo se guarda el hash SHA256 para verificabilidad, más los metadatos.
 * El campo `onChainRecordId` referencia el ID asignado por el contrato Soroban.
 */
export interface IClinicalRecord extends Document {
  /** Wallet del paciente dueño del registro */
  patientWallet: string;
  /** Referencia al User document del paciente */
  patientId: Types.ObjectId;
  /** Wallet del emisor (centro de salud o paciente) */
  issuerWallet: string;
  /** Referencia al User document del emisor */
  issuerId: Types.ObjectId;
  /** Nombre del centro de salud (desnormalizado para display rápido) */
  healthCenterName: string;
  /** Tipo de evento clínico */
  recordType: RecordType;
  /** Origen del registro */
  source: RecordSource;
  /** Descripción breve del evento */
  description: string;
  /** Fecha clínica del evento (no necesariamente la de registro) */
  eventDate: Date;
  /** SHA256 del documento (inmutabilidad y verificabilidad) */
  documentHash: string;
  /** Ruta del archivo almacenado off-chain (local o URL externa) */
  documentPath?: string;
  /** Nombre original del archivo */
  documentName?: string;
  /** MIME type del archivo */
  documentMimeType?: string;
  /** Detalles adicionales (json libre) */
  details?: Record<string, unknown>;
  /** ID del registro en el contrato Soroban (se asigna al registrar on-chain) */
  onChainRecordId?: number;
  /** Hash de la tx de Stellar donde fue registrado */
  stellarTxHash?: string;
  /** Ledger sequence de Stellar */
  ledgerSequence?: number;
  /** ¿Ya fue registrado on-chain? */
  isOnChain: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ClinicalRecordSchema = new Schema<IClinicalRecord>(
  {
    patientWallet: { type: String, required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    issuerWallet: { type: String, required: true },
    issuerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    healthCenterName: { type: String, required: true },
    recordType: {
      type: String,
      required: true,
      enum: [
        'lab_result',
        'diagnosis',
        'prescription',
        'procedure',
        'imaging_report',
        'vaccination',
        'progress_note',
        'self_reported',
        'other',
      ],
    },
    source: {
      type: String,
      required: true,
      enum: ['health_center', 'patient'],
    },
    description: { type: String, required: true, trim: true },
    eventDate: { type: Date, required: true },
    documentHash: { type: String, required: true },
    documentPath: { type: String },
    documentName: { type: String },
    documentMimeType: { type: String },
    details: { type: Schema.Types.Mixed },
    onChainRecordId: { type: Number },
    stellarTxHash: { type: String },
    ledgerSequence: { type: Number },
    isOnChain: { type: Boolean, default: false },
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

// Índices para consultas frecuentes
ClinicalRecordSchema.index({ patientWallet: 1, eventDate: -1 });
ClinicalRecordSchema.index({ issuerId: 1 });
ClinicalRecordSchema.index({ recordType: 1 });
ClinicalRecordSchema.index({ isOnChain: 1 });

export const ClinicalRecordModel = model<IClinicalRecord>(
  'ClinicalRecord',
  ClinicalRecordSchema
);
