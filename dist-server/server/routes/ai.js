import { Router } from 'express';
import * as AiController from '../controllers/ai.js';
import { requireApiAuth } from '../middleware/auth.js';
import { upload } from '../utils/upload.js';
const router = Router();
router.get('/health', (req, res) => { res.json({ status: 'ok', service: 'ai' }); });
router.post('/chat', requireApiAuth, AiController.chat);
router.post('/analyze-image', requireApiAuth, upload.single('image'), AiController.analyzeImage);
export default router;
