import Stripe from 'stripe';
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
    console.warn('[Stripe] Warning: STRIPE_SECRET_KEY is missing');
}
export const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;
export const STRIPE_PRICE_RESEARCHER = process.env.STRIPE_PRICE_RESEARCHER || '';
export const STRIPE_PRICE_RESEARCHER_PRO = process.env.STRIPE_PRICE_RESEARCHER_PRO || '';
export const getPlanFromPriceId = (priceId) => {
    if (priceId && priceId === STRIPE_PRICE_RESEARCHER_PRO)
        return 'researcher_pro';
    if (priceId && priceId === STRIPE_PRICE_RESEARCHER)
        return 'researcher';
    return 'free';
};
