import apiClient from './axios-client';

export interface Stats {
  totalPatients: number;
  totalHealthCenters: number;
  totalRecords: number;
  onChainRecords: number;
  totalActiveGrants: number;
}

export interface StatsResponse {
  data: Stats;
}

/**
 * Obtener estadísticas del sistema (solo admins)
 * Endpoint: GET /api/explorer/stats
 */
export const getStats = async (): Promise<Stats> => {
  const response = await apiClient.get<StatsResponse>('/api/explorer/stats');
  return response.data.data;
};
