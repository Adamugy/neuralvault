import { Router } from 'express';
import * as BillingController from '../controllers/billing.js';
import { requireApiAuth } from '../middleware/auth.js';
const router = Router();
// Webhook is handled in app.ts for custom path /webhook
router.post('/checkout', requireApiAuth, BillingController.checkout);
router.post('/portal', requireApiAuth, BillingController.portal);
export default router;
