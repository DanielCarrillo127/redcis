import { Response } from 'express';
import { ApiResponse } from '../types';

export const ok = <T>(res: Response, data: T, message?: string): void => {
  const body: ApiResponse<T> = { success: true, data, message };
  res.status(200).json(body);
};

export const created = <T>(res: Response, data: T, message?: string): void => {
  const body: ApiResponse<T> = { success: true, data, message };
  res.status(201).json(body);
};

export const noContent = (res: Response): void => {
  res.status(204).send();
};

export const badRequest = (res: Response, error: string): void => {
  res.status(400).json({ success: false, error });
};

export const unauthorized = (res: Response, error = 'No autorizado'): void => {
  res.status(401).json({ success: false, error });
};

export const forbidden = (res: Response, error = 'Acceso denegado'): void => {
  res.status(403).json({ success: false, error });
};

export const notFound = (res: Response, error = 'Recurso no encontrado'): void => {
  res.status(404).json({ success: false, error });
};

export const conflict = (res: Response, error: string): void => {
  res.status(409).json({ success: false, error });
};

export const serverError = (res: Response, error: unknown): void => {
  const message =
    error instanceof Error ? error.message : 'Error interno del servidor';
  console.error('[Server Error]', error);
  res.status(500).json({ success: false, error: message });
};
