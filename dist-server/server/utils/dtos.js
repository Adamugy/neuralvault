export const toFolderDto = (folder) => ({
    id: folder.id,
    name: folder.name,
});
export const toResourceDto = (resource) => ({
    id: resource.id,
    type: resource.type,
    title: resource.title,
    url: (resource.type === 'file' ? resource.fileUrl : resource.url) || undefined,
    fileName: resource.fileName || undefined,
    fileType: resource.fileType || undefined,
    fileUrl: resource.fileUrl || undefined,
    folderId: resource.folderId || undefined,
    tags: resource.tags || [],
    notes: resource.notes || '',
    dateAdded: resource.dateAdded ? new Date(resource.dateAdded).getTime() : Date.now(),
    completed: Boolean(resource.completed),
});
