import { Router } from 'express';
import * as AcademicController from '../controllers/academic.js';
import { requireApiAuth } from '../middlewares/auth.js';
import { upload } from '../utils/upload.js';
const router = Router();
router.post('/generate', requireApiAuth, upload.array('files', 5), AcademicController.generate);
export default router;
