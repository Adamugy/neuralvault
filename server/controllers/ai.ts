import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { ai, fileToGenerativePart } from '../services/gemini.js';
import { BadRequestError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateFileContent, sanitizeSvg, reprocessImage, validateImageDimensions } from '../utils/security.js';

export const chat = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId; // From JWT auth middleware
    const { message, history } = req.body;

    if (!message) {
        throw new BadRequestError('Missing message');
    }

    const model = ai.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: "You are an expert AI Assistant specialized in Deep Learning and Artificial Intelligence. You help students organize their knowledge, understand complex papers, and debug code. Be concise, accurate, and helpful. If the user speaks Portuguese, reply in Portuguese. If they speak English, reply in English.",
    });

    const chatSession = model.startChat({
        history: (history || []).map((h: any) => ({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.content }]
        }))
    });

    const result = await chatSession.sendMessage(message);
    const response = await result.response;
    res.json({ text: response.text() });
});

export const analyzeImage = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId; // From JWT auth middleware
    const { prompt } = req.body;
    const file = req.file as Express.Multer.File;

    if (!file) {
        throw new BadRequestError('Missing image file');
    }

    try {
        const { ext, mime } = await validateFileContent(file.path);

        // Resource Limits: Dimension check
        await validateImageDimensions(file.path, mime);

        if (mime === 'image/svg+xml') await sanitizeSvg(file.path);
        if (['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
            await reprocessImage(file.path, ext);
        }

        const currentExt = path.extname(file.filename);
        if (currentExt !== ext) {
            const newFilename = `${file.filename}${ext}`;
            const newPath = path.join(path.dirname(file.path), newFilename);
            await fs.rename(file.path, newPath);
            file.path = newPath;
            file.filename = newFilename;
        }
        file.mimetype = mime;

        const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const imagePart = fileToGenerativePart(file.path, file.mimetype);

        const result = await model.generateContent([
            prompt || "Analyze this image in the context of deep learning study.",
            imagePart
        ]);
        const response = await result.response;

        res.json({ text: response.text() });
    } catch (error) {
        if (!(error instanceof BadRequestError)) {
            console.error('[Analyze Image Error]', error);
        }
        throw error;
    } finally {
        // Hard Invariant: All transient files must be cleaned up from the uploads directory
        if (file && file.path) {
            await fs.unlink(file.path).catch((err) => {
                console.error(`[AI Cleanup] Failed to unlink ${file.path}:`, err.message);
            });
        }
    }
});
