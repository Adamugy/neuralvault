import { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import { stripe, STRIPE_PRICE_RESEARCHER, STRIPE_PRICE_RESEARCHER_PRO, getPlanFromPriceId } from '../services/stripe.js';
import { prisma } from '../services/prisma.js';
import { ensureUser } from '../services/user.js';
import Stripe from 'stripe';

export const checkout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!stripe) return res.status(501).json({ error: 'Stripe is not configured' });

        const { userId } = getAuth(req);
        if (!userId) return res.status(401).send();

        const plan = String(req.body?.plan || '').trim();
        if (plan !== 'researcher' && plan !== 'researcher_pro') {
            return res.status(400).json({ error: 'Invalid plan' });
        }

        const priceId = plan === 'researcher_pro' ? STRIPE_PRICE_RESEARCHER_PRO : STRIPE_PRICE_RESEARCHER;

        if (!priceId) {
            return res.status(500).json({ error: `Missing Stripe price for plan=${plan}. Check your environment variables.` });
        }

        const isProduction = process.env.NODE_ENV === 'production';
        const appUrl = process.env.APP_URL || (isProduction ? '' : 'http://localhost:3000');
        if (!appUrl) return res.status(500).json({ error: 'Missing APP_URL' });

        const dbUser = await ensureUser(userId);

        if (dbUser.plan !== 'free' && dbUser.subscriptionStatus === 'active') {
            const portalSession = await stripe.billingPortal.sessions.create({
                customer: dbUser.stripeCustomerId!,
                return_url: `${appUrl}/dashboard`,
            });
            return res.json({ url: portalSession.url });
        }

        let customerId = dbUser.stripeCustomerId;
        if (!customerId) {
            const customer = await stripe.customers.create({
                metadata: { clerkUserId: userId },
            });
            customerId = customer.id;
            await prisma.user.update({ where: { clerkUserId: userId }, data: { stripeCustomerId: customerId } });
        }

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: customerId,
            client_reference_id: userId,
            line_items: [{ price: priceId, quantity: 1 }],
            allow_promotion_codes: true,
            success_url: `${appUrl}/dashboard?billing=success`,
            cancel_url: `${appUrl}/dashboard?billing=cancelled`,
            metadata: { clerkUserId: userId, plan },
            subscription_data: { metadata: { clerkUserId: userId, plan } },
        });

        res.json({ url: session.url });
    } catch (err) {
        next(err);
    }
};

export const portal = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!stripe) return res.status(501).json({ error: 'Stripe is not configured' });

        const { userId } = getAuth(req);
        if (!userId) return res.status(401).send();
        const user = await ensureUser(userId);
        if (!user.stripeCustomerId) return res.status(400).json({ error: 'No Stripe customer found for this user' });

        const isProduction = process.env.NODE_ENV === 'production';
        const appUrl = process.env.APP_URL || (isProduction ? '' : 'http://localhost:3000');
        if (!appUrl) return res.status(500).json({ error: 'Missing APP_URL' });

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${appUrl}/dashboard`,
        });

        res.json({ url: portalSession.url });
    } catch (err) {
        next(err);
    }
};

export const webhook = async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripe || !endpointSecret || !sig) {
        console.error('[Stripe Webhook] Missing configuration or signature');
        return res.status(400).send('Webhook Error: Missing configuration');
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err: any) {
        console.error(`[Stripe Webhook] Signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`[Stripe Webhook] Received event: ${event.id} type: ${event.type}`);

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const clerkUserId = session.client_reference_id || session.metadata?.clerkUserId;
                const customerId = typeof session.customer === 'string' ? session.customer : null;
                const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null;

                if (clerkUserId) {
                    console.log(`[Stripe Webhook] Processing checkout for user: ${clerkUserId}`);
                    await ensureUser(clerkUserId);
                    await prisma.user.update({
                        where: { clerkUserId },
                        data: {
                            stripeCustomerId: customerId || undefined,
                            stripeSubscriptionId: subscriptionId || undefined,
                        },
                    });
                }
                break;
            }

            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = typeof subscription.customer === 'string' ? subscription.customer : null;
                const subscriptionId = subscription.id;
                const status = subscription.status;
                const currentPeriodEnd = (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000) : null;
                const priceId = subscription.items?.data?.[0]?.price?.id || null;
                const clerkUserIdFromMetadata = subscription.metadata?.clerkUserId ? String(subscription.metadata.clerkUserId) : null;

                const isActive = status === 'active' || status === 'trialing';
                const plan = isActive ? getPlanFromPriceId(priceId) : 'free';

                if (customerId) {
                    const existingByCustomer = await prisma.user.findUnique({ where: { stripeCustomerId: customerId } });
                    const clerkUserId = clerkUserIdFromMetadata || existingByCustomer?.clerkUserId || null;

                    if (clerkUserId) {
                        console.log(`[Stripe Webhook] Updating subscription for user: ${clerkUserId}, plan: ${plan}, status: ${status}`);
                        await ensureUser(clerkUserId);
                        await prisma.user.update({
                            where: { clerkUserId },
                            data: {
                                stripeCustomerId: customerId,
                                stripeSubscriptionId: subscriptionId,
                                stripePriceId: priceId || undefined,
                                subscriptionStatus: status,
                                currentPeriodEnd: currentPeriodEnd || undefined,
                                // @ts-ignore - Plan types match logic
                                plan: plan,
                            },
                        });
                    }
                }
                break;
            }

            default:
                console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        }

        return res.json({ received: true });
    } catch (err: any) {
        console.error(`[Stripe Webhook] Error processing event: ${err.message}`);
        return res.status(500).send('Webhook handler failed');
    }
};
