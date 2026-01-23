
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from 'process';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function listModels() {
    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('No API KEY found in .env.local');
        process.exit(1);
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        console.log('Available Models:');
        if (data.models) {
            data.models.forEach((m: any) => {
                if (m.name.includes('gemini')) {
                    console.log(`- ${m.name}`);
                }
            });
        } else {
            console.log('No models found or error structure:', data);
        }

    } catch (err) {
        console.error('Error listing models:', err);
    }
}

listModels();
