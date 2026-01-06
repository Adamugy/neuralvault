import { z } from 'zod';

export const createFolderSchema = z.object({
    name: z.string().min(1, 'Folder name is required').trim(),
});

export const createResourceSchema = z.object({
    type: z.enum(['link', 'file']),
    title: z.string().min(1, 'Title is required').trim(),
    folderId: z.string().optional().nullable(),
    tags: z.union([z.array(z.string()), z.string()]).transform(val => {
        if (Array.isArray(val)) return val;
        try {
            return JSON.parse(val as string);
        } catch {
            return [];
        }
    }).optional(),
    notes: z.string().optional(),
    completed: z.union([z.boolean(), z.string()]).transform(val => String(val) === 'true').optional(),
    url: z.string().url('Invalid URL').optional().nullable(),
}).refine(data => {
    if (data.type === 'link' && !data.url) return false;
    return true;
}, { message: 'URL is required for type=link' });
