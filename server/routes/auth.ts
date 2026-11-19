import { Router } from 'express';
import * as AuthController from '../controllers/auth.js';
import { requireApiAuth } from '../middleware/auth.js';
import multer from 'multer';
import * as PasskeyController from '../controllers/passkey.js';
import * as PrivacyController from '../controllers/privacy.js';

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
router.post('/2fa/verify', AuthController.verify2FA);

// Passkey routes
router.post('/passkey/registration-options', requireApiAuth, PasskeyController.registrationOptions);
router.post('/passkey/registration-verify', requireApiAuth, PasskeyController.registrationVerify);
router.post('/passkey/login-options', PasskeyController.loginOptions);
router.post('/passkey/login-verify', PasskeyController.loginVerify);

export default router;

