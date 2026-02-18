import { Router, Request, Response } from 'express';
import { explorerService } from './explorer.service';
import * as respond from '../../shared/utils/response';

const router = Router();

/**
 * @route   GET /api/explorer/stats
 * @desc    Estadísticas globales del sistema
 * @access  Público
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await explorerService.getGlobalStats();
    respond.ok(res, stats);
  } catch (error) {
    respond.serverError(res, error);
  }
});

/**
 * @route   GET /api/explorer/recent-records?limit=10
 * @desc    Últimos registros clínicos (anonimizados)
 * @access  Público
 */
router.get('/recent-records', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const records = await explorerService.getRecentRecords(limit);
    respond.ok(res, records);
  } catch (error) {
    respond.serverError(res, error);
  }
});

/**
 * @route   GET /api/explorer/record-types
 * @desc    Distribución de tipos de registros
 * @access  Público
 */
router.get('/record-types', async (_req: Request, res: Response) => {
  try {
    const dist = await explorerService.getRecordTypeDistribution();
    respond.ok(res, dist);
  } catch (error) {
    respond.serverError(res, error);
  }
});

/**
 * @route   GET /api/explorer/top-health-centers
 * @desc    Centros de salud más activos
 * @access  Público
 */
router.get('/top-health-centers', async (_req: Request, res: Response) => {
  try {
    const centers = await explorerService.getTopHealthCenters();
    respond.ok(res, centers);
  } catch (error) {
    respond.serverError(res, error);
  }
});

export default router;
