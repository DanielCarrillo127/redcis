/**
 * RecordsService — Gestión de registros clínicos
 *
 * Los registros se almacenan en MongoDB (off-chain) y opcionalmente
 * se sincronizan con el contrato MedicalRecordRegistry de Soroban.
 *
 * El documento físico (PDF, imagen) se guarda en el sistema de archivos
 * local (o servicio externo en producción). Su hash SHA256 se almacena
 * tanto en MongoDB como on-chain para garantizar inmutabilidad.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { ClinicalRecordModel, IClinicalRecord } from '../../shared/schemas/clinical-record.schema';
import { UserModel } from '../../shared/schemas/user.schema';
import { AccessGrantModel } from '../../shared/schemas/access-grant.schema';
import { RecordType, RecordSource } from '../../shared/types';
import { env } from '../../config/env';

export interface CreateRecordDto {
  patientWallet: string;
  issuerWallet: string;
  recordType: RecordType;
  source: RecordSource;
  description: string;
  eventDate: string; // ISO date string
  details?: Record<string, unknown>;
  filePath?: string;
  fileName?: string;
  fileMimeType?: string;
}

export interface GetRecordsFilter {
  recordType?: RecordType;
  source?: RecordSource;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

export class RecordsService {
  /**
   * Calcula el hash SHA256 de un archivo o de un string de contenido.
   */
  private computeHash(content: string | Buffer): string {
    const data = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Calcula el hash de un archivo por su ruta.
   */
  computeFileHash(filePath: string): string {
    const buffer = fs.readFileSync(filePath);
    return this.computeHash(buffer);
  }

  /**
   * Crea un nuevo registro clínico.
   *
   * Validaciones:
   * - El paciente debe estar registrado en el sistema.
   * - Si source=health_center, el emisor debe ser un HC activo.
   * - Si source=patient, el emisor debe ser el mismo que el paciente.
   */
  async createRecord(dto: CreateRecordDto): Promise<IClinicalRecord> {
    // Validar paciente
    const patient = await UserModel.findOne({
      wallet: dto.patientWallet,
      role: 'individual',
      active: true,
    });
    if (!patient) {
      throw new Error('Paciente no encontrado o no registrado como individuo.');
    }

    // Validar emisor
    const issuer = await UserModel.findOne({
      wallet: dto.issuerWallet,
      active: true,
    });
    if (!issuer) {
      throw new Error('Emisor no encontrado en el sistema.');
    }

    // Validar fuente
    if (dto.source === 'health_center') {
      if (issuer.role !== 'health_center') {
        throw new Error('Solo centros de salud registrados pueden usar source=health_center.');
      }
      // Verificar que tiene acceso activo al paciente
      const hasAccess = await AccessGrantModel.findOne({
        patientWallet: dto.patientWallet,
        centerWallet: dto.issuerWallet,
        active: true,
        $or: [
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } },
        ],
      });
      if (!hasAccess) {
        throw new Error('El centro de salud no tiene acceso autorizado a este paciente.');
      }
      // Verificar que tiene permiso de escritura
      if (hasAccess.permission === 'view') {
        throw new Error('El centro de salud solo tiene permiso de lectura (view). Se requiere permiso "add".');
      }
    }

    if (dto.source === 'patient') {
      if (dto.issuerWallet !== dto.patientWallet) {
        throw new Error('Con source=patient, el emisor debe ser el mismo wallet que el paciente.');
      }
    }

    // Calcular hash del documento
    let documentHash: string;
    if (dto.filePath && fs.existsSync(dto.filePath)) {
      documentHash = this.computeFileHash(dto.filePath);
    } else {
      // Hash del contenido de descripción si no hay archivo
      documentHash = this.computeHash(
        `${dto.patientWallet}:${dto.description}:${dto.eventDate}:${Date.now()}`
      );
    }

    const record = await ClinicalRecordModel.create({
      patientWallet: dto.patientWallet,
      patientId: patient._id,
      issuerWallet: dto.issuerWallet,
      issuerId: issuer._id,
      healthCenterName: issuer.role === 'health_center' ? issuer.name : 'Registro Personal',
      recordType: dto.recordType,
      source: dto.source,
      description: dto.description,
      eventDate: new Date(dto.eventDate),
      documentHash,
      documentPath: dto.filePath,
      documentName: dto.fileName,
      documentMimeType: dto.fileMimeType,
      details: dto.details,
      isOnChain: false,
    });

    return record;
  }

  /**
   * Retorna todos los registros de un paciente.
   */
  async getPatientRecords(
    patientWallet: string,
    filter: GetRecordsFilter = {}
  ): Promise<{ records: IClinicalRecord[]; total: number }> {
    const query: Record<string, unknown> = { patientWallet };

    if (filter.recordType) query.recordType = filter.recordType;
    if (filter.source) query.source = filter.source;
    if (filter.from || filter.to) {
      const dateFilter: Record<string, Date> = {};
      if (filter.from) dateFilter['$gte'] = filter.from;
      if (filter.to) dateFilter['$lte'] = filter.to;
      query.eventDate = dateFilter;
    }

    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      ClinicalRecordModel.find(query)
        .sort({ eventDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ClinicalRecordModel.countDocuments(query),
    ]);

    return { records: records as unknown as IClinicalRecord[], total };
  }

  /**
   * Retorna los registros accesibles por un centro de salud para un paciente.
   * Verifica que el access grant esté activo.
   */
  async getAccessibleRecords(
    patientWallet: string,
    centerWallet: string,
    filter: GetRecordsFilter = {}
  ): Promise<{ records: IClinicalRecord[]; total: number; permission: 'view' | 'add' }> {
    // Verificar acceso
    const grant = await AccessGrantModel.findOne({
      patientWallet,
      centerWallet,
      active: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ],
    });

    if (!grant) {
      throw new Error('No tienes acceso autorizado al historial de este paciente.');
    }

    const { records, total } = await this.getPatientRecords(patientWallet, filter);
    return { records, total, permission: grant.permission };
  }

  /**
   * Retorna un registro específico por ID, con datos del emisor y paciente populados.
   */
  async getRecordById(recordId: string): Promise<any | null> {
    return ClinicalRecordModel.findById(recordId)
      .populate('issuerId', 'name email wallet role')
      .populate('patientId', 'name email wallet')
      .lean();
  }

  /**
   * Verifica si un wallet tiene permiso para acceder a un registro:
   * - individual: debe ser el paciente o el emisor del registro
   * - health_center: debe ser el emisor O tener un access grant activo del paciente
   * - admin: acceso total
   */
  async canAccessRecord(
    record: IClinicalRecord,
    requesterWallet: string,
    requesterRole: string,
  ): Promise<boolean> {
    if (requesterRole === 'admin') return true;

    if (requesterRole === 'individual') {
      return (
        record.patientWallet === requesterWallet ||
        record.issuerWallet === requesterWallet
      );
    }

    if (requesterRole === 'health_center') {
      if (record.issuerWallet === requesterWallet) return true;
      const grant = await AccessGrantModel.findOne({
        patientWallet: record.patientWallet,
        centerWallet: requesterWallet,
        active: true,
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      });
      return !!grant;
    }

    return false;
  }

  /**
   * Verifica que el hash de un archivo coincide con el almacenado.
   */
  async verifyDocument(recordId: string, filePath: string): Promise<boolean> {
    const record = await ClinicalRecordModel.findById(recordId);
    if (!record) throw new Error('Registro no encontrado.');

    const computedHash = this.computeFileHash(filePath);
    return computedHash === record.documentHash;
  }

  /**
   * Verifica el hash de un documento a partir del buffer en memoria.
   */
  verifyDocumentBuffer(expectedHash: string, buffer: Buffer): boolean {
    const computed = this.computeHash(buffer);
    return computed === expectedHash;
  }

  /**
   * Marca un registro como sincronizado on-chain.
   */
  async markAsOnChain(
    recordId: string,
    onChainRecordId: number,
    stellarTxHash?: string,
    ledgerSequence?: number
  ): Promise<IClinicalRecord | null> {
    return ClinicalRecordModel.findByIdAndUpdate(
      recordId,
      {
        isOnChain: true,
        onChainRecordId,
        stellarTxHash,
        ledgerSequence,
      },
      { new: true }
    ).lean() as Promise<IClinicalRecord | null>;
  }

  /**
   * Retorna estadísticas del historial de un paciente.
   */
  async getPatientStats(patientWallet: string): Promise<{
    total: number;
    byType: Record<string, number>;
    onChain: number;
  }> {
    const [total, onChain, byTypeAgg] = await Promise.all([
      ClinicalRecordModel.countDocuments({ patientWallet }),
      ClinicalRecordModel.countDocuments({ patientWallet, isOnChain: true }),
      ClinicalRecordModel.aggregate([
        { $match: { patientWallet } },
        { $group: { _id: '$recordType', count: { $sum: 1 } } },
      ]),
    ]);

    const byType = byTypeAgg.reduce(
      (acc: Record<string, number>, item: { _id: string; count: number }) => {
        acc[item._id] = item.count;
        return acc;
      },
      {}
    );

    return { total, byType, onChain };
  }

  /**
   * Ruta segura de uploads.
   */
  getUploadPath(filename: string): string {
    return path.join(env.upload.uploadDir, filename);
  }
}

export const recordsService = new RecordsService();
