import { Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import { recordsService } from './records.service';
import { AuthenticatedRequest } from '../../shared/types';
import * as respond from '../../shared/utils/response';
import { env } from '../../config/env';

// Configuración de multer para subida de documentos
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, env.upload.uploadDir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: env.upload.maxFileSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/dicom',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo PDF e imágenes.'));
    }
  },
});

const createRecordSchema = z.object({
  patientWallet: z.string().length(56).optional(),
  recordType: z.enum([
    'lab_result',
    'diagnosis',
    'prescription',
    'procedure',
    'imaging_report',
    'vaccination',
    'progress_note',
    'self_reported',
    'other',
  ]),
  source: z.enum(['health_center', 'patient']),
  description: z.string().min(5).max(500),
  eventDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  details: z.record(z.unknown()).optional(),
});

const getRecordsQuerySchema = z.object({
  patientWallet: z.string().optional(),
  recordType: z.string().optional(),
  source: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export class RecordsController {
  /**
   * POST /api/records
   * Crea un nuevo registro clínico.
   * Si se adjunta un archivo, se guarda en disco y se calcula su hash.
   */
  async createRecord(req: Request, res: Response): Promise<void> {
    try {
      const { sub: issuerWallet, role } = (req as AuthenticatedRequest).user!;
      const result = createRecordSchema.safeParse(req.body);
      if (!result.success) {
        respond.badRequest(res, result.error.errors.map((e) => e.message).join(', '));
        return;
      }

      const data = result.data;

      // El paciente crea registros para sí mismo; el HC especifica el paciente
      const patientWallet =
        role === 'individual'
          ? issuerWallet
          : data.patientWallet;

      if (!patientWallet) {
        respond.badRequest(res, 'patientWallet es requerido cuando el emisor es un centro de salud.');
        return;
      }

      const file = req.file;

      const record = await recordsService.createRecord({
        patientWallet,
        issuerWallet,
        recordType: data.recordType,
        source: data.source,
        description: data.description,
        eventDate: data.eventDate,
        details: data.details,
        filePath: file?.path,
        fileName: file?.originalname,
        fileMimeType: file?.mimetype,
      });

      respond.created(res, record, 'Registro clínico creado exitosamente');
    } catch (error) {
      if (error instanceof Error) {
        respond.badRequest(res, error.message);
      } else {
        respond.serverError(res, error);
      }
    }
  }

  /**
   * GET /api/records/my
   * Retorna el historial del paciente autenticado.
   */
  async getMyRecords(req: Request, res: Response): Promise<void> {
    try {
      const { sub: patientWallet } = (req as AuthenticatedRequest).user!;
      const query = getRecordsQuerySchema.safeParse(req.query);

      const filter = query.success ? query.data : {};
      const { records, total } = await recordsService.getPatientRecords(
        patientWallet,
        {
          recordType: filter.recordType as any,
          source: filter.source as any,
          from: filter.from ? new Date(filter.from) : undefined,
          to: filter.to ? new Date(filter.to) : undefined,
          page: filter.page,
          limit: filter.limit,
        }
      );

      res.status(200).json({
        success: true,
        data: records,
        pagination: {
          total,
          page: filter.page || 1,
          limit: filter.limit || 20,
          pages: Math.ceil(total / (filter.limit || 20)),
        },
      });
    } catch (error) {
      respond.serverError(res, error);
    }
  }

  /**
   * GET /api/records/patient/:wallet
   * Retorna el historial de un paciente (solo si el HC tiene acceso).
   */
  async getPatientRecords(req: Request, res: Response): Promise<void> {
    try {
      const { sub: centerWallet } = (req as AuthenticatedRequest).user!;
      const { wallet: patientWallet } = req.params;
      const query = getRecordsQuerySchema.safeParse(req.query);
      const filter = query.success ? query.data : {};

      const { records, total } = await recordsService.getAccessibleRecords(
        patientWallet,
        centerWallet,
        {
          recordType: filter.recordType as any,
          source: filter.source as any,
          from: filter.from ? new Date(filter.from) : undefined,
          to: filter.to ? new Date(filter.to) : undefined,
          page: filter.page,
          limit: filter.limit,
        }
      );

      res.status(200).json({
        success: true,
        data: records,
        pagination: {
          total,
          page: filter.page || 1,
          limit: filter.limit || 20,
          pages: Math.ceil(total / (filter.limit || 20)),
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('No tienes acceso')) {
        respond.forbidden(res, error.message);
      } else {
        respond.serverError(res, error);
      }
    }
  }

  /**
   * GET /api/records/:id
   * Retorna un registro específico por ID.
   */
  async getRecordById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const record = await recordsService.getRecordById(id);
      if (!record) {
        respond.notFound(res, 'Registro no encontrado');
        return;
      }
      respond.ok(res, record);
    } catch (error) {
      respond.serverError(res, error);
    }
  }

  /**
   * GET /api/records/my/stats
   * Estadísticas del historial del paciente autenticado.
   */
  async getMyStats(req: Request, res: Response): Promise<void> {
    try {
      const { sub: patientWallet } = (req as AuthenticatedRequest).user!;
      const stats = await recordsService.getPatientStats(patientWallet);
      respond.ok(res, stats);
    } catch (error) {
      respond.serverError(res, error);
    }
  }

  /**
   * POST /api/records/:id/verify
   * Verifica la integridad de un documento subiendo el archivo y comparando el hash.
   */
  async verifyDocument(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const file = req.file;
      if (!file) {
        respond.badRequest(res, 'Se requiere el archivo a verificar.');
        return;
      }

      const isValid = await recordsService.verifyDocument(id, file.path);
      respond.ok(res, { verified: isValid, recordId: id });
    } catch (error) {
      if (error instanceof Error) {
        respond.badRequest(res, error.message);
      } else {
        respond.serverError(res, error);
      }
    }
  }

  /**
   * PATCH /api/records/:id/on-chain
   * Marca un registro como sincronizado on-chain (solo admin/sistema).
   */
  async markOnChain(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { onChainRecordId, stellarTxHash, ledgerSequence } = req.body;

      if (!onChainRecordId) {
        respond.badRequest(res, 'onChainRecordId es requerido.');
        return;
      }

      const record = await recordsService.markAsOnChain(
        id,
        Number(onChainRecordId),
        stellarTxHash,
        ledgerSequence ? Number(ledgerSequence) : undefined
      );

      if (!record) {
        respond.notFound(res, 'Registro no encontrado');
        return;
      }

      respond.ok(res, record, 'Registro marcado como on-chain');
    } catch (error) {
      respond.serverError(res, error);
    }
  }
}

export const recordsController = new RecordsController();
