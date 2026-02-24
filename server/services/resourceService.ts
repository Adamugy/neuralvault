import { prisma } from './prisma.js';
import { ResourceType } from '@prisma/client';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/errors.js';
import fs from 'fs/promises';
import path from 'path';
import { uploadsDir } from '../utils/upload.js';
import { SECURITY_CONFIG } from '../utils/config.js';

export class ResourceService {
    static async getFolders(userId: string) {
        return prisma.folder.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' }
        });
    }

    static async getResourceById(userId: string, resourceId: string) {
        return prisma.resource.findFirst({
            where: { id: resourceId, userId }
        });
    }

    static async validateUserLimits(userId: string, type: string) {
        const existing = await this.getResources(userId);

        if (existing.length >= SECURITY_CONFIG.MAX_RESOURCES_PER_USER) {
            throw new BadRequestError(`Resource limit reached (${SECURITY_CONFIG.MAX_RESOURCES_PER_USER})`);
        }

        if (type === 'file') {
            const fileCount = existing.filter(r => r.type === 'file').length;
            if (fileCount >= SECURITY_CONFIG.MAX_FILES_PER_USER) {
                throw new BadRequestError(`File limit reached (${SECURITY_CONFIG.MAX_FILES_PER_USER})`);
            }
        }
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

        // Physical deletion if it's a file
        if (existing.type === ResourceType.file && existing.fileUrl) {
            try {
                const fileName = path.basename(existing.fileUrl);
                const filePath = path.join(uploadsDir, fileName);
                await fs.unlink(filePath);
            } catch (err) {
                console.error(`[ResourceService] Failed to delete physical file: ${existing.fileUrl}`, err);
                // We proceed with DB deletion anyway to avoid stuck records
            }
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
