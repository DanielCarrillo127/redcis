import apiClient from './axios-client';
import { AccessPermission } from '@/lib/types';

export interface GrantAccessParams {
  centerWallet: string;
  permission?: 'view' | 'add';
  durationSeconds?: number; // 0 = sin expiración
}

export interface RevokeAccessParams {
  centerWallet: string;
}

export interface AccessGrantResponse {
  _id: string;
  patientWallet: string;
  patientId: string;
  centerWallet: string;
  centerName: string;
  centerId: string;
  permission: 'view' | 'add';
  grantedAt: string;
  expiresAt?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  onChainGrantId?: number;
  stellarTxHash?: string;
  patient?: {
    wallet: string;
    name: string;
    email?: string;
    dni?: string;
  } | null;
}

export interface CheckAccessResponse {
  success: boolean;
  data: {
    hasAccess: boolean;
    patientWallet: string;
    centerWallet: string;
  };
}

/**
 * Otorgar acceso a un centro de salud
 * Endpoint: POST /api/access/grant
 */
export const grantAccess = async (
  params: GrantAccessParams
): Promise<AccessGrantResponse> => {
  const response = await apiClient.post<{ success: boolean; data: AccessGrantResponse }>(
    '/api/access/grant',
    {
      centerWallet: params.centerWallet,
      permission: params.permission || 'view',
      durationSeconds: params.durationSeconds || 0,
    }
  );

  return response.data.data;
};

/**
 * Revocar acceso a un centro de salud
 * Endpoint: POST /api/access/revoke
 */
export const revokeAccess = async (
  params: RevokeAccessParams
): Promise<AccessGrantResponse> => {
  const response = await apiClient.post<{ success: boolean; data: AccessGrantResponse }>(
    '/api/access/revoke',
    {
      centerWallet: params.centerWallet,
    }
  );

  return response.data.data;
};

/**
 * Obtener todos los permisos otorgados por el paciente autenticado
 * Endpoint: GET /api/access/my-grants
 */
export const getMyGrants = async (): Promise<AccessGrantResponse[]> => {
  const response = await apiClient.get<{ success: boolean; data: AccessGrantResponse[] }>(
    '/api/access/my-grants'
  );

  return response.data.data;
};

/**
 * Obtener todos los pacientes que le han otorgado acceso al centro autenticado
 * Endpoint: GET /api/access/my-patients
 */
export const getMyPatients = async (): Promise<AccessGrantResponse[]> => {
  const response = await apiClient.get<{ success: boolean; data: AccessGrantResponse[] }>(
    '/api/access/my-patients'
  );

  return response.data.data;
};

/**
 * Verificar si un centro tiene acceso a un paciente
 * Endpoint: GET /api/access/check?patientWallet=...&centerWallet=...
 */
export const checkAccess = async (
  patientWallet: string,
  centerWallet: string
): Promise<boolean> => {
  const response = await apiClient.get<CheckAccessResponse>(
    `/api/access/check?patientWallet=${patientWallet}&centerWallet=${centerWallet}`
  );

  return response.data.data.hasAccess;
};

/**
 * Obtener detalle de un permiso específico
 * Endpoint: GET /api/access/grant/:centerWallet
 */
export const getGrant = async (centerWallet: string): Promise<AccessGrantResponse | null> => {
  try {
    const response = await apiClient.get<{ success: boolean; data: AccessGrantResponse }>(
      `/api/access/grant/${centerWallet}`
    );
    return response.data.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

/**
 * Convertir AccessGrantResponse del backend a AccessPermission del frontend
 * (para compatibilidad con componentes existentes)
 */
export const grantToAccessPermission = (
  grant: AccessGrantResponse
): AccessPermission => {
  return {
    id: grant._id,
    patientId: grant.patientWallet,
    patientName: grant.patient?.name,
    patientEmail: grant.patient?.email,
    patientDni: grant.patient?.dni,
    healthCenterId: grant.centerId,
    healthCenterWallet: grant.centerWallet,
    healthCenterName: grant.centerName,
    permission: grant.permission,
    grantedAt: grant.grantedAt,
    expiresAt: grant.expiresAt,
    active: grant.active,
  };
};
