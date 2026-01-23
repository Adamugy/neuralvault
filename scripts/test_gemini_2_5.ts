
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testModel() {
    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('No API KEY found');
        process.exit(1);
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    try {
        console.log('Testing gemini-2.5-flash...');
        const result = await model.generateContent('Explain quantum computing in one sentence.');
        const response = await result.response;
        console.log('Success:', response.text());
    } catch (err) {
        console.error('Error with gemini-2.5-flash:', err);
    }
}

testModel();
