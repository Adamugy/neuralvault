import { PrismaClient } from '@prisma/client';

console.log('[Prisma] Initializing client...');
export const prisma = new PrismaClient();

export const checkDatabaseConnection = async () => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        console.log('[Prisma] Database connection successful');
        return true;
    } catch (error) {
        console.error('[Prisma] Database connection failed:', error);
        return false;
    }
};
