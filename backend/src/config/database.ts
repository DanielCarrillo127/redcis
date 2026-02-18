import mongoose from 'mongoose';
import { env } from './env';

export async function connectDatabase(): Promise<void> {
  try {
    mongoose.set('strictQuery', true);

    await mongoose.connect(env.mongodb.uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log('[DB] MongoDB conectado exitosamente');

    mongoose.connection.on('disconnected', () => {
      console.warn('[DB] MongoDB desconectado');
    });

    mongoose.connection.on('error', (err) => {
      console.error('[DB] Error de conexión:', err);
    });
  } catch (error) {
    console.error('[DB] Error al conectar a MongoDB:', error);
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  console.log('[DB] MongoDB desconectado');
}
