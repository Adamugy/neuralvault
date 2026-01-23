import { env } from './utils/env.js';
import app from './app.js';
import { checkDatabaseConnection } from './services/prisma.js';

const startServer = async () => {
    console.log(`[Config] NodeEnv: ${env.NODE_ENV}, Port: ${env.PORT}`);

    // Check DB connection before starting
    const isDbConnected = await checkDatabaseConnection();
    if (!isDbConnected && env.NODE_ENV === 'production') {
        console.error('❌ Critical: Database connection failed in production. Exiting.');
        process.exit(1);
    }

    if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
        app.listen(env.PORT, () => {
            console.log(`🚀 Servidor rodando em http://localhost:${env.PORT}`);
            console.log(`🌍 Ambiente: ${env.NODE_ENV}`);
        });
    }
};

startServer();

export default app;
