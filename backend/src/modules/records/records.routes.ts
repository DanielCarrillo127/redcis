import { Router } from 'express';
import { recordsController, upload } from './records.controller';
import { authMiddleware, requireRole } from '../../middlewares/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación JWT

/**
 * @route   POST /api/records
 * @desc    Crea un nuevo registro clínico (con o sin archivo adjunto)
 * @access  Privado — individual (auto) | health_center (con acceso)
 * @body    multipart/form-data: { patientWallet?, recordType, source, description, eventDate, details? } + file?
 */
router.post(
  '/',
  authMiddleware,
  upload.single('document'),
  recordsController.createRecord.bind(recordsController)
);

/**
 * @route   GET /api/records/my
 * @desc    Historial clínico del paciente autenticado
 * @access  Privado — individual
 * @query   recordType?, source?, from?, to?, page?, limit?
 */
router.get(
  '/my',
  authMiddleware,
  requireRole('individual'),
  recordsController.getMyRecords.bind(recordsController)
);

/**
 * @route   GET /api/records/my/stats
 * @desc    Estadísticas del historial del paciente autenticado
 * @access  Privado — individual
 */
router.get(
  '/my/stats',
  authMiddleware,
  requireRole('individual'),
  recordsController.getMyStats.bind(recordsController)
);

/**
 * @route   GET /api/records/patient/:wallet
 * @desc    Historial de un paciente (requiere access grant activo)
 * @access  Privado — health_center
 * @query   recordType?, source?, from?, to?, page?, limit?
 */
router.get(
  '/patient/:wallet',
  authMiddleware,
  requireRole('health_center'),
  recordsController.getPatientRecords.bind(recordsController)
);

/**
 * @route   GET /api/records/:id
 * @desc    Detalle de un registro clínico
 * @access  Privado
 */
router.get(
  '/:id',
  authMiddleware,
  recordsController.getRecordById.bind(recordsController)
);

/**
 * @route   GET /api/records/:id/document
 * @desc    Sirve el archivo adjunto de un registro clínico
 * @access  Privado
 */
router.get(
  '/:id/document',
  authMiddleware,
  recordsController.serveDocument.bind(recordsController)
);

/**
 * @route   POST /api/records/:id/prepare-on-chain
 * @desc    Construye la tx Soroban sin firmar y devuelve el authEntryXdr para Freighter
 * @access  Privado — dueño del registro (paciente o HC que lo creó)
 */
router.post(
  '/:id/prepare-on-chain',
  authMiddleware,
  recordsController.buildOnChainTx.bind(recordsController)
);

/**
 * @route   POST /api/records/:id/submit-on-chain
 * @desc    Adjunta el authEntry firmado por Freighter, envía la tx y actualiza MongoDB
 * @access  Privado — dueño del registro
 * @body    { txXdr: string, signedAuthEntryXdr: string }
 */
router.post(
  '/:id/submit-on-chain',
  authMiddleware,
  recordsController.submitOnChainTx.bind(recordsController)
);

/**
 * @route   POST /api/records/:id/verify
 * @desc    Verifica la integridad de un documento (compara hash)
 * @access  Privado
 * @body    multipart/form-data: file
 */
router.post(
  '/:id/verify',
  authMiddleware,
  upload.single('document'),
  recordsController.verifyDocument.bind(recordsController)
);

/**
 * @route   PATCH /api/records/:id/on-chain
 * @desc    Marca un registro como sincronizado con el contrato Soroban
 * @access  Privado — admin
 * @body    { onChainRecordId, stellarTxHash?, ledgerSequence? }
 */
router.patch(
  '/:id/on-chain',
  authMiddleware,
  requireRole('admin'),
  recordsController.markOnChain.bind(recordsController)
);

export default router;
