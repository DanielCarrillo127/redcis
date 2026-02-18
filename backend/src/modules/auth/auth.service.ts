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
import { Keypair } from '@stellar/stellar-sdk';
import { env } from '../../config/env';
import { AuthNonceModel } from '../../shared/schemas/auth-nonce.schema';
import { UserModel } from '../../shared/schemas/user.schema';
import { JwtPayload } from '../../shared/types';

export interface NonceResponse {
  nonce: string;
  message: string;
  expiresAt: Date;
}

export interface AuthTokenResponse {
  token: string;
  user: {
    wallet: string;
    role: string;
    name: string;
    userId: string;
  };
  isNewUser: boolean;
}

export class AuthService {
  /**
   * Genera un nonce único para que el usuario firme con su wallet Freighter.
   * Invalida cualquier nonce previo para esta wallet.
   */
  async generateNonce(wallet: string): Promise<NonceResponse> {
    // Validar que es una public key de Stellar válida
    try {
      Keypair.fromPublicKey(wallet);
    } catch {
      throw new Error('Wallet inválida: debe ser una Stellar public key (G...)');
    }

    // Invalidar nonces previos para esta wallet
    await AuthNonceModel.deleteMany({ wallet });

    const nonce = crypto.randomBytes(32).toString('hex');
    const message = `Autenticación en redcis\nWallet: ${wallet}\nNonce: ${nonce}\nFecha: ${new Date().toISOString()}`;
    const expiresAt = new Date(
      Date.now() + env.auth.nonceTtlSeconds * 1000
    );

    await AuthNonceModel.create({
      wallet,
      nonce,
      message,
      expiresAt,
    });

    return { nonce, message, expiresAt };
  }

  /**
   * Verifica la firma del mensaje y emite un JWT si es válida.
   */
  async verifySignatureAndIssueToken(
    wallet: string,
    signature: string,
    message: string
  ): Promise<AuthTokenResponse> {
    // 1. Buscar el nonce en MongoDB
    const storedNonce = await AuthNonceModel.findOne({
      wallet,
      used: false,
    });

    if (!storedNonce) {
      throw new Error('Nonce no encontrado o expirado. Solicita uno nuevo.');
    }

    // 2. Verificar que el mensaje coincide
    if (storedNonce.message !== message) {
      throw new Error('El mensaje no coincide con el nonce almacenado.');
    }

    // 3. Verificar expiración
    if (new Date() > storedNonce.expiresAt) {
      await storedNonce.deleteOne();
      throw new Error('El nonce ha expirado. Solicita uno nuevo.');
    }

    // 4. Verificar firma Ed25519 con Stellar SDK
    let isValidSignature = false;
    try {
      const keypair = Keypair.fromPublicKey(wallet);
      const messageBuffer = Buffer.from(message, 'utf-8');
      const signatureBuffer = Buffer.from(signature, 'base64');
      isValidSignature = keypair.verify(messageBuffer, signatureBuffer);
    } catch {
      throw new Error('Error al verificar la firma criptográfica.');
    }

    if (!isValidSignature) {
      throw new Error('Firma inválida. La firma no corresponde a esta wallet.');
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
