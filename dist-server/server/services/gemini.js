import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
export const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY || '' });
export const fileToGenerativePart = (path, mimeType) => {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(path)).toString("base64"),
            mimeType
        },
    };
};
