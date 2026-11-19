import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';

// The model is mocked: these tests cover how the chat controller streams, not the model.
const { streamText, getChatModel } = vi.hoisted(() => ({
    streamText: vi.fn(),
    getChatModel: vi.fn((id?: string) => ({ id: id ?? 'gemini-4-hydrogen', label: 'Gemini', model: {} })),
}));

vi.mock('ai', async (importOriginal) => ({ ...(await importOriginal<typeof import('ai')>()), streamText }));
vi.mock('../services/llm.js', () => ({ getChatModel, availableModels: () => [] }));
// The tools hand their proposal callback back so a test can fire it like the model would
vi.mock('../services/libraryTools.js', () => ({
    libraryTools: (userId: string, onProposal: (p: unknown) => void) => ({ userId, onProposal }),
}));
vi.mock('../utils/env.js', () => ({ env: { AI_DAILY_LIMIT: 100 } }));
vi.mock('../services/gemini.js', () => ({
    ai: {}, fileToGenerativePart: vi.fn(), AI_REQUEST_OPTIONS: { timeout: 120_000 },
}));

import { chat } from './ai.js';

function fakeRes() {
    const res: any = new EventEmitter();
    res.headers = {} as Record<string, string>;
    res.chunks = [] as string[];
    res.writableEnded = false;
    res.destroyed = false;
    res.setHeader = (k: string, v: string) => { res.headers[k.toLowerCase()] = v; };
    res.flushHeaders = vi.fn();
    res.write = (c: string) => { res.chunks.push(c); return true; };
    res.end = () => { res.writableEnded = true; };
    res.destroy = () => { res.destroyed = true; };
    res.json = vi.fn();
    return res;
}

const deltas = (parts: string[], failAfter?: number) => async function* () {
    for (let i = 0; i < parts.length; i++) {
        if (failAfter !== undefined && i === failAfter) throw new Error('upstream dropped');
        yield { type: 'text-delta', id: 't', text: parts[i] };
    }
};
const events = (res: any) => res.chunks.map((c: string) => JSON.parse(c));

// asyncHandler does not return the promise, so give the handler a tick to finish
const run = async (body: any, res: any) => {
    const next = vi.fn();
    (chat as any)({ body, userId: 'u1' }, res, next);
    await new Promise(resolve => setTimeout(resolve, 20));
    return next;
};

describe('chat controller', () => {
    beforeEach(() => {
        streamText.mockReset();
        getChatModel.mockClear();
    });

    it('answers with JSON when streaming is not requested (older clients)', async () => {
        streamText.mockReturnValue({ fullStream: deltas(['hel', 'lo'])() });
        const res = fakeRes();
        await run({ message: 'hi' }, res);

        expect(res.json).toHaveBeenCalledWith({ text: 'hello', proposals: [], model: 'gemini-4-hydrogen' });
        expect(res.chunks).toEqual([]);
    });

    it('uses the requested model, a timeout, a step limit and the session user for tools', async () => {
        streamText.mockReturnValue({ fullStream: deltas(['ok'])() });
        await run({ message: 'hi', model: 'claude-sonnet-5-5', history: [{ role: 'assistant', content: 'a' }, { role: 'x', content: '' }] }, fakeRes());

        expect(getChatModel).toHaveBeenCalledWith('claude-sonnet-5-5');
        const opts = streamText.mock.calls[0][0];
        expect(opts.timeout).toBe(120_000);
        expect(opts.stopWhen).toBeDefined();
        expect(opts.tools.userId).toBe('u1');
        expect(opts.messages).toEqual([{ role: 'assistant', content: 'a' }, { role: 'user', content: 'hi' }]);
    });

    it('streams the answer as NDJSON text events', async () => {
        streamText.mockReturnValue({ fullStream: deltas(['Olá', ', ', 'mundo'])() });
        const res = fakeRes();
        await run({ message: 'hi', stream: true }, res);

        expect(res.headers['content-type']).toContain('application/x-ndjson');
        expect(res.headers['cache-control']).toContain('no-transform');
        expect(events(res)).toEqual([
            { type: 'text', text: 'Olá' }, { type: 'text', text: ', ' }, { type: 'text', text: 'mundo' },
        ]);
        expect(res.writableEnded).toBe(true);
        expect(res.json).not.toHaveBeenCalled();
    });

    it('sends tool proposals to the client as their own events', async () => {
        const proposal = { resourceId: 'r1', resourceTitle: 'Paper', changes: { tags: ['nlp'] }, reason: 'tema' };
        streamText.mockImplementation((opts: any) => ({
            fullStream: (async function* () {
                opts.tools.onProposal(proposal);
                yield { type: 'text-delta', id: 't', text: 'Proposta pronta.' };
            })(),
        }));
        const res = fakeRes();
        await run({ message: 'organiza', stream: true }, res);

        expect(events(res)).toEqual([{ type: 'proposal', proposal }, { type: 'text', text: 'Proposta pronta.' }]);
    });

    it('drops the connection if the model fails mid-answer', async () => {
        streamText.mockReturnValue({ fullStream: deltas(['partial', 'never'], 1)() });
        const res = fakeRes();
        vi.spyOn(console, 'error').mockImplementation(() => {});
        await run({ message: 'hi', stream: true }, res);

        expect(events(res)).toEqual([{ type: 'text', text: 'partial' }]);
        expect(res.destroyed).toBe(true);
        expect(res.writableEnded).toBe(false);
    });

    it('stops reading from the model when the client disconnects', async () => {
        const res = fakeRes();
        streamText.mockImplementation(() => ({
            fullStream: (async function* () {
                yield { type: 'text-delta', id: 't', text: 'one' };
                res.emit('close'); // user pressed Stop / closed the tab
                yield { type: 'text-delta', id: 't', text: 'two' };
            })(),
        }));
        await run({ message: 'hi', stream: true }, res);

        expect(events(res)).toEqual([{ type: 'text', text: 'one' }]);
        expect(streamText.mock.calls[0][0].abortSignal.aborted).toBe(true);
    });

    it('reports failures before the first byte through the error handler', async () => {
        streamText.mockReturnValue({
            fullStream: (async function* () { yield { type: 'error', error: new Error('quota') }; })(),
        });
        const res = fakeRes();
        const next = await run({ message: 'hi', stream: true }, res);

        expect(next).toHaveBeenCalled();
        expect(res.chunks).toEqual([]);
    });

    it('rejects an empty message', async () => {
        const next = await run({ message: '   ' }, fakeRes());
        expect(next.mock.calls[0][0].message).toBe('Missing message');
        expect(streamText).not.toHaveBeenCalled();
    });
});
