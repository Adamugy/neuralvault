import { prisma } from './prisma.js';

export const ensureUser = async (clerkUserId: string) => {
    if (!clerkUserId) throw new Error('Missing clerkUserId');
    return prisma.user.upsert({
        where: { clerkUserId },
        create: { clerkUserId, plan: 'free' },
        update: {},
    });
};
