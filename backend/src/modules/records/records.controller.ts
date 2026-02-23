import { Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { recordsService } from './records.service';
import { sorobanService } from '../soroban/soroban.service';
import { identityService } from '../identity/identity.service';
import { AuthenticatedRequest } from '../../shared/types';
import { IClinicalRecord } from '../../shared/schemas/clinical-record.schema';
import * as respond from '../../shared/utils/response';
import { env } from '../../config/env';

/**
 * Convierte un registro a DTO de respuesta:
 * - Aplana los campos populados (issuerId, patientId) a nombres/emails legibles
 * - Añade documentUrl si tiene archivo almacenado
 * - Convierte Mongoose Document a plain object cuando es necesario
 */
function toRecordDto(record: any) {
  // Convertir Mongoose Document a plain object si aplica
  const r: Record<string, any> = typeof record.toObject === 'function'
    ? record.toObject({ virtuals: false })
    : record;

  const id = r._id?.toString?.() ?? String(r._id);

  // Extraer datos populados del emisor
  const issuerPopulated = r.issuerId && typeof r.issuerId === 'object' && 'name' in r.issuerId
    ? r.issuerId as { _id: any; name: string; email?: string; wallet?: string; role?: string }
    : null;

  // Extraer datos populados del paciente
  const patientPopulated = r.patientId && typeof r.patientId === 'object' && 'name' in r.patientId
    ? r.patientId as { _id: any; name: string; email?: string; wallet?: string }
    : null;

  return {
    ...r,
    _id: id,
    // Aplanar referencias populadas a IDs string
    issuerId: issuerPopulated ? issuerPopulated._id?.toString() : r.issuerId?.toString(),
    patientId: patientPopulated ? patientPopulated._id?.toString() : r.patientId?.toString(),
    // Nombres legibles
    issuerName: issuerPopulated?.name ?? r.healthCenterName ?? null,
    issuerEmail: issuerPopulated?.email ?? null,
    patientName: patientPopulated?.name ?? null,
    patientEmail: patientPopulated?.email ?? null,
    // URL del documento
    documentUrl: r.documentPath ? `/api/records/${id}/document` : undefined,
  };
}

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

      // Multipart fields arrive as strings — parse details JSON if present
      const body = { ...req.body };
      if (typeof body.details === 'string') {
        try {
          body.details = JSON.parse(body.details);
        } catch {
          body.details = undefined;
        }
      }

      const result = createRecordSchema.safeParse(body);
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

      respond.created(res, toRecordDto(record as any), 'Registro clínico creado exitosamente');
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

      const filter: Partial<z.infer<typeof getRecordsQuerySchema>> = query.success ? query.data : {};
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
        data: records.map((r) => toRecordDto(r as any)),
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
      const filter: Partial<z.infer<typeof getRecordsQuerySchema>> = query.success ? query.data : {};

      const [{ records, total, permission }, patient] = await Promise.all([
        recordsService.getAccessibleRecords(patientWallet, centerWallet, {
          recordType: filter.recordType as any,
          source: filter.source as any,
          from: filter.from ? new Date(filter.from) : undefined,
          to: filter.to ? new Date(filter.to) : undefined,
          page: filter.page,
          limit: filter.limit,
        }),
        identityService.getPatientProfileWithDni(patientWallet),
      ]);

      const patientProfile = patient
        ? {
            wallet: patient.wallet,
            name: patient.name,
            email: patient.email,
            dni:patient.dni
          }
        : null;

      res.status(200).json({
        success: true,
        permission,
        patient: patientProfile,
        data: records.map((r) => toRecordDto(r as any)),
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
      const { sub: requesterWallet, role: requesterRole } = (req as AuthenticatedRequest).user!;

      const record = await recordsService.getRecordById(id);
      if (!record) {
        respond.notFound(res, 'Registro no encontrado');
        return;
      }

      const hasAccess = await recordsService.canAccessRecord(record, requesterWallet, requesterRole ?? '');
      if (!hasAccess) {
        respond.forbidden(res, 'No tienes permiso para ver este registro.');
        return;
      }

      respond.ok(res, toRecordDto(record as any));
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
   * POST /api/records/:id/prepare-on-chain
   * Construye la transacción Soroban (sin firmar) y devuelve:
   *  - txXdr: envelope base64 listo para el admin submit
   *  - authEntryXdr: SorobanAuthorizationEntry que el usuario debe firmar con Freighter
   */
  async buildOnChainTx(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { sub: issuerWallet } = (req as AuthenticatedRequest).user!;

      const record = await recordsService.getRecordById(id);
      if (!record) {
        respond.notFound(res, 'Registro no encontrado');
        return;
      }

      if (record.isOnChain) {
        respond.badRequest(res, 'Este registro ya está registrado on-chain.');
        return;
      }

      const { innerTxXdr } = await sorobanService.buildAddRecordTx({
        issuerWallet,
        patientWallet: record.patientWallet,
        documentHash: record.documentHash,
        recordType: record.recordType,
        source: record.source as 'health_center' | 'patient',
        description: record.description,
      });

      respond.ok(res, { innerTxXdr });
    } catch (error) {
      if (error instanceof Error) {
        respond.badRequest(res, error.message);
      } else {
        respond.serverError(res, error);
      }
    }
  }

  /**
   * POST /api/records/:id/submit-on-chain
   * Recibe el auth entry firmado por el usuario via Freighter,
   * adjunta la firma, el admin envía la tx a Stellar y actualiza MongoDB.
   * Body: { txXdr: string, signedAuthEntryXdr: string }
   */
  async submitOnChainTx(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { signedInnerTxXdr } = req.body;

      if (!signedInnerTxXdr) {
        respond.badRequest(res, 'signedInnerTxXdr es requerido.');
        return;
      }

      const record = await recordsService.getRecordById(id);
      if (!record) {
        respond.notFound(res, 'Registro no encontrado');
        return;
      }

      if (record.isOnChain) {
        respond.badRequest(res, 'Este registro ya está registrado on-chain.');
        return;
      }

      const { onChainRecordId, txHash } = await sorobanService.submitOnChainRecord(
        signedInnerTxXdr,
      );

      const updated = await recordsService.markAsOnChain(id, onChainRecordId, txHash);

      respond.ok(res, updated, 'Registro anclado en blockchain exitosamente');
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

  /**
   * GET /api/records/:id/document
   * Sirve el archivo adjunto de un registro clínico.
   * Requiere autenticación; valida que el solicitante sea el paciente,
   * el emisor, o un HC con acceso activo.
   */
  async serveDocument(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { sub: requesterWallet, role: requesterRole } = (req as AuthenticatedRequest).user!;

      const record = await recordsService.getRecordById(id);

      if (!record) {
        respond.notFound(res, 'Registro no encontrado');
        return;
      }

      const hasAccess = await recordsService.canAccessRecord(record, requesterWallet, requesterRole ?? '');
      if (!hasAccess) {
        respond.forbidden(res, 'No tienes permiso para acceder a este documento.');
        return;
      }

      if (!record.documentPath) {
        respond.notFound(res, 'Este registro no tiene documento adjunto');
        return;
      }

      const absolutePath = path.resolve(record.documentPath);
      if (!fs.existsSync(absolutePath)) {
        respond.notFound(res, 'Archivo no encontrado en el servidor');
        return;
      }

      const mimeType = record.documentMimeType || 'application/octet-stream';
      const fileName = record.documentName || path.basename(absolutePath);

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
      res.sendFile(absolutePath);
    } catch (error) {
      respond.serverError(res, error);
    }
  }
}

export const recordsController = new RecordsController();
