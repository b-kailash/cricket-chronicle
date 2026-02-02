import { PrismaClient } from '@prisma/client';
import { config } from './index';

// Create a singleton Prisma client instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (config.nodeEnv !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

export default prisma;
