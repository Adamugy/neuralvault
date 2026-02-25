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
            console.log(`🚀 Servidor rodando em ambiente: ${env.NODE_ENV}`);
            console.log(`📡 Porta: ${env.PORT}`);
            if (env.APP_URL)
                console.log(`🌍 App URL: ${env.APP_URL}`);
        });
    }
};
startServer();
export default app;
