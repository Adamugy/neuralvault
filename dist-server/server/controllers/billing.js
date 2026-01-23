import { stripe, STRIPE_PRICE_RESEARCHER, STRIPE_PRICE_RESEARCHER_PRO, getPlanFromPriceId } from '../services/stripe.js';
import { UserService } from '../services/userService.js';
import { env } from '../utils/env.js';
import { BadRequestError, InternalServerError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
export const checkout = asyncHandler(async (req, res) => {
    if (!stripe)
        throw new InternalServerError('Stripe is not configured');
    const userId = req.userId;
    const plan = String(req.body?.plan || '').trim();
    if (plan !== 'researcher' && plan !== 'researcher_pro') {
        throw new BadRequestError('Invalid plan');
    }
    const priceId = plan === 'researcher_pro' ? STRIPE_PRICE_RESEARCHER_PRO : STRIPE_PRICE_RESEARCHER;
    if (!priceId) {
        throw new InternalServerError(`Missing Stripe price for plan=${plan}`);
    }
    const isProduction = env.NODE_ENV === 'production';
    const appUrl = env.APP_URL || (isProduction ? '' : 'http://localhost:3000');
    if (!appUrl)
        throw new InternalServerError('Missing APP_URL');
    const dbUser = await UserService.ensureUserExists(userId);
    if (dbUser.plan !== 'free' && dbUser.subscriptionStatus === 'active') {
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: dbUser.stripeCustomerId,
            return_url: `${appUrl}/dashboard`,
        });
        return res.json({ url: portalSession.url });
    }
    let customerId = dbUser.stripeCustomerId;
    if (!customerId) {
        const customer = await stripe.customers.create({
            metadata: { userId: userId },
        });
        customerId = customer.id;
        await UserService.updateSubscription(userId, { stripeCustomerId: customerId });
    }
    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        client_reference_id: userId,
        line_items: [{ price: priceId, quantity: 1 }],
        allow_promotion_codes: true,
        success_url: `${appUrl}/dashboard?billing=success`,
        cancel_url: `${appUrl}/dashboard?billing=cancelled`,
        metadata: { userId: userId, plan },
        subscription_data: { metadata: { userId: userId, plan } },
    });
    res.json({ url: session.url });
});
export const portal = asyncHandler(async (req, res) => {
    if (!stripe)
        throw new InternalServerError('Stripe is not configured');
    const userId = req.userId;
    const user = await UserService.ensureUserExists(userId);
    if (!user.stripeCustomerId)
        throw new BadRequestError('No Stripe customer found for this user');
    const isProduction = env.NODE_ENV === 'production';
    const appUrl = env.APP_URL || (isProduction ? '' : 'http://localhost:3000');
    if (!appUrl)
        throw new InternalServerError('Missing APP_URL');
    const portalSession = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${appUrl}/dashboard`,
    });
    res.json({ url: portalSession.url });
});
export const webhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = env.STRIPE_WEBHOOK_SECRET;
    if (!stripe || !endpointSecret || !sig) {
        console.error('[Stripe Webhook] Missing configuration or signature');
        return res.status(400).send('Webhook Error: Missing configuration');
    }
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    }
    catch (err) {
        console.error(`[Stripe Webhook] Signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    console.log(`[Stripe Webhook] 🔔 Received event: ${event.id} | Type: ${event.type}`);
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const userId = session.client_reference_id || session.metadata?.userId;
                const customerId = typeof session.customer === 'string' ? session.customer : null;
                const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null;
                if (userId) {
                    console.log(`[Stripe Webhook] Processing checkout for user: ${userId}`);
                    await UserService.ensureUserExists(userId);
                    await UserService.updateSubscription(userId, {
                        stripeCustomerId: customerId || undefined,
                        stripeSubscriptionId: subscriptionId || undefined,
                    });
                }
                break;
            }
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                const customerId = typeof subscription.customer === 'string' ? subscription.customer : null;
                const subscriptionId = subscription.id;
                const status = subscription.status;
                const currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null;
                const priceId = subscription.items?.data?.[0]?.price?.id || null;
                const userIdFromMetadata = subscription.metadata?.userId ? String(subscription.metadata.userId) : null;
                const isActive = status === 'active' || status === 'trialing';
                const plan = isActive ? getPlanFromPriceId(priceId) : 'free';
                if (customerId) {
                    const existingUser = await UserService.getUserByStripeCustomerId(customerId);
                    const userId = userIdFromMetadata || existingUser?.clerkUserId || null;
                    if (userId) {
                        console.log(`[Stripe Webhook] Updating subscription for user: ${userId}, plan: ${plan}, status: ${status}`);
                        await UserService.ensureUserExists(userId);
                        await UserService.updateSubscription(userId, {
                            stripeCustomerId: customerId,
                            stripeSubscriptionId: subscriptionId,
                            stripePriceId: priceId || undefined,
                            subscriptionStatus: status,
                            currentPeriodEnd: currentPeriodEnd || undefined,
                            plan: plan,
                        });
                    }
                }
                break;
            }
            default:
                console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        }
        return res.json({ received: true });
    }
    catch (err) {
        console.error(`[Stripe Webhook] Error processing event: ${err.message}`);
        return res.status(500).send('Webhook handler failed');
    }
};
