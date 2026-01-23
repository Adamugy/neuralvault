import { prisma } from './prisma.js';
export class UserService {
    static async ensureUserExists(clerkUserId) {
        return prisma.user.upsert({
            where: { clerkUserId },
            create: { clerkUserId },
            update: {}
        });
    }
    static async getUser(clerkUserId) {
        return prisma.user.findUnique({
            where: { clerkUserId }
        });
    }
    static async updateUser(clerkUserId, data) {
        return prisma.user.update({
            where: { clerkUserId },
            data
        });
    }
}
