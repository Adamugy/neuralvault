import path from 'path';
import fs from 'fs/promises';
import { ResourceService } from '../services/resourceService.js';
import { toFolderDto, toResourceDto } from '../utils/dtos.js';
import { createFolderSchema, createResourceSchema } from '../utils/schemas.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateFileContent, sanitizeSvg, reprocessImage, validateImageDimensions } from '../utils/security.js';
import { uploadsDir } from '../utils/upload.js';
export const getFolders = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const folders = await ResourceService.getFolders(userId);
    res.json({ folders: folders.map(toFolderDto) });
});
export const createFolder = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const result = createFolderSchema.safeParse(req.body);
    if (!result.success)
        throw new BadRequestError(result.error.issues[0].message);
    const folder = await ResourceService.createFolder(userId, result.data.name);
    res.status(201).json({ folder: toFolderDto(folder) });
});
export const deleteFolder = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const id = String(req.params.id);
    await ResourceService.deleteFolder(userId, id);
    res.json({ ok: true });
});
export const getResources = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const folderId = req.query.folderId ? String(req.query.folderId) : undefined;
    const resources = await ResourceService.getResources(userId, folderId);
    res.json({ resources: resources.map(toResourceDto) });
});
// Resource limit validation moved to ResourceService.validateUserLimits
/**
 * Handles security validation and processing for uploaded files.
 */
async function processUploadedFile(file) {
    const { ext, mime } = await validateFileContent(file.path);
    await validateImageDimensions(file.path, mime);
    if (mime === 'image/svg+xml')
        await sanitizeSvg(file.path);
    if (['image/jpeg', 'image/png', 'image/webp'].includes(mime))
        await reprocessImage(file.path, ext);
    let finalPath = file.path;
    let finalFilename = file.filename;
    if (path.extname(file.filename) !== ext) {
        finalFilename = `${file.filename}${ext}`;
        finalPath = path.join(path.dirname(file.path), finalFilename);
        await fs.rename(file.path, finalPath);
    }
    return {
        fileName: file.originalname,
        fileType: mime,
        fileUrl: `/uploads/${finalFilename}`,
        filePath: finalPath
    };
}
export const createResource = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const result = createResourceSchema.safeParse(req.body);
    if (!result.success)
        throw new BadRequestError(result.error.issues[0].message);
    const { type, title, url, tags, notes, completed, folderId: rawFolderId } = result.data;
    const folderId = rawFolderId && rawFolderId !== 'general' ? rawFolderId : null;
    await ResourceService.validateUserLimits(userId, type);
    let fileData = { fileName: null, fileType: null, fileUrl: null };
    if (type === 'file') {
        if (!req.file)
            throw new BadRequestError('File is required for type=file');
        try {
            const processed = await processUploadedFile(req.file);
            fileData = { fileName: processed.fileName, fileType: processed.fileType, fileUrl: processed.fileUrl };
        }
        catch (error) {
            if (req.file.path)
                await fs.unlink(req.file.path).catch(() => { });
            throw error;
        }
    }
    const resource = await ResourceService.createResource(userId, {
        type, title, url, ...fileData,
        tags: tags || [],
        notes: notes || '',
        completed: completed || false,
        folderId,
    });
    res.status(201).json({ resource: toResourceDto(resource) });
});
export const updateResource = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const id = String(req.params.id);
    const data = {};
    if (typeof req.body?.completed === 'boolean')
        data.completed = req.body.completed;
    if (typeof req.body?.folderId === 'string' || req.body?.folderId === null) {
        data.folderId = req.body.folderId;
    }
    if (typeof req.body?.notes === 'string')
        data.notes = req.body.notes;
    if (Array.isArray(req.body?.tags))
        data.tags = req.body.tags.map(String);
    const resource = await ResourceService.updateResource(userId, id, data);
    res.json({ resource: toResourceDto(resource) });
});
export const deleteResource = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const id = String(req.params.id);
    await ResourceService.deleteResource(userId, id);
    res.json({ ok: true });
});
export const downloadResource = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const id = String(req.params.id);
    const resource = await ResourceService.getResourceById(userId, id);
    if (!resource || !resource.fileUrl) {
        throw new NotFoundError('Resource not found or has no file');
    }
    const fileName = path.basename(resource.fileUrl);
    const filePath = path.resolve(uploadsDir, fileName);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(resource.fileName || fileName)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(filePath);
});
export const bootstrap = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { folders, resources } = await ResourceService.bootstrap(userId);
    res.json({
        folders: folders.map(toFolderDto),
        resources: resources.map(toResourceDto),
    });
});
