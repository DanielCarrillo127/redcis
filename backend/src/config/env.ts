import dotenv from 'dotenv';
dotenv.config();

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
};

export const env = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',

  mongodb: {
    uri: required('MONGODB_URI'),
  },

  jwt: {
    secret: required('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  stellar: {
    signingSecret: required('SERVER_SIGNING_SECRET'),
    homeDomain: process.env.HOME_DOMAIN || 'localhost:3001',
    webAuthDomain: process.env.WEB_AUTH_DOMAIN || 'localhost:3001',
    network: process.env.STELLAR_NETWORK || 'testnet',
    horizonUrl:
      process.env.STELLAR_HORIZON_URL ||
      'https://horizon-testnet.stellar.org',
  },

  cors: {
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim()),
  },

  auth: {
    nonceTtlSeconds: parseInt(process.env.NONCE_TTL_SECONDS || '300', 10),
  },

  upload: {
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
    uploadDir: process.env.UPLOAD_DIR || 'uploads',
  },
};
