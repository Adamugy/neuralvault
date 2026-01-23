import Stripe from 'stripe';
import { env } from '../utils/env.js';
const stripeSecretKey = env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
    console.warn('[Stripe] Warning: STRIPE_SECRET_KEY is missing');
}
export const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;
export const STRIPE_PRICE_RESEARCHER = env.STRIPE_PRICE_RESEARCHER || '';
export const STRIPE_PRICE_RESEARCHER_PRO = env.STRIPE_PRICE_RESEARCHER_PRO || '';
export const getPlanFromPriceId = (priceId) => {
    if (priceId && priceId === STRIPE_PRICE_RESEARCHER_PRO)
        return 'researcher_pro';
    if (priceId && priceId === STRIPE_PRICE_RESEARCHER)
        return 'researcher';
    return 'free';
};
