import { PrismaClient } from '@prisma/client';

console.log('[Prisma] Initializing client...');
export const prisma = new PrismaClient();
