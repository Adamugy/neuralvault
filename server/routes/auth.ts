import { Router } from 'express';
import * as AuthController from '../controllers/auth.js';
import { requireApiAuth } from '../middlewares/auth.js';

const router = Router();

router.get('/me', requireApiAuth, AuthController.getMe);

export default router;
