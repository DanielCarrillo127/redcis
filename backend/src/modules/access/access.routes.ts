import { Router } from 'express';
import { accessController } from './access.controller';
import { authMiddleware, requireRole } from '../../middlewares/auth.middleware';

const router = Router();

/**
 * @route   POST /api/access/grant
 * @desc    El paciente otorga acceso a un centro de salud
 * @access  Privado — individual
 * @body    { centerWallet, permission ('view'|'add'), durationSeconds? }
 */
router.post(
  '/grant',
  authMiddleware,
  requireRole('individual'),
  accessController.grantAccess.bind(accessController)
);

/**
 * @route   POST /api/access/revoke
 * @desc    El paciente revoca el acceso a un centro de salud
 * @access  Privado — individual
 * @body    { centerWallet }
 */
router.post(
  '/revoke',
  authMiddleware,
  requireRole('individual'),
  accessController.revokeAccess.bind(accessController)
);

/**
 * @route   GET /api/access/my-grants
 * @desc    Lista todos los permisos que el paciente ha otorgado
 * @access  Privado — individual
 */
router.get(
  '/my-grants',
  authMiddleware,
  requireRole('individual'),
  accessController.getMyGrants.bind(accessController)
);

/**
 * @route   GET /api/access/my-patients
 * @desc    Lista todos los pacientes que han autorizado al centro
 * @access  Privado — health_center
 */
router.get(
  '/my-patients',
  authMiddleware,
  requireRole('health_center'),
  accessController.getMyPatients.bind(accessController)
);

/**
 * @route   GET /api/access/check?patientWallet=...&centerWallet=...
 * @desc    Verifica si existe acceso activo entre un par paciente-centro
 * @access  Privado
 */
router.get(
  '/check',
  authMiddleware,
  accessController.checkAccess.bind(accessController)
);

/**
 * @route   GET /api/access/grant/:centerWallet
 * @desc    Detalle de un permiso específico del paciente autenticado
 * @access  Privado — individual
 */
router.get(
  '/grant/:centerWallet',
  authMiddleware,
  requireRole('individual'),
  accessController.getGrant.bind(accessController)
);

export default router;
