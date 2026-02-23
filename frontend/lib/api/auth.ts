import apiClient from './axios-client';
import { User, UserRole } from '@/lib/types';

export interface AuthResponse {
  data: {
    token: string;
    user: {
      userId: string;
      name?: string;
      role: string;
      wallet: string;
      email?: string;
    };
    isNewUser: boolean;
  };
}

export interface MeResponse {
  success: boolean;
  data: {
    _id: string;
    wallet: string;
    role: string;
    name?: string;
    email?: string;
    dniHash?: string;
    nit?: string;
    country?: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

export interface RefreshResponse {
  data: {
    token: string;
  };
}

export interface NonceResponse {
  data: {
    transaction: string;
  };
}

/**
 * Obtener nonce para autenticación con Freighter
 */
export const getNonce = async (wallet: string): Promise<NonceResponse> => {
  const response = await apiClient.get<NonceResponse>(`/api/auth/nonce?wallet=${wallet}`);
  return response.data;
};

/**
 * Verificar firma y obtener token JWT
 */
export const verifySignature = async (
  wallet: string,
  signedTransaction: string
): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/api/auth/verify', {
    wallet,
    signedTransaction,
  });
  return response.data;
};

/**
 * Obtener información del usuario autenticado
 * Endpoint: GET /api/auth/me
 */
export const getMe = async (): Promise<User> => {
  const response = await apiClient.get<MeResponse>('/api/auth/me');
  const backendUser = response.data.data;

  return {
    id: backendUser._id,
    name: backendUser.name || '',
    role: backendUser.role as UserRole,
    wallet: backendUser.wallet,
    email: backendUser.email,
    nit: backendUser.nit,
    country: backendUser.country,
    dniHash: backendUser.dniHash,
    isNewUser: false,
  };
};

/**
 * Refrescar token de autenticación
 * Endpoint: POST /api/auth/refresh
 */
export const refreshToken = async (): Promise<string> => {
  const response = await apiClient.post<RefreshResponse>('/api/auth/refresh');
  return response.data.data.token;
};
