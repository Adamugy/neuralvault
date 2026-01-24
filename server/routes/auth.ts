import { Router } from 'express';
import * as AuthController from '../controllers/auth.js';
import { requireApiAuth } from '../middleware/auth.js';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Public routes
router.post('/signup', AuthController.signup);
router.post('/signin', AuthController.signin);
router.post('/verify-email', AuthController.verifyEmail);
router.post('/resend-verification', AuthController.resendVerification);

// Protected routes
router.post('/signout', requireApiAuth, AuthController.signout);
router.get('/me', requireApiAuth, AuthController.getMe);
router.patch('/me', requireApiAuth, AuthController.updateMe);
router.post('/avatar', requireApiAuth, upload.single('avatar'), AuthController.uploadAvatar);

export default router;

