// User Types
export type UserRole = 'patient' | 'healthcenter';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  wallet: string; // Simulated wallet address
  document: string; // DNI/ID document
  email?: string;
}

// Clinical Event Types
export type EventType = 
  | 'consultation'
  | 'diagnosis'
  | 'prescription'
  | 'lab-test'
  | 'imaging'
  | 'procedure'
  | 'vaccination'
  | 'other';

export interface ClinicalEvent {
  id: string;
  hash: string; // SHA-256 hash
  previousHash?: string; // Reference to previous event (blockchain chain)
  patientId: string;
  healthCenterId: string;
  healthCenterName: string;
  eventType: EventType;
  date: string; // ISO date string
  description: string;
  details?: Record<string, any>;
  document?: {
    name: string;
    url: string;
    mimeType: string;
  };
  verified: boolean;
  timestamp: number;
  createdBy: string; // User ID who created
}

// Access Control Types
export interface AccessPermission {
  id: string;
  patientId: string;
  healthCenterId: string;
  healthCenterName: string;
  permission: 'view' | 'add'; // view = read-only, add = can register events
  grantedAt: string; // ISO date string
  expiresAt?: string; // ISO date string
  active: boolean;
}

// Blockchain Simulator Types
export interface BlockchainState {
  events: ClinicalEvent[];
  permissions: AccessPermission[];
  lastHash: string;
}

// Demo Users
export const DEMO_PATIENT: User = {
  id: 'patient-001',
  name: 'Juan Pérez García',
  role: 'patient',
  wallet: '0x1234...5678',
  document: '12345678',
  email: 'juan@example.com',
};

export const DEMO_HEALTH_CENTER: User = {
  id: 'healthcenter-001',
  name: 'Hospital San Carlos',
  role: 'healthcenter',
  wallet: '0xabcd...efgh',
  document: 'HSC-001',
  email: 'info@hospitalsancarlos.com',
};
