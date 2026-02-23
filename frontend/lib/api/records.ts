import apiClient from './axios-client';
import { ClinicalEvent, EventType } from '@/lib/types';

export interface CreateRecordParams {
  patientWallet?: string; // Solo para health centers
  recordType: string;
  source: 'health_center' | 'patient';
  description: string;
  eventDate: string;
  details?: Record<string, unknown>;
  file?: File;
}

export interface GetRecordsParams {
  patientWallet?: string;
  recordType?: string;
  source?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface RecordResponse {
  _id: string;
  patientWallet: string;
  issuerWallet: string;
  healthCenterName?: string;
  /** Nombre legible del emisor (populado en endpoint de detalle) */
  issuerName?: string | null;
  issuerEmail?: string | null;
  /** Nombre legible del paciente (populado en endpoint de detalle) */
  patientName?: string | null;
  patientEmail?: string | null;
  recordType: string;
  source: 'health_center' | 'patient';
  description: string;
  eventDate: string;
  details?: Record<string, unknown>;
  documentHash?: string;
  /** URL autenticada — servida por GET /api/records/:id/document */
  documentUrl?: string;
  documentName?: string;
  documentMimeType?: string;
  onChainRecordId?: number;
  stellarTxHash?: string;
  ledgerSequence?: number;
  isOnChain?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PatientProfile {
  wallet: string;
  name: string;
  email?: string;
  dni?: string;
}

export interface RecordsListResponse {
  success: boolean;
  permission?: 'view' | 'add';
  patient?: PatientProfile;
  data: RecordResponse[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface StatsResponse {
  success: boolean;
  data: {
    totalRecords: number;
    byType: Record<string, number>;
    bySource: Record<string, number>;
    lastRecordDate?: string;
  };
}

/**
 * Crear un nuevo registro clínico
 * Endpoint: POST /api/records
 */
export const createRecord = async (
  params: CreateRecordParams
): Promise<RecordResponse> => {
  const formData = new FormData();

  if (params.patientWallet) {
    formData.append('patientWallet', params.patientWallet);
  }
  formData.append('recordType', params.recordType);
  formData.append('source', params.source);
  formData.append('description', params.description);
  formData.append('eventDate', params.eventDate);

  if (params.details) {
    formData.append('details', JSON.stringify(params.details));
  }

  if (params.file) {
    formData.append('document', params.file);
  }

  const response = await apiClient.post<{ success: boolean; data: RecordResponse }>(
    '/api/records',
    formData
  );

  return response.data.data;
};

/**
 * Obtener mis registros (paciente autenticado)
 * Endpoint: GET /api/records/my
 */
export const getMyRecords = async (
  params?: GetRecordsParams
): Promise<RecordsListResponse> => {
  const queryParams = new URLSearchParams();

  if (params?.recordType) queryParams.append('recordType', params.recordType);
  if (params?.source) queryParams.append('source', params.source);
  if (params?.from) queryParams.append('from', params.from);
  if (params?.to) queryParams.append('to', params.to);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const url = `/api/records/my${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await apiClient.get<RecordsListResponse>(url);

  return response.data;
};

/**
 * Obtener registros de un paciente específico (health center)
 * Endpoint: GET /api/records/patient/:wallet
 */
export const getPatientRecords = async (
  patientWallet: string,
  params?: GetRecordsParams
): Promise<RecordsListResponse> => {
  const queryParams = new URLSearchParams();

  if (params?.recordType) queryParams.append('recordType', params.recordType);
  if (params?.source) queryParams.append('source', params.source);
  if (params?.from) queryParams.append('from', params.from);
  if (params?.to) queryParams.append('to', params.to);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const url = `/api/records/patient/${patientWallet}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await apiClient.get<RecordsListResponse>(url);

  return response.data;
};

/**
 * Obtener un registro por ID
 * Endpoint: GET /api/records/:id
 */
export const getRecordById = async (id: string): Promise<RecordResponse> => {
  const response = await apiClient.get<{ success: boolean; data: RecordResponse }>(
    `/api/records/${id}`
  );
  return response.data.data;
};

/**
 * Obtener estadísticas del historial (paciente autenticado)
 * Endpoint: GET /api/records/my/stats
 */
export const getMyStats = async (): Promise<StatsResponse['data']> => {
  const response = await apiClient.get<StatsResponse>('/api/records/my/stats');
  return response.data.data;
};

/**
 * Obtener la URL autenticada del documento adjunto de un registro.
 * Usa fetch con el token JWT para descargar el archivo y crear un Blob URL.
 * El caller es responsable de llamar URL.revokeObjectURL() cuando ya no lo necesite.
 */
export const getRecordDocumentBlobUrl = async (recordId: string): Promise<string> => {
  const response = await apiClient.get<Blob>(`/api/records/${recordId}/document`, {
    responseType: 'blob',
  });
  return URL.createObjectURL(response.data);
};

/**
 * Convertir RecordResponse del backend a ClinicalEvent del frontend
 * (para compatibilidad con componentes existentes)
 */
export const recordToClinicalEvent = (record: RecordResponse): ClinicalEvent => {
  // Mapear tipos de record a EventType
  const typeMap: Record<string, EventType> = {
    lab_result: 'lab-test',
    diagnosis: 'diagnosis',
    prescription: 'prescription',
    procedure: 'procedure',
    imaging_report: 'imaging',
    vaccination: 'vaccination',
    progress_note: 'consultation',
    self_reported: 'other',
    other: 'other',
  };

  return {
    id: record._id,
    hash: record.documentHash || '',
    patientId: record.patientWallet,
    healthCenterId: record.issuerWallet,
    healthCenterName: record.healthCenterName || '',
    eventType: typeMap[record.recordType] || 'other',
    date: record.eventDate,
    description: record.description,
    details: record.details,
    document: record.documentUrl
      ? {
          name: record.documentName || 'document',
          url: record.documentUrl,
          mimeType: record.documentMimeType || 'application/octet-stream',
        }
      : undefined,
    verified: !!record.onChainRecordId,
    stellarTxHash: record.stellarTxHash,
    timestamp: new Date(record.createdAt).getTime(),
    createdBy: record.issuerWallet,
  };
};
