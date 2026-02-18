import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

import { env } from './config/env';

// Rutas
import authRoutes from './modules/auth/auth.routes';
import identityRoutes from './modules/identity/identity.routes';
import recordsRoutes from './modules/records/records.routes';
import accessRoutes from './modules/access/access.routes';
import explorerRoutes from './modules/explorer/explorer.routes';

// Middlewares globales
import { errorMiddleware, notFoundMiddleware } from './middlewares/error.middleware';

export function createApp(): Application {
  const app = express();

  // ---------------------------------------------------------------------------
  // Asegurar directorio de uploads
  // ---------------------------------------------------------------------------
  const uploadDir = path.resolve(env.upload.uploadDir);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // ---------------------------------------------------------------------------
  // Seguridad y utilidades
  // ---------------------------------------------------------------------------
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        // Permitir requests sin origin (Postman, mobile apps, etc.)
        if (!origin || env.cors.allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS: origen no permitido: ${origin}`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(compression());
  app.use(morgan(env.isDev ? 'dev' : 'combined'));

  // ---------------------------------------------------------------------------
  // Rate limiting
  // ---------------------------------------------------------------------------
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 200,
    message: { success: false, error: 'Demasiadas solicitudes. Intenta más tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const authLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 200,
    message: { success: false, error: 'Demasiados intentos de autenticación.' },
  });

  app.use('/api', globalLimiter);
  app.use('/api/auth', authLimiter);

  // ---------------------------------------------------------------------------
  // Body parsers
  // ---------------------------------------------------------------------------
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ---------------------------------------------------------------------------
  // Servir archivos de upload (en producción usar CDN/S3)
  // ---------------------------------------------------------------------------
  app.use(
    '/uploads',
    express.static(uploadDir, {
      setHeaders: (res) => {
        res.set('Cache-Control', 'private, max-age=3600');
      },
    })
  );

  // ---------------------------------------------------------------------------
  // Rutas
  // ---------------------------------------------------------------------------
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      service: 'redcis-backend',
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/identity', identityRoutes);
  app.use('/api/records', recordsRoutes);
  app.use('/api/access', accessRoutes);
  app.use('/api/explorer', explorerRoutes);

  // ---------------------------------------------------------------------------
  // Error handlers (al final)
  // ---------------------------------------------------------------------------
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
