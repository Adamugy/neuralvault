import { describe, it, expect } from 'vitest';
import { generate, generateSecret } from 'otplib';
import { TwoFactorService } from './twoFactorService.js';

describe('TwoFactorService.verifyToken', () => {
    it('rejects a wrong code (verify() returns an object, which used to be read as true)', async () => {
        expect(await TwoFactorService.verifyToken('000000', generateSecret())).toBe(false);
    });

    it('accepts a correct code once, then rejects the same code', async () => {
        const secret = generateSecret();
        const code = await generate({ secret });
        expect(await TwoFactorService.verifyToken(code, secret)).toBe(true);
        expect(await TwoFactorService.verifyToken(code, secret)).toBe(false);
    });

    it('rejects a non-string code', async () => {
        expect(await TwoFactorService.verifyToken({ not: '' } as any, generateSecret())).toBe(false);
    });
});
