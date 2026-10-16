import { PrismaClient } from '@prisma/client';

// Reuse a single PrismaClient across the app to avoid exhausting the
// database connection pool (a new client per route file opens a new pool).
const globalForPrisma = globalThis;

const prisma = globalForPrisma.__prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.__prisma = prisma;
}

export default prisma;
