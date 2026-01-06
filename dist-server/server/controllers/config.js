export const getHealth = (req, res) => {
    res.json({ ok: true });
};
export const getConfig = (req, res) => {
    res.json({
        clerkPublishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY || '',
        stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
        geminiApiKey: process.env.VITE_GEMINI_API_KEY || '',
    });
};
