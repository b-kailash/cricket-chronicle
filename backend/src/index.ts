import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { config } from './config';
import { checkDatabaseConnection, disconnectDatabase } from './config/database';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Import routes
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import matchRoutes from './routes/matches';
import deliveryRoutes from './routes/deliveries';
import teamRoutes from './routes/teams';
import competitionRoutes from './routes/competitions';
import provinceRoutes from './routes/provinces';
import clubRoutes from './routes/clubs';
import divisionRoutes from './routes/divisions';
import playerRoutes from './routes/players';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate limiting (0 = disabled)
if (config.rateLimit.max > 0) {
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
      },
    },
  });
  app.use('/api/', limiter);
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
if (config.nodeEnv !== 'test') {
  app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));
}

// API routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/competitions', competitionRoutes);
app.use('/api/provinces', provinceRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/divisions', divisionRoutes);
app.use('/api/players', playerRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Cricket Chronicle API',
    version: '1.0.0',
    status: 'running',
    docs: '/api/health',
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Check database connection
    console.log('Checking database connection...');
    const dbConnected = await checkDatabaseConnection();

    if (!dbConnected) {
      console.error('Failed to connect to database. Retrying in 5 seconds...');
      setTimeout(startServer, 5000);
      return;
    }

    console.log('Database connected successfully');

    // Start listening
    app.listen(config.port, () => {
      console.log(`
  ==========================================
  Cricket Chronicle API
  ==========================================
  Environment: ${config.nodeEnv}
  Port: ${config.port}
  Health: http://localhost:${config.port}/api/health
  ==========================================
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  await disconnectDatabase();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();

export default app;
