import { Router } from 'express';
import * as AiController from '../controllers/ai.js';
import { requireApiAuth } from '../middleware/auth.js';
import { upload } from '../utils/upload.js';
import { requireAiConsent } from '../controllers/privacy.js';
import { aiLimits } from '../middleware/aiQuota.js';

const router = Router();


router.get('/health', (req, res) => { res.json({ status: 'ok', service: 'ai' }); });
router.get('/models', requireApiAuth, AiController.listModels);
router.post('/chat', requireApiAuth, requireAiConsent, ...aiLimits, AiController.chat);
router.post('/analyze-image', requireApiAuth, requireAiConsent, ...aiLimits, upload.single('image'), AiController.analyzeImage);

export default router;
