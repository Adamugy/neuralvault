import { Router } from 'express';
import * as PasskeyController from '../controllers/passkey.js';

const router = Router();

router.post('/passkey/registration-options', PasskeyController.registrationOptions);
router.post('/passkey/registration-verify', PasskeyController.registrationVerify);
router.post('/passkey/login-options', PasskeyController.loginOptions);
router.post('/passkey/login-verify', PasskeyController.loginVerify);

export default router;
