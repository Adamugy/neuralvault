import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import { env } from '../utils/env.js';
const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY || '');
export const ai = genAI;
export const fileToGenerativePart = (path, mimeType) => {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(path)).toString("base64"),
            mimeType
        },
    };
};
