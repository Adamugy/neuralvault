import { Request, Response } from 'express';
import { ResourceService } from '../services/resourceService.js';
import { toFolderDto, toResourceDto } from '../utils/dtos.js';
import { createFolderSchema, createResourceSchema } from '../utils/schemas.js';
import { BadRequestError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getFolders = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const folders = await ResourceService.getFolders(userId);
    res.json({ folders: folders.map(toFolderDto) });
});

export const createFolder = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const result = createFolderSchema.safeParse(req.body);
    if (!result.success) {
        throw new BadRequestError(result.error.issues[0].message);
    }

    const { name } = result.data;
    const folder = await ResourceService.createFolder(userId, name);
    res.status(201).json({ folder: toFolderDto(folder) });
});

export const deleteFolder = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const id = String(req.params.id);

    await ResourceService.deleteFolder(userId, id);
    res.json({ ok: true });
});

export const getResources = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const folderId = req.query.folderId ? String(req.query.folderId) : undefined;

    const resources = await ResourceService.getResources(userId, folderId);
    res.json({ resources: resources.map(toResourceDto) });
});

export const createResource = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const result = createResourceSchema.safeParse(req.body);
    if (!result.success) {
        throw new BadRequestError(result.error.issues[0].message);
    }

    const { type, title, url, tags, notes, completed, folderId: rawFolderId } = result.data;
    const folderId = rawFolderId && rawFolderId !== 'general' ? rawFolderId : null;

    let fileName: string | null = null;
    let fileType: string | null = null;
    let fileUrl: string | null = null;

    if (type === 'file') {
        if (!req.file) throw new BadRequestError('File is required for type=file');
        fileName = req.file.originalname || null;
        fileType = req.file.mimetype || null;
        fileUrl = `/uploads/${req.file.filename}`;
    }

    const resource = await ResourceService.createResource(userId, {
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
    });

    res.status(201).json({ resource: toResourceDto(resource) });
});

export const updateResource = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const id = String(req.params.id);

    const data: any = {};
    if (typeof req.body?.completed === 'boolean') data.completed = req.body.completed;
    if (typeof req.body?.folderId === 'string') data.folderId = req.body.folderId;
    if (req.body?.folderId === null) data.folderId = null;
    if (typeof req.body?.notes === 'string') data.notes = req.body.notes;
    if (Array.isArray(req.body?.tags)) data.tags = req.body.tags.map(String);

    const resource = await ResourceService.updateResource(userId, id, data);
    res.json({ resource: toResourceDto(resource) });
});

export const deleteResource = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const id = String(req.params.id);

    await ResourceService.deleteResource(userId, id);
    res.json({ ok: true });
});

export const bootstrap = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const { folders, resources } = await ResourceService.bootstrap(userId);

    res.json({
        folders: folders.map(toFolderDto),
        resources: resources.map(toResourceDto),
    });
});
