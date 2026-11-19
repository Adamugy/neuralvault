import { describe, it, expect, vi, beforeEach } from 'vitest';

const { resourceFindFirst, folderFindFirst } = vi.hoisted(() => ({ resourceFindFirst: vi.fn(), folderFindFirst: vi.fn() }));
vi.mock('./prisma.js', () => ({
    prisma: { resource: { findFirst: resourceFindFirst }, folder: { findFirst: folderFindFirst } },
}));

import { libraryTools } from './libraryTools.js';

const propose = (input: any, onProposal = vi.fn()) =>
    (libraryTools('u1', onProposal).propose_resource_update as any).execute(input, {});

describe('propose_resource_update', () => {
    beforeEach(() => { resourceFindFirst.mockReset(); folderFindFirst.mockReset(); });

    it('only looks up resources and folders of the session user', async () => {
        resourceFindFirst.mockResolvedValue({ id: 'r1', title: 'Paper' });
        folderFindFirst.mockResolvedValue({ name: 'NLP' });
        const onProposal = vi.fn();
        const out = await propose({ resourceId: 'r1', changes: { folderId: 'f1' }, reason: 'tema' }, onProposal);

        expect(resourceFindFirst.mock.calls[0][0].where).toEqual({ id: 'r1', userId: 'u1' });
        expect(folderFindFirst.mock.calls[0][0].where).toEqual({ id: 'f1', userId: 'u1' });
        expect(out.ok).toBe(true);
        expect(onProposal).toHaveBeenCalledWith({
            resourceId: 'r1', resourceTitle: 'Paper', changes: { folderId: 'f1' }, folderName: 'NLP', reason: 'tema',
        });
    });

    it('does not propose changes to another person\'s resource', async () => {
        resourceFindFirst.mockResolvedValue(null);
        const onProposal = vi.fn();
        const out = await propose({ resourceId: 'theirs', changes: { tags: ['x'] }, reason: '' }, onProposal);

        expect(out.ok).toBe(false);
        expect(onProposal).not.toHaveBeenCalled();
    });

    it('does not move a resource into another person\'s folder', async () => {
        resourceFindFirst.mockResolvedValue({ id: 'r1', title: 'Paper' });
        folderFindFirst.mockResolvedValue(null);
        const onProposal = vi.fn();
        const out = await propose({ resourceId: 'r1', changes: { folderId: 'theirs' }, reason: '' }, onProposal);

        expect(out.ok).toBe(false);
        expect(onProposal).not.toHaveBeenCalled();
    });

    it('never writes: the tool set has no update or delete tool', () => {
        expect(Object.keys(libraryTools('u1', vi.fn())).sort()).toEqual(
            ['get_library_stats', 'list_folders', 'list_resources', 'propose_resource_update', 'search_resources'],
        );
    });
});
