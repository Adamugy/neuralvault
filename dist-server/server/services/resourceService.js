import { prisma } from './prisma.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
export class ResourceService {
    static async getFolders(userId) {
        return prisma.folder.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' }
        });
    }
    static async createFolder(userId, name) {
        try {
            return await prisma.folder.create({
                data: { userId, name }
            });
        }
        catch (err) {
            if (err.code === 'P2002') {
                throw new ConflictError('Folder name already exists');
            }
            throw err;
        }
    }
    static async deleteFolder(userId, folderId) {
        const folder = await prisma.folder.findFirst({
            where: { id: folderId, userId }
        });
        if (!folder) {
            throw new NotFoundError('Folder not found');
        }
        return prisma.folder.delete({ where: { id: folderId } });
    }
    static async getResources(userId, folderId) {
        return prisma.resource.findMany({
            where: {
                userId,
                ...(folderId ? { folderId } : {}),
            },
            orderBy: { dateAdded: 'desc' },
        });
    }
    static async createResource(userId, data) {
        return prisma.resource.create({
            data: {
                ...data,
                userId,
            },
        });
    }
    static async updateResource(userId, resourceId, data) {
        const existing = await prisma.resource.findFirst({
            where: { id: resourceId, userId }
        });
        if (!existing) {
            throw new NotFoundError('Resource not found');
        }
        return prisma.resource.update({
            where: { id: resourceId },
            data
        });
    }
    static async deleteResource(userId, resourceId) {
        const existing = await prisma.resource.findFirst({
            where: { id: resourceId, userId }
        });
        if (!existing) {
            throw new NotFoundError('Resource not found');
        }
        return prisma.resource.delete({ where: { id: resourceId } });
    }
    static async bootstrap(userId) {
        const [folders, resources] = await Promise.all([
            this.getFolders(userId),
            prisma.resource.findMany({
                where: { userId },
                orderBy: { dateAdded: 'desc' }
            }),
        ]);
        return { folders, resources };
    }
}
