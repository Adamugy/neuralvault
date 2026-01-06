import dotenv from 'dotenv';
import app from './app.js';

dotenv.config({ path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local' });
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
console.log(`[Config] NodeEnv: ${process.env.NODE_ENV}, AppURL: ${process.env.APP_URL}`);
const port = Number(process.env.PORT || (isProduction ? 3000 : 3001));

const startServer = async () => {
    if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
        app.listen(port, () => {
            console.log(`Servidor rodando em http://localhost:${port}`);
            console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
        });
    }
};

startServer();

export default app;
