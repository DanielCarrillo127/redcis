import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { env } from './config/env';

async function bootstrap(): Promise<void> {
  // Conectar a MongoDB
  await connectDatabase();

  // Crear servidor Express
  const app = createApp();

  const server = app.listen(env.port, () => {
    console.log(`
╔═══════════════════════════════════════════╗
║        redcis Backend API v1.0.0          ║
╠═══════════════════════════════════════════╣
║  Servidor: http://localhost:${env.port}          
║  Entorno:  ${env.nodeEnv.padEnd(32)}
║  Network:  Stellar ${env.stellar.network.padEnd(25)}
╚═══════════════════════════════════════════╝
    `);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n[Server] Recibida señal ${signal}. Cerrando...`);
    server.close(async () => {
      await disconnectDatabase();
      console.log('[Server] Servidor cerrado correctamente.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    console.error('[Server] Unhandled Rejection:', reason);
  });

  process.on('uncaughtException', (error) => {
    console.error('[Server] Uncaught Exception:', error);
    process.exit(1);
  });
}

bootstrap().catch((error) => {
  console.error('[Server] Error al iniciar:', error);
  process.exit(1);
});
