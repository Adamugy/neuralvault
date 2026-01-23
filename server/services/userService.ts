import { prisma } from './prisma.js';

export class UserService {
    static async getUser(userId: string) {
        return prisma.user.findUnique({
            where: { id: userId }
        });
    }

    static async getUserByEmail(email: string) {
        return prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });
    }

    static async updateUser(userId: string, data: {
        name?: string;
        role?: string;
        avatarUrl?: string;
    }) {
        return prisma.user.update({
            where: { id: userId },
            data
        });
    }
}
