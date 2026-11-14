import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';

// Gemini is mocked: these tests cover how the chat controller streams, not the model.
const { sendMessage, sendMessageStream, getGenerativeModel } = vi.hoisted(() => {
    const sendMessage = vi.fn();
    const sendMessageStream = vi.fn();
    const getGenerativeModel = vi.fn((..._args: any[]) => ({
        startChat: () => ({ sendMessage, sendMessageStream }),
    }));
    return { sendMessage, sendMessageStream, getGenerativeModel };
});

vi.mock('../services/gemini.js', () => ({
    ai: { getGenerativeModel },
    fileToGenerativePart: vi.fn(),
    AI_REQUEST_OPTIONS: { timeout: 120_000 },
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

async function* chunks(parts: string[], failAfter?: number) {
    for (let i = 0; i < parts.length; i++) {
        if (failAfter !== undefined && i === failAfter) throw new Error('upstream dropped');
        yield { text: () => parts[i] };
    }
}

// asyncHandler does not return the promise, so give the handler a tick to finish
const run = async (body: any, res: any) => {
    const next = vi.fn();
    (chat as any)({ body, userId: 'u1' }, res, next);
    await new Promise(resolve => setTimeout(resolve, 20));
    return next;
};

describe('chat controller', () => {
    beforeEach(() => {
        sendMessage.mockReset();
        sendMessageStream.mockReset();
        getGenerativeModel.mockClear();
    });

    it('answers with JSON when streaming is not requested (older clients)', async () => {
        sendMessage.mockResolvedValue({ response: { text: () => 'hello' } });
        const res = fakeRes();
        await run({ message: 'hi' }, res);

        expect(res.json).toHaveBeenCalledWith({ text: 'hello' });
        expect(sendMessageStream).not.toHaveBeenCalled();
    });

    it('applies a request timeout to the model', async () => {
        sendMessage.mockResolvedValue({ response: { text: () => 'ok' } });
        await run({ message: 'hi' }, fakeRes());

        expect(getGenerativeModel.mock.calls[0][1]).toEqual({ timeout: 120_000 });
    });

    it('streams the answer chunk by chunk as plain text', async () => {
        sendMessageStream.mockResolvedValue({ stream: chunks(['Olá', ', ', 'mundo']) });
        const res = fakeRes();
        await run({ message: 'hi', stream: true }, res);

        expect(res.headers['content-type']).toContain('text/plain');
        expect(res.headers['cache-control']).toContain('no-transform');
        expect(res.chunks).toEqual(['Olá', ', ', 'mundo']);
        expect(res.writableEnded).toBe(true);
        expect(res.json).not.toHaveBeenCalled();
    });

    it('drops the connection if the model fails mid-answer', async () => {
        sendMessageStream.mockResolvedValue({ stream: chunks(['partial', 'never'], 1) });
        const res = fakeRes();
        vi.spyOn(console, 'error').mockImplementation(() => {});
        await run({ message: 'hi', stream: true }, res);

        expect(res.chunks).toEqual(['partial']);
        expect(res.destroyed).toBe(true);
        expect(res.writableEnded).toBe(false);
    });

    it('stops reading from the model when the client disconnects', async () => {
        const res = fakeRes();
        async function* slow() {
            yield { text: () => 'one' };
            res.emit('close'); // user pressed Stop / closed the tab
            yield { text: () => 'two' };
        }
        sendMessageStream.mockResolvedValue({ stream: slow() });
        await run({ message: 'hi', stream: true }, res);

        expect(res.chunks).toEqual(['one']);
        expect(sendMessageStream.mock.calls[0][1].signal.aborted).toBe(true);
    });

    it('reports failures before the first byte through the error handler', async () => {
        sendMessageStream.mockRejectedValue(new Error('quota'));
        const res = fakeRes();
        const next = await run({ message: 'hi', stream: true }, res);

        expect(next).toHaveBeenCalled();
        expect(res.chunks).toEqual([]);
    });
});
