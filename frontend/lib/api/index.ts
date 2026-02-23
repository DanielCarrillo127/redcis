// Export API client
export { default as apiClient } from './axios-client';

// Export auth services
export * from './auth';

// Export identity services
export * from './identity';

// Export explorer services
export * from './explorer';

// Export records services (StatsResponse aliased to avoid conflict with explorer)
export {
  createRecord,
  getMyRecords,
  getPatientRecords,
  getRecordById,
  getMyStats,
  recordToClinicalEvent,
} from './records';
export type {
  CreateRecordParams,
  GetRecordsParams,
  RecordResponse,
  PatientProfile,
  RecordsListResponse,
  StatsResponse as RecordsStatsResponse,
} from './records';

// Export access control services
export * from './access';
