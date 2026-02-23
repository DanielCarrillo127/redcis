import { Router } from 'express';
import { identityController } from './identity.controller';
import { authMiddleware, requireRole } from '../../middlewares/auth.middleware';

const router = Router();

// Todas las rutas son privadas (requieren JWT)

/**
 * @route   POST /api/identity/individual/register
 * @desc    Registra al usuario autenticado como individuo (paciente)
 * @access  Privado — cualquier usuario autenticado
 * @body    { name, dni, email? }
 */
router.post(
  '/individual/register',
  authMiddleware,
  identityController.registerIndividual.bind(identityController)
);

/**
 * @route   POST /api/identity/health-center/register
 * @desc    Registra un nuevo centro de salud
 * @access  Privado — solo admin
 * @body    { wallet, name, nit, country, email? }
 */
router.post(
  '/health-center/register',
  authMiddleware,
  requireRole('admin'),
  identityController.registerHealthCenter.bind(identityController)
);

/**
 * @route   GET /api/identity/search?dni=...
 * @desc    Busca un paciente por DNI
 * @access  Privado — solo health_center
 */
router.get(
  '/search',
  authMiddleware,
  requireRole('health_center'),
  identityController.searchByDni.bind(identityController)
);

/**
 * @route   GET /api/identity/profile
 * @desc    Perfil del usuario autenticado
 * @access  Privado
 */
router.get(
  '/profile',
  authMiddleware,
  identityController.getProfile.bind(identityController)
);

/**
 * @route   PUT /api/identity/profile
 * @desc    Actualiza el perfil del usuario autenticado
 * @access  Privado
 * @body    { name?, email? }
 */
router.put(
  '/profile',
  authMiddleware,
  identityController.updateProfile.bind(identityController)
);

/**
 * @route   GET /api/identity/health-centers
 * @desc    Lista todos los centros de salud activos
 * @access  Privado
 */
router.get(
  '/health-centers',
  authMiddleware,
  identityController.listHealthCenters.bind(identityController)
);

/**
 * @route   GET /api/identity/health-centers/search?q=...
 * @desc    Busca centros de salud por nombre o NIT (parcial, case-insensitive)
 * @access  Privado — cualquier usuario autenticado
 * @query   q (mínimo 2 caracteres)
 */
router.get(
  '/health-centers/search',
  authMiddleware,
  identityController.searchHealthCenters.bind(identityController)
);

/**
 * @route   GET /api/identity/user/:wallet
 * @desc    Datos públicos de un usuario por wallet
 * @access  Privado
 */
router.get(
  '/user/:wallet',
  authMiddleware,
  identityController.getUserByWallet.bind(identityController)
);

export default router;
