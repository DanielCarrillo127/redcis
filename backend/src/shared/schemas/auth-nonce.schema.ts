import { Schema, model, Document } from 'mongoose';

/**
 * AuthNonceDocument — nonce de un solo uso para el flujo de autenticación Web3.
 *
 * Cada vez que un usuario solicita autenticación, se crea un nonce asociado
 * a su wallet. El nonce expira automáticamente (TTL index de MongoDB).
 * Una vez usado, se elimina para prevenir replay attacks.
 */
export interface IAuthNonce extends Document {
  wallet: string;
  nonce: string;
  message: string;
  expiresAt: Date;
  used: boolean;
}

const AuthNonceSchema = new Schema<IAuthNonce>(
  {
    wallet: { type: String, required: true, index: true },
    nonce: { type: String, required: true, unique: true },
    message: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// TTL index: MongoDB elimina el documento automáticamente cuando expira
AuthNonceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AuthNonceModel = model<IAuthNonce>('AuthNonce', AuthNonceSchema);
