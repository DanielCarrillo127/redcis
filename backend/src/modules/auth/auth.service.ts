/**
 * AuthService — Flujo de autenticación Web3 con Freighter / Stellar
 *
 * Flujo de autenticación (Nonce/Message signing):
 *
 * 1. Frontend llama GET /auth/nonce?wallet=G...
 *    → Servidor genera nonce aleatorio y crea mensaje para firmar
 *    → Guarda nonce en MongoDB con TTL
 *
 * 2. Frontend usa Freighter `signMessage(message)` para firmar el mensaje
 *    → Freighter produce una firma Ed25519 en base64
 *
 * 3. Frontend llama POST /auth/verify { wallet, signature, message }
 *    → Servidor verifica firma con Keypair.verify() del Stellar SDK
 *    → Elimina nonce (one-time use)
 *    → Crea o actualiza user en MongoDB
 *    → Emite JWT firmado
 *
 * Este patrón es análogo a "Sign-In with Ethereum" pero para Stellar.
 * Para producción con interoperabilidad entre wallets Stellar, considerar SEP-10.
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import {
  Keypair,
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  Transaction
} from '@stellar/stellar-sdk';
import { env } from '../../config/env';
import { AuthNonceModel } from '../../shared/schemas/auth-nonce.schema';
import { UserModel } from '../../shared/schemas/user.schema';
import { JwtPayload } from '../../shared/types';

export interface NonceResponse {
  nonce: string;
  transaction: string; // XDR-encoded transaction
  expiresAt: Date;
}

export interface AuthTokenResponse {
  token: string;
  user: {
    wallet: string;
    role: string;
    name: string;
    userId: string;
    email: string;
  };
  isNewUser: boolean;
}

export class AuthService {
  /**
   * Genera un nonce único y una transacción de autenticación para que el usuario firme.
   * Invalida cualquier nonce previo para esta wallet.
   */
  async generateNonce(wallet: string): Promise<NonceResponse> {
    // Validar que es una public key de Stellar válida
    let userKeypair: Keypair;
    try {
      userKeypair = Keypair.fromPublicKey(wallet);
    } catch {
      throw new Error('Wallet inválida: debe ser una Stellar public key (G...)');
    }

    // Invalidar nonces previos para esta wallet
    await AuthNonceModel.deleteMany({ wallet });

    const nonce = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + env.auth.nonceTtlSeconds * 1000);

    // Crear transacción de autenticación (SEP-10 style)
    // Usa una cuenta temporal del servidor como source
    const serverKeypair = Keypair.random();
    const transaction = new TransactionBuilder(
      {
        accountId: () => serverKeypair.publicKey(),
        sequenceNumber: () => '0',
        incrementSequenceNumber: () => {}
      } as any,
      {
        fee: '100',
        networkPassphrase: Networks.TESTNET,
      }
    )
      .addOperation(
        Operation.manageData({
          name: 'redcis auth',
          value: Buffer.from(nonce, 'utf-8'),
          source: wallet, // El usuario debe firmar esta operación
        })
      )
      .setTimeout(300) // 5 minutos
      .build();

    const txXdr = transaction.toXDR();

    // Guardar nonce y el XDR de la transacción
    await AuthNonceModel.create({
      wallet,
      nonce,
      message: txXdr, // Guardamos el XDR para verificación posterior
      expiresAt,
    });

    return { nonce, transaction: txXdr, expiresAt };
  }

  /**
   * Verifica la transacción firmada y emite un JWT si es válida.
   */
  async verifySignatureAndIssueToken(
    wallet: string,
    signedTransactionXdr: string
  ): Promise<AuthTokenResponse> {
    // 1. Buscar el nonce en MongoDB
    const storedNonce = await AuthNonceModel.findOne({
      wallet,
      used: false,
    });

    if (!storedNonce) {
      throw new Error('Nonce no encontrado o expirado. Solicita uno nuevo.');
    }

    // 2. Verificar expiración
    if (new Date() > storedNonce.expiresAt) {
      await storedNonce.deleteOne();
      throw new Error('El nonce ha expirado. Solicita uno nuevo.');
    }

    // 3. Verificar que la transacción firmada coincide con la original
    let transaction: Transaction;
    try {
      transaction = new Transaction(signedTransactionXdr, Networks.TESTNET);
    } catch {
      throw new Error('Transacción XDR inválida.');
    }

    // 4. Verificar que la transacción está firmada por la wallet correcta
    const userKeypair = Keypair.fromPublicKey(wallet);
    const txHash = transaction.hash();

    // Buscar la firma del usuario en las firmas de la transacción
    let validSignature = false;
    for (const sig of transaction.signatures) {
      try {
        if (userKeypair.verify(txHash, sig.signature())) {
          validSignature = true;
          break;
        }
      } catch {
        // Continuar con la siguiente firma
      }
    }

    if (!validSignature) {
      throw new Error('Firma inválida. La transacción no está firmada por esta wallet.');
    }

    // 5. Marcar nonce como usado y eliminar
    await storedNonce.deleteOne();

    // 6. Buscar o crear usuario en MongoDB
    let user = await UserModel.findOne({ wallet });
    const isNewUser = !user;

    if (!user) {
      // Solo crear como 'individual' si no existe pre-registro.
      // Health Centers y Admins son creados por el admin antes de autenticarse.
      // Si el HC se autentica antes de que el admin lo registre, se crearía
      // erróneamente como 'individual'. El frontend debe informar este caso.
      user = await UserModel.create({
        wallet,
        role: 'individual',
        name: `Usuario ${wallet.slice(0, 8)}...`,
        active: true,
      });
    } else if (!user.active) {
      // Usuario existe pero fue desactivado por el admin
      throw new Error('Cuenta inactiva. Contacta al administrador del sistema.');
    }

    // 7. Emitir JWT
    const payload: Partial<JwtPayload> = {
      sub: wallet,
      role: user.role,
      userId: (user._id as { toString(): string }).toString(),
    };

    const token = jwt.sign(payload, env.jwt.secret, {
      expiresIn: env.jwt.expiresIn,
    } as jwt.SignOptions);

    return {
      token,
      user: {
        wallet: user.wallet,
        role: user.role,
        name: user.name,
        email: user.email || '',
        userId: (user._id as { toString(): string }).toString(),
      },
      isNewUser,
    };
  }

  /**
   * Verifica un JWT y retorna el payload.
   */
  verifyToken(token: string): JwtPayload {
    return jwt.verify(token, env.jwt.secret) as JwtPayload;
  }

  /**
   * Refresca el JWT del usuario (renovar sesión).
   */
  async refreshToken(wallet: string): Promise<{ token: string }> {
    const user = await UserModel.findOne({ wallet, active: true });
    if (!user) {
      throw new Error('Usuario no encontrado o inactivo.');
    }

    const payload: Partial<JwtPayload> = {
      sub: wallet,
      role: user.role,
      userId: (user._id as { toString(): string }).toString(),
    };

    const token = jwt.sign(payload, env.jwt.secret, {
      expiresIn: env.jwt.expiresIn,
    } as jwt.SignOptions);

    return { token };
  }

  /**
   * Retorna el perfil del usuario autenticado.
   */
  async getProfile(wallet: string) {
    const user = await UserModel.findOne({ wallet, active: true }).lean();
    if (!user) throw new Error('Usuario no encontrado.');
    return user;
  }
}

export const authService = new AuthService();
