import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'url';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/test/setup.ts'],
    },
    define: {
        'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify('test-api-key'),
        'import.meta.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify('test-clerk-key'),
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
});
