import { Resource, Folder } from '@prisma/client';

export const toFolderDto = (folder: Folder) => ({
    id: folder.id,
    name: folder.name,
});

export const toResourceDto = (resource: Resource) => ({
    id: resource.id,
    type: resource.type,
    title: resource.title,
    url: (resource.type === 'file' ? `/api/resources/${resource.id}/file` : resource.url) || undefined,
    fileName: resource.fileName || undefined,
    fileType: resource.fileType || undefined,
    fileUrl: (resource.type === 'file' ? `/api/resources/${resource.id}/file` : resource.fileUrl) || undefined,
    folderId: resource.folderId || undefined,
    tags: resource.tags || [],
    notes: resource.notes || '',
    dateAdded: resource.dateAdded ? new Date(resource.dateAdded).getTime() : Date.now(),
    completed: Boolean(resource.completed),
});
