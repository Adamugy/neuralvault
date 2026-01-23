import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Database Connection Test ---');
    try {
        console.log('Attempting to connect...');
        // Simple query to check connection
        const result = await prisma.$queryRaw`SELECT 1 as connected`;
        console.log('Successfully connected to the database!');
        console.log('Result:', result);

        const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
        console.log('Tables in public schema:', tables);

    } catch (error) {
        console.error('Failed to connect to the database.');
        if (error instanceof Error) {
            console.error('Error Message:', error.message);
            console.error('Error Stack:', error.stack);
            console.error('Error Object:', JSON.stringify(error, null, 2));
        } else {
            console.error('Unknown Error:', error);
        }
    } finally {
        await prisma.$disconnect();
        console.log('--- Test Complete ---');
    }
}

main();
