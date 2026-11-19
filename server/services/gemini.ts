import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import { env } from '../utils/env.js';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY || '');

export const ai = genAI;

// Give up on a stuck Gemini call instead of leaving the request hanging forever.
// Long generations (documents, image analysis) legitimately take a while.
export const AI_REQUEST_OPTIONS = { timeout: 120_000 };
/** Gemini model for chat, image analysis and academic generation (gemini-2.5-flash shuts down 2026-12-01). */
export const GEMINI_MODEL = 'gemini-4-hydrogen';

export const fileToGenerativePart = (path: string, mimeType: string) => {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(path)).toString("base64"),
            mimeType
        },
    };
};
