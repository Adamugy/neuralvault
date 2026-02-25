import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load production environment variables early
if (process.env.NODE_ENV === 'production') {
    dotenv.config({ path: path.join(process.cwd(), '.env.production') });
} else {
    dotenv.config();
}

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('3001').transform(Number),
    DATABASE_URL: z.string().min(1),
    DIRECT_DATABASE_URL: z.string().min(1).optional(),
    // JWT Configuration
    JWT_SECRET: z.string().min(32),
    JWT_EXPIRES_IN: z.string().default('7d'),
    // AI Configuration
    GEMINI_API_KEY: z.string().min(1).optional(),
    // Other
    CORS_ORIGIN: z.string().optional(),
    APP_URL: z.string().url().optional(),
    DOMAIN: z.string().optional().default('localhost'),
    RESEND_API_KEY: z.string().optional(),
    PASSKEY_RP_ID: z.string().optional(),
    PASSKEY_ORIGIN: z.string().optional(),
    SESSION_IDLE_TIMEOUT: z.string().default('30m'),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.flatten().fieldErrors);
    process.exit(1);
}

export const env = result.data;
