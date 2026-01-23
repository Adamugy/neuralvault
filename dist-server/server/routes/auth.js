import { Router } from 'express';
import * as AuthController from '../controllers/auth.js';
import { requireApiAuth } from '../middleware/auth.js';
const router = Router();
// Public routes
router.post('/signup', AuthController.signup);
router.post('/signin', AuthController.signin);
// Protected routes
router.post('/signout', requireApiAuth, AuthController.signout);
router.get('/me', requireApiAuth, AuthController.getMe);
router.patch('/me', requireApiAuth, AuthController.updateMe);
export default router;
