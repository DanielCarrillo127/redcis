// User Types — aligned with backend roles
export type UserRole = 'individual' | 'health_center' | 'admin';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  wallet: string; // Stellar public key (G...)
  email?: string;
  // Individual-specific
  dniHash?: string;
  // Health center-specific
  nit?: string;
  country?: string;
  // New user flag from auth/verify response
  isNewUser?: boolean;
}

// Auth state stored in localStorage
export interface AuthSession {
  token: string;
  user: User;
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
  previousHash?: string;
  patientId: string;
  healthCenterId: string;
  healthCenterName: string;
  eventType: EventType;
  date: string;
  description: string;
  details?: Record<string, unknown>;
  document?: {
    name: string;
    url: string;
    mimeType: string;
  };
  verified: boolean;
  stellarTxHash?: string;
  timestamp: number;
  createdBy: string;
}

// Access Control Types
export interface AccessPermission {
  id: string;
  patientId: string;
  patientName?: string;
  patientEmail?: string;
  patientDni?: string;
  healthCenterId: string;
  healthCenterWallet: string;
  healthCenterName: string;
  permission: 'view' | 'add';
  grantedAt: string;
  expiresAt?: string;
  active: boolean;
}

// Blockchain Simulator Types
export interface BlockchainState {
  events: ClinicalEvent[];
  permissions: AccessPermission[];
  lastHash: string;
}

// Utility: format wallet address as G...XXXXX...XXXXX
export function formatWallet(wallet: string): string {
  if (!wallet || wallet.length <= 10) return wallet;
  return `${wallet.slice(0, 5)}...${wallet.slice(-5)}`;
}
