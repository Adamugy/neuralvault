import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY || '');

async function verify() {
    console.log('--- Verification Started ---');

    // 1. Verify Prisma Column
    try {
        console.log('Testing User model access...');
        const userCount = await prisma.user.count();
        console.log(`✅ Prisma connection successful. User count: ${userCount}`);

        // Check if we can select 'name' explicitly
        const testUser = await prisma.user.findFirst({ select: { name: true } });
        console.log('✅ Column User.name is accessible.');
    } catch (error: any) {
        console.error('❌ Prisma Error:', error.message);
    }

    // 2. Verify Gemini 2.5 Model
    try {
        console.log('Testing Gemini 2.5 Flash connectivity...');
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent('Hello, are you gemini-2.5-flash? Reply with YES or NO.');
        const response = await result.response;
        console.log(`✅ Gemini Response: ${response.text().trim()}`);
    } catch (error: any) {
        console.error('❌ Gemini Error:', error.message);
    }

    await prisma.$disconnect();
    console.log('--- Verification Complete ---');
}

verify();
