import { prisma } from './prisma.js';
import { ResourceType } from '@prisma/client';
import { NotFoundError, ConflictError } from '../utils/errors.js';

export class ResourceService {
    static async getFolders(userId: string) {
        return prisma.folder.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' }
        });
    }

    static async createFolder(userId: string, name: string) {
        try {
            return await prisma.folder.create({
                data: { userId, name }
            });
        } catch (err: any) {
            if (err.code === 'P2002') {
                throw new ConflictError('Folder name already exists');
            }
            throw err;
        }
    }

    static async deleteFolder(userId: string, folderId: string) {
        const folder = await prisma.folder.findFirst({
            where: { id: folderId, userId }
        });

        if (!folder) {
            throw new NotFoundError('Folder not found');
        }

        return prisma.folder.delete({ where: { id: folderId } });
    }

    static async getResources(userId: string, folderId?: string) {
        return prisma.resource.findMany({
            where: {
                userId,
                ...(folderId ? { folderId } : {}),
            },
            orderBy: { dateAdded: 'desc' },
        });
    }

    static async createResource(userId: string, data: {
        type: ResourceType;
        title: string;
        url?: string | null;
        fileName?: string | null;
        fileType?: string | null;
        fileUrl?: string | null;
        tags?: string[];
        notes?: string;
        completed?: boolean;
        folderId?: string | null;
    }) {
        return prisma.resource.create({
            data: {
                ...data,
                userId,
            },
        });
    }

    static async updateResource(userId: string, resourceId: string, data: {
        completed?: boolean;
        folderId?: string | null;
        notes?: string;
        tags?: string[];
    }) {
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

    static async deleteResource(userId: string, resourceId: string) {
        const existing = await prisma.resource.findFirst({
            where: { id: resourceId, userId }
        });

        if (!existing) {
            throw new NotFoundError('Resource not found');
        }

        return prisma.resource.delete({ where: { id: resourceId } });
    }

    static async bootstrap(userId: string) {
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
