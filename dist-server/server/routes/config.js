import { Router } from 'express';
import * as ConfigController from '../controllers/config.js';
const router = Router();
router.get('/health', ConfigController.getHealth);
router.get('/config', ConfigController.getConfig);
export default router;
