import { Router } from 'express';
import * as AuthController from '../controllers/auth.js';
import { requireApiAuth } from '../middleware/auth.js';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import * as PasskeyController from '../controllers/passkey.js';
import * as PrivacyController from '../controllers/privacy.js';

const router = Router();
// Avatars are capped at 1MB while streaming, so a huge upload never sits whole in memory
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024 } });

// Login, 2FA and token endpoints: 10 failed attempts per IP per 15 min (successes don't count),
// on top of the global API limit, to slow password and 2FA-code guessing.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    skipSuccessfulRequests: true,
    message: { error: 'TooManyAttempts', message: 'Demasiadas tentativas. Tente novamente daqui a 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
});

// Public routes
router.post('/signup', authLimiter, AuthController.signup);
router.post('/signin', authLimiter, AuthController.signin);
router.post('/verify-email', authLimiter, AuthController.verifyEmail);
router.post('/resend-verification', authLimiter, AuthController.resendVerification);
router.post('/forgot-password', authLimiter, AuthController.forgotPassword);
router.post('/reset-password', authLimiter, AuthController.resetPassword);

// Protected routes
// No requireApiAuth: signing out must also clear a cookie whose session is already gone
router.post('/signout', AuthController.signout);
router.get('/me', requireApiAuth, AuthController.getMe);
router.patch('/me', requireApiAuth, AuthController.updateMe);
// Privacy: consents, data export and account deletion (RGPD arts. 7, 15, 17, 20)
router.get('/consents', requireApiAuth, PrivacyController.getConsents);
router.post('/consents', requireApiAuth, PrivacyController.updateConsent);
router.get('/me/export', requireApiAuth, PrivacyController.exportMyData);
router.delete('/me', requireApiAuth, PrivacyController.deleteMyAccount);
router.post('/avatar', requireApiAuth, upload.single('avatar'), AuthController.uploadAvatar);

// 2FA routes
router.post('/2fa/generate', requireApiAuth, AuthController.generate2FA);
router.post('/2fa/enable', requireApiAuth, AuthController.enable2FA);
router.post('/2fa/disable', requireApiAuth, AuthController.disable2FA);
router.post('/2fa/verify', authLimiter, AuthController.verify2FA);

// Passkey routes
router.post('/passkey/registration-options', requireApiAuth, PasskeyController.registrationOptions);
router.post('/passkey/registration-verify', requireApiAuth, PasskeyController.registrationVerify);
router.post('/passkey/login-options', PasskeyController.loginOptions);
router.post('/passkey/login-verify', authLimiter, PasskeyController.loginVerify);

export default router;

