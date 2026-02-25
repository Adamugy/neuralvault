import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
    VerifiedRegistrationResponse,
    VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import { isoUint8Array } from '@simplewebauthn/server/helpers';
import { prisma } from './prisma.js';
import { env } from '../utils/env.js';

const rpName = 'NeuralVault';

// Derive rpID and origin from env vars or APP_URL
const getRPSettings = () => {
    const isProduction = env.NODE_ENV === 'production';
    const appUrl = env.APP_URL;

    // 1. Check for explicit overrides first
    const overrideRPID = (env as any).PASSKEY_RP_ID;
    const overrideOrigin = (env as any).PASSKEY_ORIGIN;

    if (overrideRPID && overrideOrigin) {
        console.log(`[Passkey] Using explicit overrides. rpID: ${overrideRPID}, origin: ${overrideOrigin}`);
        return { rpID: overrideRPID, origin: overrideOrigin };
    }

    // 2. Derive from APP_URL
    if (appUrl) {
        try {
            const parsed = new URL(appUrl);
            const settings = {
                rpID: overrideRPID || parsed.hostname,
                origin: overrideOrigin || appUrl.replace(/\/$/, '') // remove trailing slash
            };
            console.log(`[Passkey] Derived from APP_URL (${appUrl}). rpID: ${settings.rpID}, origin: ${settings.origin}`);
            return settings;
        } catch (e) {
            console.error('[Passkey] Invalid APP_URL:', appUrl);
        }
    }

    // 3. Fallback to DOMAIN or defaults
    const rpID = overrideRPID || (env.DOMAIN && env.DOMAIN !== 'localhost' ? env.DOMAIN : (isProduction ? 'nvaulty.online' : 'localhost'));
    const origin = overrideOrigin || (isProduction ? `https://${rpID}` : `http://localhost:3000`);

    console.log(`[Passkey] Using fallback settings. rpID: ${rpID}, origin: ${origin}`);
    return { rpID, origin };
};

const { rpID, origin } = getRPSettings();
console.log(`[Passkey Config Initialized] FINAL -> rpID: ${rpID}, origin: ${origin}`);

/**
 * Registration: Step 1 - Generate Options
 */
export const getRegistrationOptions = async (userId: string, email: string) => {
    console.log(`[Passkey Debug] Generating registration options for ${email} (rpID: ${rpID})`);

    const userAuthenticators = await prisma.authenticator.findMany({
        where: { userId },
    });

    const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userID: isoUint8Array.fromUTF8String(userId),
        userName: email,
        attestationType: 'none',
        excludeCredentials: userAuthenticators.map(cred => ({
            id: cred.credentialID,
            type: 'public-key',
            transports: cred.transports as any,
        })),
        authenticatorSelection: {
            residentKey: 'required',
            userVerification: 'preferred',
        },
    });

    // Store challenge in user record
    await prisma.user.update({
        where: { id: userId },
        data: { currentChallenge: options.challenge } as any,
    });

    return options;
};

/**
 * Registration: Step 2 - Verify Response
 */
export const verifyPasskeyRegistration = async (userId: string, body: any) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user || !(user as any).currentChallenge) {
        throw new Error('Registration challenge not found');
    }

    console.log(`[Passkey Debug] Verifying registration for ${userId}. Expected rpID: ${rpID}, Expected Origin: ${origin}`);

    const verification: VerifiedRegistrationResponse = await verifyRegistrationResponse({
        response: body,
        expectedChallenge: (user as any).currentChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
    });

    const { verified, registrationInfo } = verification;

    if (verification.verified && registrationInfo) {
        const { credential } = registrationInfo;
        const { id, publicKey, counter } = credential;

        console.log(`[Passkey Debug] Registration verified for user ${userId}. Saving authenticator...`);
        await prisma.authenticator.create({
            data: {
                userId,
                credentialID: Buffer.from(id).toString('base64url'),
                credentialPublicKey: Buffer.from(publicKey),
                counter: BigInt(counter),
                credentialDeviceType: 'single_device',
                credentialBackedUp: true,
                transports: (body.response as any).transports || [],
            },
        });

        // Clear challenge
        await prisma.user.update({
            where: { id: userId },
            data: { currentChallenge: null } as any,
        });
    } else {
        console.warn(`[Passkey Debug] Registration verification FAILED for user ${userId}`);
    }

    return verification;
};

/**
 * Authentication: Step 1 - Generate Auth Options
 */
export const getAuthOptions = async (email: string) => {
    console.log(`[Passkey Debug] Generating auth options for: ${email} (rpID: ${rpID})`);
    const user = await prisma.user.findUnique({
        where: { email } as any,
        include: { authenticators: true } as any,
    });

    if (!user || !(user as any).authenticators || (user as any).authenticators.length === 0) {
        console.error(`[Passkey Debug] No passkeys found for: ${email}`);
        throw new Error('User has no passkeys registered');
    }

    const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: (user as any).authenticators.map((cred: any) => ({
            id: cred.credentialID,
            type: 'public-key',
            // We omit transports during login to allow better discovery 
            // across different device types/methods.
        })),
        userVerification: 'preferred',
    });

    // Store challenge
    await prisma.user.update({
        where: { id: (user as any).id },
        data: { currentChallenge: options.challenge } as any,
    });

    return options;
};

/**
 * Authentication: Step 2 - Verify Response
 */
export const verifyPasskeyLogin = async (email: string, body: any) => {
    console.log(`[Passkey Debug] Verifying login for: ${email}, credentialId: ${body.id}`);
    const user = await prisma.user.findUnique({
        where: { email } as any,
        include: { authenticators: true } as any,
    });

    if (!user || !(user as any).currentChallenge) {
        console.error(`[Passkey Debug] Auth challenge not found for: ${email}`);
        throw new Error('Authentication challenge not found');
    }

    const dbAuthenticator = (user as any).authenticators.find(
        (auth: any) => auth.credentialID === body.id
    );

    if (!dbAuthenticator) {
        console.error(`[Passkey Debug] Authenticator ${body.id} not found in DB for user ${email}`);
        throw new Error('Authenticator not found for this user');
    }

    try {
        const verification: VerifiedAuthenticationResponse = await verifyAuthenticationResponse({
            response: body,
            expectedChallenge: (user as any).currentChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            credential: {
                id: dbAuthenticator.credentialID,
                publicKey: new Uint8Array(dbAuthenticator.credentialPublicKey),
                counter: Number(dbAuthenticator.counter),
            },
        });

        if (verification.verified) {
            console.log(`[Passkey Debug] Login verified successfully for: ${email}`);
            // Update counter
            await prisma.authenticator.update({
                where: { id: dbAuthenticator.id },
                data: { counter: BigInt(verification.authenticationInfo.newCounter) },
            });

            // Clear challenge
            await prisma.user.update({
                where: { id: (user as any).id },
                data: { currentChallenge: null } as any,
            });
        } else {
            console.warn(`[Passkey Debug] Login verification FAILED for: ${email}`);
        }

        return { verification, user };
    } catch (err: any) {
        console.error(`[Passkey Debug] CRITICAL error during verification:`, err.message);
        throw err;
    }
};
