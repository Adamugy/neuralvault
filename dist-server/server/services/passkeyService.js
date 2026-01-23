import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse, } from '@simplewebauthn/server';
import { isoUint8Array } from '@simplewebauthn/server/helpers';
import { prisma } from './prisma.js';
import { env } from '../utils/env.js';
const rpName = 'NeuralVault';
const rpID = env.DOMAIN || 'localhost';
const origin = env.NODE_ENV === 'production' ? `https://${rpID}` : `http://localhost:3000`;
/**
 * Registration: Step 1 - Generate Options
 */
export const getRegistrationOptions = async (userId, email) => {
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
            transports: cred.transports,
        })),
        authenticatorSelection: {
            residentKey: 'required',
            userVerification: 'preferred',
        },
    });
    // Store challenge in user record
    await prisma.user.update({
        where: { id: userId },
        data: { currentChallenge: options.challenge },
    });
    return options;
};
/**
 * Registration: Step 2 - Verify Response
 */
export const verifyPasskeyRegistration = async (userId, body) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });
    if (!user || !user.currentChallenge) {
        throw new Error('Registration challenge not found');
    }
    const verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge: user.currentChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
    });
    const { verified, registrationInfo } = verification;
    if (verified && registrationInfo) {
        const { credential } = registrationInfo;
        const { id, publicKey, counter } = credential;
        await prisma.authenticator.create({
            data: {
                userId,
                credentialID: Buffer.from(id).toString('base64url'),
                credentialPublicKey: Buffer.from(publicKey),
                counter: BigInt(counter),
                credentialDeviceType: 'single_device',
                credentialBackedUp: true,
                transports: body.response.transports || [],
            },
        });
        // Clear challenge
        await prisma.user.update({
            where: { id: userId },
            data: { currentChallenge: null },
        });
    }
    return verification;
};
/**
 * Authentication: Step 1 - Generate Auth Options
 */
export const getAuthOptions = async (email) => {
    const user = await prisma.user.findUnique({
        where: { email },
        include: { authenticators: true },
    });
    if (!user || !user.authenticators || user.authenticators.length === 0) {
        throw new Error('User has no passkeys registered');
    }
    const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: user.authenticators.map((cred) => ({
            id: cred.credentialID,
            type: 'public-key',
            transports: cred.transports,
        })),
        userVerification: 'preferred',
    });
    // Store challenge
    await prisma.user.update({
        where: { id: user.id },
        data: { currentChallenge: options.challenge },
    });
    return options;
};
/**
 * Authentication: Step 2 - Verify Response
 */
export const verifyPasskeyLogin = async (email, body) => {
    const user = await prisma.user.findUnique({
        where: { email },
        include: { authenticators: true },
    });
    if (!user || !user.currentChallenge) {
        throw new Error('Authentication challenge not found');
    }
    const dbAuthenticator = user.authenticators.find((auth) => auth.credentialID === body.id);
    if (!dbAuthenticator) {
        throw new Error('Authenticator not found for this user');
    }
    const verification = await verifyAuthenticationResponse({
        response: body,
        expectedChallenge: user.currentChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
            id: dbAuthenticator.credentialID,
            publicKey: new Uint8Array(dbAuthenticator.credentialPublicKey),
            counter: Number(dbAuthenticator.counter),
        },
    });
    if (verification.verified) {
        // Update counter
        await prisma.authenticator.update({
            where: { id: dbAuthenticator.id },
            data: { counter: BigInt(verification.authenticationInfo.newCounter) },
        });
        // Clear challenge
        await prisma.user.update({
            where: { id: user.id },
            data: { currentChallenge: null },
        });
    }
    return { verification, user };
};
