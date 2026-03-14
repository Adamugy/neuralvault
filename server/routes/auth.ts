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
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);

// Protected routes
router.post('/signout', requireApiAuth, AuthController.signout);
router.get('/me', requireApiAuth, AuthController.getMe);
router.patch('/me', requireApiAuth, AuthController.updateMe);
router.post('/avatar', requireApiAuth, upload.single('avatar'), AuthController.uploadAvatar);

// 2FA routes
router.post('/2fa/generate', requireApiAuth, AuthController.generate2FA);
router.post('/2fa/enable', requireApiAuth, AuthController.enable2FA);
router.post('/2fa/disable', requireApiAuth, AuthController.disable2FA);
router.post('/2fa/verify', AuthController.verify2FA);

export default router;

