import { Router } from 'express';
import { authController } from './auth.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';

const router = Router();

/**
 * @route   GET /api/auth/nonce
 * @desc    Genera un mensaje/nonce para que el usuario firme con Freighter
 * @access  Público
 * @query   wallet (Stellar public key G...)
 */
router.get('/nonce', authController.getNonce.bind(authController));

/**
 * @route   POST /api/auth/verify
 * @desc    Verifica la firma del wallet y emite un JWT
 * @access  Público
 * @body    { wallet, signature (base64), message }
 */
router.post('/verify', authController.verify.bind(authController));

/**
 * @route   GET /api/auth/me
 * @desc    Retorna el perfil del usuario autenticado
 * @access  Privado (JWT)
 */
router.get('/me', authMiddleware, authController.getMe.bind(authController));

/**
 * @route   POST /api/auth/refresh
 * @desc    Renueva el JWT del usuario autenticado
 * @access  Privado (JWT)
 */
router.post(
  '/refresh',
  authMiddleware,
  authController.refresh.bind(authController)
);

export default router;
