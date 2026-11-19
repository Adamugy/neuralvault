import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from './prisma.js';

export interface ResourceUpdateProposal {
    resourceId: string;
    resourceTitle: string;
    changes: { folderId?: string | null; tags?: string[]; notes?: string; completed?: boolean };
    folderName?: string | null;
    reason: string;
}

const resourceSelect = { id: true, title: true, type: true, tags: true, folderId: true, completed: true, notes: true } as const;
const shorten = <T extends { notes: string }>(r: T) => ({ ...r, notes: r.notes.slice(0, 200) });

/**
 * Library tools for the AI Tutor agent. userId comes from the session, never from the model.
 * Reads run freely; the only write is a *proposal* the person must approve in the chat
 * (the card then calls PATCH /api/resources/:id). Deleting is not offered to the model.
 */
export function libraryTools(userId: string, onProposal: (p: ResourceUpdateProposal) => void) {
    return {
        list_folders: tool({
            description: 'Lista as pastas da biblioteca do utilizador, com o número de recursos em cada uma.',
            inputSchema: z.object({}),
            execute: async () => {
                const folders = await prisma.folder.findMany({
                    where: { userId },
                    select: { id: true, name: true, _count: { select: { resources: true } } },
                    orderBy: { name: 'asc' },
                });
                return folders.map(f => ({ id: f.id, name: f.name, resources: f._count.resources }));
            },
        }),
        list_resources: tool({
            description: 'Lista recursos da biblioteca. folderId opcional; null devolve os recursos sem pasta.',
            inputSchema: z.object({
                folderId: z.string().nullable().optional(),
                limit: z.number().int().min(1).max(50).optional(),
            }),
            execute: async ({ folderId, limit }) => {
                const rows = await prisma.resource.findMany({
                    where: { userId, ...(folderId !== undefined ? { folderId } : {}) },
                    select: resourceSelect,
                    orderBy: { createdAt: 'desc' },
                    take: limit ?? 30,
                });
                return rows.map(shorten);
            },
        }),
        search_resources: tool({
            description: 'Procura recursos por texto no título, nas notas ou numa etiqueta exata.',
            inputSchema: z.object({ query: z.string().min(1).max(100) }),
            execute: async ({ query }) => {
                const rows = await prisma.resource.findMany({
                    where: {
                        userId,
                        OR: [
                            { title: { contains: query, mode: 'insensitive' } },
                            { notes: { contains: query, mode: 'insensitive' } },
                            { tags: { has: query } },
                        ],
                    },
                    select: resourceSelect,
                    take: 20,
                });
                return rows.map(shorten);
            },
        }),
        get_library_stats: tool({
            description: 'Resumo da biblioteca: total de recursos, por tipo, concluídos e sem pasta.',
            inputSchema: z.object({}),
            execute: async () => {
                const [byType, completed, unfiled, folders] = await Promise.all([
                    prisma.resource.groupBy({ by: ['type'], where: { userId }, _count: { _all: true } }),
                    prisma.resource.count({ where: { userId, completed: true } }),
                    prisma.resource.count({ where: { userId, folderId: null } }),
                    prisma.folder.count({ where: { userId } }),
                ]);
                const total = byType.reduce((n, t) => n + t._count._all, 0);
                return { total, completed, unfiled, folders, byType: byType.map(t => ({ type: t.type, count: t._count._all })) };
            },
        }),
        propose_resource_update: tool({
            description:
                'Propõe uma alteração a um recurso (mover de pasta, etiquetas, notas ou marcar como concluído). ' +
                'NÃO altera nada: o utilizador vê um cartão e decide se aplica. Usa um id devolvido pelas outras ferramentas.',
            inputSchema: z.object({
                resourceId: z.string(),
                changes: z.object({
                    folderId: z.string().nullable().optional(),
                    tags: z.array(z.string().max(40)).max(20).optional(),
                    notes: z.string().max(5000).optional(),
                    completed: z.boolean().optional(),
                }),
                reason: z.string().max(300),
            }),
            execute: async ({ resourceId, changes, reason }) => {
                const resource = await prisma.resource.findFirst({ where: { id: resourceId, userId }, select: { id: true, title: true } });
                if (!resource) return { ok: false, error: 'Recurso não encontrado.' };
                let folderName: string | null | undefined;
                if (changes.folderId) {
                    const folder = await prisma.folder.findFirst({ where: { id: changes.folderId, userId }, select: { name: true } });
                    if (!folder) return { ok: false, error: 'Pasta não encontrada.' };
                    folderName = folder.name;
                } else if (changes.folderId === null) folderName = null;
                if (!Object.keys(changes).length) return { ok: false, error: 'Nenhuma alteração indicada.' };
                onProposal({ resourceId, resourceTitle: resource.title, changes, folderName, reason });
                return { ok: true, status: 'Proposta mostrada ao utilizador; aguarda aprovação.' };
            },
        }),
    };
}
