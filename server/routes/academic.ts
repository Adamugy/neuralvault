import { Router } from 'express';
import * as AcademicController from '../controllers/academic.js';
import { requireApiAuth } from '../middleware/auth.js';
import { upload } from '../utils/upload.js';
import { requireAiConsent } from '../controllers/privacy.js';
import { aiLimits } from '../middleware/aiQuota.js';

const router = Router();

router.post('/generate', requireApiAuth, requireAiConsent, ...aiLimits, upload.array('files', 5), AcademicController.generate);
router.post('/export-pdf', requireApiAuth, AcademicController.exportPdf);
router.post('/export-docx', requireApiAuth, AcademicController.exportDocx);
router.get('/history', requireApiAuth, AcademicController.getHistory);
router.get('/history/:id', requireApiAuth, AcademicController.getSessionMessages);
router.get('/gallery', requireApiAuth, AcademicController.getGallery);

export default router;
