import { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import { prisma } from '../services/prisma.js';
import { toFolderDto, toResourceDto } from '../utils/dtos.js';
import { createFolderSchema, createResourceSchema } from '../utils/schemas.js';

export const getFolders = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId } = getAuth(req);
        if (!userId) return res.status(401).send();
        const folders = await prisma.folder.findMany({ where: { clerkUserId: userId }, orderBy: { createdAt: 'asc' } });
        res.json({ folders: folders.map(toFolderDto) });
    } catch (err) {
        next(err);
    }
};

export const createFolder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId } = getAuth(req);
        if (!userId) return res.status(401).send();

        const result = createFolderSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ error: (result.error as any).errors[0].message });
        }

        const { name } = result.data;
        const folder = await prisma.folder.create({ data: { clerkUserId: userId, name } });
        res.status(201).json({ folder: toFolderDto(folder) });
    } catch (err) {
        if ((err as any)?.code === 'P2002') {
            return res.status(409).json({ error: 'Folder name already exists' });
        }
        next(err);
    }
};

export const deleteFolder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId } = getAuth(req);
        if (!userId) return res.status(401).send();
        const id = String(req.params.id);

        const folder = await prisma.folder.findFirst({ where: { id, clerkUserId: userId } });
        if (!folder) return res.status(404).json({ error: 'Folder not found' });

        await prisma.folder.delete({ where: { id } });
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
};

export const getResources = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId } = getAuth(req);
        if (!userId) return res.status(401).send();
        const folderId = req.query.folderId ? String(req.query.folderId) : undefined;

        const resources = await prisma.resource.findMany({
            where: {
                clerkUserId: userId,
                ...(folderId ? { folderId } : {}),
            },
            orderBy: { dateAdded: 'desc' },
        });

        res.json({ resources: resources.map(toResourceDto) });
    } catch (err) {
        next(err);
    }
};

export const createResource = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId } = getAuth(req);
        if (!userId) return res.status(401).send();

        const result = createResourceSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ error: (result.error as any).errors[0].message });
        }

        const { type, title, url, tags, notes, completed, folderId: rawFolderId } = result.data;
        const folderId = rawFolderId && rawFolderId !== 'general' ? rawFolderId : null;

        let fileName: string | null = null;
        let fileType: string | null = null;
        let fileUrl: string | null = null;

        if (type === 'file') {
            if (!req.file) return res.status(400).json({ error: 'File is required for type=file' });
            fileName = req.file.originalname || null;
            fileType = req.file.mimetype || null;
            fileUrl = `/uploads/${req.file.filename}`;
        }

        const resource = await prisma.resource.create({
            data: {
                clerkUserId: userId,
                type,
                title,
                url,
                fileName,
                fileType,
                fileUrl,
                tags: tags || [],
                notes: notes || '',
                completed: completed || false,
                folderId,
            },
        });

        res.status(201).json({ resource: toResourceDto(resource) });
    } catch (err) {
        next(err);
    }
};

export const updateResource = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId } = getAuth(req);
        if (!userId) return res.status(401).send();
        const id = String(req.params.id);

        const existing = await prisma.resource.findFirst({ where: { id, clerkUserId: userId } });
        if (!existing) return res.status(404).json({ error: 'Resource not found' });

        const data: any = {};
        if (typeof req.body?.completed === 'boolean') data.completed = req.body.completed;
        if (typeof req.body?.folderId === 'string') data.folderId = req.body.folderId;
        if (req.body?.folderId === null) data.folderId = null;
        if (typeof req.body?.notes === 'string') data.notes = req.body.notes;
        if (Array.isArray(req.body?.tags)) data.tags = req.body.tags.map(String);

        const resource = await prisma.resource.update({ where: { id }, data });
        res.json({ resource: toResourceDto(resource) });
    } catch (err) {
        next(err);
    }
};

export const deleteResource = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId } = getAuth(req);
        if (!userId) return res.status(401).send();
        const id = String(req.params.id);

        const existing = await prisma.resource.findFirst({ where: { id, clerkUserId: userId } });
        if (!existing) return res.status(404).json({ error: 'Resource not found' });

        await prisma.resource.delete({ where: { id } });
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
};

export const bootstrap = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId } = getAuth(req);
        if (!userId) return res.status(401).send();
        const [folders, resources] = await Promise.all([
            prisma.folder.findMany({ where: { clerkUserId: userId }, orderBy: { createdAt: 'asc' } }),
            prisma.resource.findMany({ where: { clerkUserId: userId }, orderBy: { dateAdded: 'desc' } }),
        ]);

        res.json({
            folders: folders.map(toFolderDto),
            resources: resources.map(toResourceDto),
        });
    } catch (err) {
        next(err);
    }
};
