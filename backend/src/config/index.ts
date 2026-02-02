import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  databaseUrl: process.env.DATABASE_URL || '',

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },

  // Bcrypt
  bcryptRounds: 12,

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};

// Validate required environment variables in production
if (config.nodeEnv === 'production') {
  const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = requiredEnvVars.filter(v => !process.env[v]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export default config;
