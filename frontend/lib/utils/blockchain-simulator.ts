import { ClinicalEvent, AccessPermission, EventType } from '@/lib/types';
import { generateEventHash } from './hash';

const STORAGE_KEY = 'healthcare_blockchain';

interface StoredBlockchainState {
  events: ClinicalEvent[];
  permissions: AccessPermission[];
}

/**
 * Get all stored blockchain events
 */
export function getStoredEvents(): ClinicalEvent[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    const data: StoredBlockchainState = JSON.parse(stored);
    return data.events || [];
  } catch {
    return [];
  }
}

/**
 * Get all stored permissions
 */
export function getStoredPermissions(): AccessPermission[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    const data: StoredBlockchainState = JSON.parse(stored);
    return data.permissions || [];
  } catch {
    return [];
  }
}

/**
 * Save events and permissions to localStorage
 */
function saveBlockchainState(
  events: ClinicalEvent[],
  permissions: AccessPermission[]
) {
  if (typeof window === 'undefined') return;
  const state: StoredBlockchainState = { events, permissions };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Create a new clinical event on the blockchain
 */
export async function createEvent(
  patientId: string,
  healthCenterId: string,
  healthCenterName: string,
  eventType: EventType,
  date: string,
  description: string,
  createdBy: string,
  details?: Record<string, any>
): Promise<ClinicalEvent> {
  const events = getStoredEvents();
  const lastEvent = events.length > 0 ? events[events.length - 1] : null;
  const previousHash = lastEvent?.hash || '0';

  const hash = await generateEventHash(
    patientId,
    healthCenterId,
    eventType,
    date,
    description,
    previousHash
  );

  const newEvent: ClinicalEvent = {
    id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    hash,
    previousHash: previousHash !== '0' ? previousHash : undefined,
    patientId,
    healthCenterId,
    healthCenterName,
    eventType,
    date,
    description,
    details,
    verified: true, // All events in MVP are verified
    timestamp: Date.now(),
    createdBy,
  };

  const permissions = getStoredPermissions();
  const updatedEvents = [...events, newEvent];
  saveBlockchainState(updatedEvents, permissions);

  return newEvent;
}

/**
 * Get all events for a specific patient
 */
export function getPatientEvents(patientId: string): ClinicalEvent[] {
  const events = getStoredEvents();
  return events.filter((event) => event.patientId === patientId);
}

/**
 * Get events that a health center can access
 */
export function getAccessibleEvents(
  patientId: string,
  healthCenterId: string
): ClinicalEvent[] {
  const permissions = getStoredPermissions();
  const hasAccess = permissions.some(
    (p) =>
      p.patientId === patientId &&
      p.healthCenterId === healthCenterId &&
      p.permission === 'view' &&
      p.active &&
      (!p.expiresAt || new Date(p.expiresAt) > new Date())
  );

  if (!hasAccess) return [];

  return getPatientEvents(patientId);
}

/**
 * Grant access permission from patient to health center
 */
export function grantAccess(
  patientId: string,
  healthCenterId: string,
  healthCenterName: string,
  permission: 'view' | 'add' = 'view',
  expiresAt?: Date
): AccessPermission {
  const permissions = getStoredPermissions();
  const events = getStoredEvents();

  // Check if permission already exists
  const existingIndex = permissions.findIndex(
    (p) => p.patientId === patientId && p.healthCenterId === healthCenterId
  );

  const newPermission: AccessPermission = {
    id: `perm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    patientId,
    healthCenterId,
    healthCenterName,
    permission,
    grantedAt: new Date().toISOString(),
    expiresAt: expiresAt?.toISOString(),
    active: true,
  };

  if (existingIndex >= 0) {
    permissions[existingIndex] = newPermission;
  } else {
    permissions.push(newPermission);
  }

  saveBlockchainState(events, permissions);
  return newPermission;
}

/**
 * Revoke access permission
 */
export function revokeAccess(permissionId: string): void {
  const permissions = getStoredPermissions();
  const events = getStoredEvents();

  const updatedPermissions = permissions.map((p) =>
    p.id === permissionId ? { ...p, active: false } : p
  );

  saveBlockchainState(events, updatedPermissions);
}

/**
 * Get all active permissions for a patient
 */
export function getPatientPermissions(patientId: string): AccessPermission[] {
  const permissions = getStoredPermissions();
  return permissions.filter(
    (p) =>
      p.patientId === patientId &&
      p.active &&
      (!p.expiresAt || new Date(p.expiresAt) > new Date())
  );
}

/**
 * Get all access permissions granted BY a health center
 */
export function getHealthCenterAccess(
  healthCenterId: string
): AccessPermission[] {
  const permissions = getStoredPermissions();
  return permissions.filter(
    (p) =>
      p.healthCenterId === healthCenterId &&
      p.active &&
      (!p.expiresAt || new Date(p.expiresAt) > new Date())
  );
}

/**
 * Search for a patient by document/DNI
 */
export function searchPatientByDocument(document: string): string | null {
  // In MVP, we simulate this by checking demo users and created events
  const events = getStoredEvents();
  const permissions = getStoredPermissions();

  // Try to find in permissions (patients who granted access)
  const foundPermission = permissions.find((p) => p.patientId.includes('patient'));

  if (foundPermission) {
    return foundPermission.patientId;
  }

  // For MVP, just return demo patient if searching for "12345678"
  if (document === '12345678') {
    return 'patient-001';
  }

  return null;
}
