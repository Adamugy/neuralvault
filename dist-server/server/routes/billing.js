import express, { Router } from 'express';
import * as BillingController from '../controllers/billing.js';
import { requireApiAuth } from '../middlewares/auth.js';
const router = Router();
// Webhook needs raw body, no auth
router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), BillingController.webhook);
router.post('/checkout', requireApiAuth, BillingController.checkout);
router.post('/portal', requireApiAuth, BillingController.portal);
export default router;
