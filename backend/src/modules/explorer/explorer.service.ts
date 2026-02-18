/**
 * ExplorerService — Consultas públicas de eventos y estadísticas
 *
 * Provee endpoints de solo lectura para el explorador público
 * del sistema (análogo a Stellar Expert pero para redcis).
 */

import { ClinicalRecordModel } from '../../shared/schemas/clinical-record.schema';
import { UserModel } from '../../shared/schemas/user.schema';
import { AccessGrantModel } from '../../shared/schemas/access-grant.schema';

export class ExplorerService {
  /**
   * Estadísticas globales del sistema.
   */
  async getGlobalStats(): Promise<{
    totalPatients: number;
    totalHealthCenters: number;
    totalRecords: number;
    onChainRecords: number;
    totalActiveGrants: number;
  }> {
    const [
      totalPatients,
      totalHealthCenters,
      totalRecords,
      onChainRecords,
      totalActiveGrants,
    ] = await Promise.all([
      UserModel.countDocuments({ role: 'individual', active: true }),
      UserModel.countDocuments({ role: 'health_center', active: true }),
      ClinicalRecordModel.countDocuments(),
      ClinicalRecordModel.countDocuments({ isOnChain: true }),
      AccessGrantModel.countDocuments({ active: true }),
    ]);

    return {
      totalPatients,
      totalHealthCenters,
      totalRecords,
      onChainRecords,
      totalActiveGrants,
    };
  }

  /**
   * Últimos registros clínicos creados (datos públicos/anonimizados).
   */
  async getRecentRecords(limit = 10): Promise<object[]> {
    const records = await ClinicalRecordModel.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('recordType source healthCenterName eventDate isOnChain documentHash createdAt')
      .lean();

    return records;
  }

  /**
   * Distribución de tipos de registros.
   */
  async getRecordTypeDistribution(): Promise<{ type: string; count: number }[]> {
    const agg = await ClinicalRecordModel.aggregate([
      { $group: { _id: '$recordType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    return agg.map((item: { _id: string; count: number }) => ({
      type: item._id,
      count: item.count,
    }));
  }

  /**
   * Centros de salud más activos (por número de registros creados).
   */
  async getTopHealthCenters(limit = 5): Promise<object[]> {
    return ClinicalRecordModel.aggregate([
      { $match: { source: 'health_center' } },
      { $group: { _id: '$healthCenterName', records: { $sum: 1 } } },
      { $sort: { records: -1 } },
      { $limit: limit },
    ]);
  }
}

export const explorerService = new ExplorerService();
