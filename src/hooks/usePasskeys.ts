import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

export const usePasskeys = () => {
    const registerPasskey = async (email: string) => {
        try {
            // 1. Get options from server
            const optionsRes = await fetch('/api/auth/passkey/registration-options', {
                method: 'POST',
                body: JSON.stringify({ email }),
                headers: { 'Content-Type': 'application/json' },
            });

            if (!optionsRes.ok) {
                const err = await optionsRes.json();
                throw new Error(err.error || 'Failed to get registration options');
            }

            const options = await optionsRes.json();

            // 2. Browser interacts with hardware
            const attestationResponse = await startRegistration({ optionsJSON: options });

            // 3. Send response back to server
            const verifyRes = await fetch('/api/auth/passkey/registration-verify', {
                method: 'POST',
                body: JSON.stringify({ email, body: attestationResponse }),
                headers: { 'Content-Type': 'application/json' },
            });

            const verificationResult = await verifyRes.json();
            if (!verificationResult.verified) {
                throw new Error(verificationResult.error || 'Registration verification failed');
            }

            return verificationResult;
        } catch (error: any) {
            console.error('Passkey Registration Error:', error);
            if (error.name === 'NotAllowedError') {
                throw new Error('Registration canceled or timed out.');
            }
            throw error;
        }
    };

    const loginWithPasskey = async (email?: string) => {
        try {
            // 1. Get options from server
            const optionsRes = await fetch('/api/auth/passkey/login-options', {
                method: 'POST',
                body: JSON.stringify({ email }),
                headers: { 'Content-Type': 'application/json' },
            });

            if (!optionsRes.ok) {
                const err = await optionsRes.json();
                throw new Error(err.error || 'Failed to get login options');
            }

            const { options, challengeId } = await optionsRes.json();

            // 2. Browser interacts with hardware
            const assertionResponse = await startAuthentication({ optionsJSON: options });

            // 3. Send response back to server
            const verifyRes = await fetch('/api/auth/passkey/login-verify', {
                method: 'POST',
                body: JSON.stringify({ email, body: assertionResponse, challengeId }),
                headers: { 'Content-Type': 'application/json' },
            });

            const verificationResult = await verifyRes.json();
            if (!verificationResult.verified) {
                throw new Error(verificationResult.error || 'Login verification failed');
            }

            return verificationResult;
        } catch (error: any) {
            console.error('Passkey Login Error:', error);
            if (error.name === 'NotAllowedError') {
                throw new Error('Login canceled or not authorized by device.');
            }
            if (error.name === 'NotSupportedError') {
                throw new Error('Your browser or device does not support Passkeys.');
            }
            throw error;
        }
    };

    return { registerPasskey, loginWithPasskey };
};
