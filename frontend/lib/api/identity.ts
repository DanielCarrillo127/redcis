import apiClient from './axios-client';

export interface RegisterIndividualRequest {
  wallet: string;
  name: string;
  dni: string;
  email?: string;
}

export interface RegisterIndividualResponse {
  data: {
    userId: string;
    name: string;
    email?: string;
  };
}

export interface RegisterHealthCenterRequest {
  wallet: string;
  name: string;
  nit: string;
  country: string;
  email?: string;
}

export interface RegisterHealthCenterResponse {
  data: {
    wallet: string;
    name: string;
    nit: string;
    country: string;
    email?: string;
    active: boolean;
  };
}

export interface HealthCenter {
  wallet: string;
  name: string;
  nit: string;
  country: string;
  email?: string;
  active: boolean;
}

export interface ListHealthCentersResponse {
  data: HealthCenter[];
}

export interface FoundPatient {
  _id: string;
  wallet: string;
  role: string;
  dni:string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
  email: string;
}

/**
 * Registrar perfil de paciente individual
 * Endpoint: POST /api/identity/individual/register
 */
export const registerIndividual = async (
  data: RegisterIndividualRequest
): Promise<RegisterIndividualResponse> => {
  const response = await apiClient.post<RegisterIndividualResponse>(
    '/api/identity/individual/register',
    data
  );
  return response.data;
};

/**
 * Registrar centro de salud (solo admins)
 * Endpoint: POST /api/identity/health-center/register
 */
export const registerHealthCenter = async (
  data: RegisterHealthCenterRequest
): Promise<RegisterHealthCenterResponse> => {
  const response = await apiClient.post<RegisterHealthCenterResponse>(
    '/api/identity/health-center/register',
    data
  );
  return response.data;
};

/**
 * Listar centros de salud (solo admins)
 * Endpoint: GET /api/identity/health-centers
 */
export const listHealthCenters = async (): Promise<HealthCenter[]> => {
  const response = await apiClient.get<ListHealthCentersResponse>('/api/identity/health-centers');
  return response.data.data ?? [];
};

export interface PublicUserProfile {
  wallet: string;
  role: string;
  name?: string;
  nit?: string;
  country?: string;
  email?: string;
}

/**
 * Obtener datos públicos de un usuario por su wallet
 * Endpoint: GET /api/identity/user/:wallet
 */
export const getUserByWallet = async (wallet: string): Promise<PublicUserProfile> => {
  const response = await apiClient.get<{ success: boolean; data: PublicUserProfile }>(
    `/api/identity/user/${wallet}`
  );
  return response.data.data;
};

export interface HealthCenterSearchResult {
  wallet: string;
  name: string;
  nit: string;
  country: string;
  email?: string;
}

/**
 * Buscar centros de salud por nombre o NIT (parcial, case-insensitive)
 * Endpoint: GET /api/identity/health-centers/search?q=...
 */
export const searchHealthCenters = async (
  query: string
): Promise<HealthCenterSearchResult[]> => {
  if (query.trim().length < 2) return [];
  const response = await apiClient.get<{
    success: boolean;
    data: HealthCenterSearchResult[];
  }>(`/api/identity/health-centers/search?q=${encodeURIComponent(query.trim())}`);
  return response.data.data;
};

/**
 * Actualizar perfil del usuario autenticado (name, email)
 * Endpoint: PUT /api/identity/profile
 */
export const updateProfile = async (
  data: { name?: string; email?: string }
): Promise<PublicUserProfile> => {
  const response = await apiClient.put<{ success: boolean; data: PublicUserProfile }>(
    '/api/identity/profile',
    data
  );
  return response.data.data;
};

/**
 * Buscar paciente por DNI (solo health centers)
 * Endpoint: GET /api/identity/search?dni=...
 */
export const searchPatientByDni = async (
  dni: string
): Promise<FoundPatient | null> => {
  try {
    const response = await apiClient.get<{
      success: boolean;
      data: FoundPatient;
    }>(`/api/identity/search?dni=${encodeURIComponent(dni)}`);
    return response.data.data;
  } catch (error: any) {
    if (error.response?.status === 404) return null;
    throw error;
  }
};
