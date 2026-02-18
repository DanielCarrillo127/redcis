import { Request } from 'express';

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface JwtPayload {
  /** Stellar public key (G...) */
  sub: string;
  /** Issued at */
  iat: number;
  /** Expires at */
  exp: number;
  /** Role resolved from DB */
  role?: UserRole;
  /** Internal MongoDB user _id */
  userId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

// ---------------------------------------------------------------------------
// Users / Roles
// ---------------------------------------------------------------------------

export type UserRole = 'individual' | 'health_center' | 'admin';

// ---------------------------------------------------------------------------
// Clinical Events
// ---------------------------------------------------------------------------

export type RecordType =
  | 'lab_result'
  | 'diagnosis'
  | 'prescription'
  | 'procedure'
  | 'imaging_report'
  | 'vaccination'
  | 'progress_note'
  | 'self_reported'
  | 'other';

export type RecordSource = 'health_center' | 'patient';

// ---------------------------------------------------------------------------
// API Response helpers
// ---------------------------------------------------------------------------

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}
