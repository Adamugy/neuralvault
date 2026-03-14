import { Request, Response } from 'express';
import { AuthService } from '../services/authService.js';
import { TwoFactorService } from '../services/twoFactorService.js';
import { prisma } from '../services/prisma.js';
import { MailService } from '../services/mailService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { BadRequestError, UnauthorizedError, ConflictError } from '../utils/errors.js';
import { reprocessImageFromBuffer } from '../utils/security.js';
import path from 'path';
import crypto from 'crypto';
import { getContextFingerprint } from '../middleware/zeroTrust.js';

/**
 * POST /api/auth/signup
 * Register a new user
 */
export const signup = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, name, role, lastName } = req.body;

    if (!email || !password) {
        throw new BadRequestError('Email and password are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new BadRequestError('Invalid email format');
    }

    // Validate password strength
    if (password.length < 8) {
        throw new BadRequestError('Password must be at least 8 characters');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() } as any
    });

    if (existingUser) {
        // SECURITY: Return success message even if email is registered to prevent account enumeration.
        return res.status(201).json({
            message: 'Usuário registrado com sucesso. Por favor, verifique seu e-mail para ativar sua conta.'
        });
    }

    // Hash password
    const passwordHash = await AuthService.hashPassword(password);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create user
    const user = await prisma.user.create({
        data: {
            email: email.toLowerCase(),
            passwordHash,
            name: name || null,
            lastName: lastName || null,
            role: role || null,
            verificationToken,
            emailVerified: false
        } as any
    });

    console.log(`[Auth] User created. Verification token: ${verificationToken}`);

    // Send verification email
    await MailService.sendVerificationEmail(user.email, verificationToken, user.name || undefined);

    // Send verification email
    await MailService.sendVerificationEmail(user.email, verificationToken, user.name || undefined);

    res.status(201).json({
        message: 'Usuário registrado com sucesso. Por favor, verifique seu e-mail para ativar sua conta.'
    });
});

/**
 * POST /api/auth/signin
 * Sign in an existing user
 */
export const signin = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new BadRequestError('Email and password are required');
    }

    // Find user
    const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() } as any
    });

    // Verify password safely (constant-time check even if user not found)
    const isValid = await AuthService.verifyPasswordSafe(password, user ? (user as any).passwordHash : null);

    if (!user || !isValid) {
        throw new UnauthorizedError('Invalid email or password');
    }

    // Check if email is verified
    if (!user.emailVerified) {
        throw new UnauthorizedError('Por favor, verifique seu e-mail antes de fazer login.');
    }

    console.log(`[Auth Debug] Sign-in level 1 successful for: ${email}`);

    // Check if 2FA is enabled
    if ((user as any).twoFactorEnabled) {
        console.log(`[Auth] 2FA required for user: ${email}`);
        const tempToken = AuthService.generateTemp2FAToken(user.id, user.email);
        return res.json({
            status: '2fa_required',
            tempToken
        });
    }

    // Generate JWT token
    const token = AuthService.generateToken(user.id, user.email);

    // Capture context fingerprint for security hardening
    console.log(`[Auth Debug] Capturing context fingerprint...`);
    const fingerprint = getContextFingerprint(req);

    // Create session in database with fingerprint
    console.log(`[Auth Debug] Creating session for user ID: ${user.id} with token starting: ${token.substring(0, 10)}...`);
    try {
        await AuthService.createSession(user.id, token, fingerprint);
        console.log(`[Auth Debug] Session created successfully.`);
    } catch (err: any) {
        console.error(`[Auth Debug] ERROR creating session:`, err.message);
        throw err; // Will be caught by errorHandler
    }

    console.log(`[Auth Debug] Sign-in complete for: ${email}`);
    const userWithPasskeys = await prisma.user.findUnique({
        where: { id: user.id },
        include: { authenticators: { select: { id: true } } }
    });

    res.json({
        user: {
            id: (user as any).id,
            email: (user as any).email,
            name: user.name,
            avatarUrl: user.avatarUrl,
            plan: user.plan,
            hasPasskey: (userWithPasskeys as any)?.authenticators?.length > 0,
            twoFactorEnabled: (user as any).twoFactorEnabled
        },
        token
    });
});

/**
 * POST /api/auth/signout
 * Sign out the current user
 */
export const signout = asyncHandler(async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        await AuthService.deleteSession(token);
    }

    res.json({ message: 'Signed out successfully' });
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    console.log(`[Auth Debug] Fetching profile for userId: ${userId}`);

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { authenticators: { select: { id: true } } }
        });

        if (!user) {
            console.warn(`[Auth Debug] User not found for ID: ${userId}`);
            throw new UnauthorizedError('Usuário não encontrado');
        }

        console.log(`[Auth Debug] Profile fetched successfully for: ${user.email}`);
        res.json({
            user: {
                id: (user as any).id,
                email: (user as any).email,
                name: user.name,
                lastName: user.lastName,
                role: user.role,
                avatarUrl: user.avatarUrl,
                plan: user.plan,
                emailVerified: user.emailVerified,
                hasPasskey: user.authenticators.length > 0,
                twoFactorEnabled: (user as any).twoFactorEnabled
            }
        });
    } catch (error: any) {
        console.error(`[Auth Debug] CRITICAL Error in getMe for userId ${userId}:`, {
            message: error.message,
            stack: error.stack,
            code: (error as any).code || 'N/A'
        });
        throw error;
    }
});

/**
 * PATCH /api/auth/me
 * Update current user profile
 */
export const updateMe = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const { name, lastName, role, avatarUrl } = req.body;

    const user = await prisma.user.update({
        where: { id: userId },
        data: {
            name: name !== undefined ? name : undefined,
            lastName: lastName !== undefined ? lastName : undefined,
            role: role !== undefined ? role : undefined,
            avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined
        } as any,
        include: { authenticators: { select: { id: true } } }
    });

    res.json({
        user: {
            id: (user as any).id,
            email: (user as any).email,
            name: user.name,
            lastName: user.lastName,
            role: user.role,
            avatarUrl: user.avatarUrl,
            plan: user.plan,
            emailVerified: user.emailVerified,
            hasPasskey: (user as any).authenticators.length > 0
        }
    });
});

/**
 * POST /api/auth/verify-email
 * Verify user email with token
 */
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;

    if (!token) {
        throw new BadRequestError('Verification token is required');
    }

    const user = await prisma.user.findFirst({
        where: { verificationToken: token }
    });

    if (!user) {
        throw new BadRequestError('Invalid or expired verification token');
    }

    await prisma.user.update({
        where: { id: user.id },
        data: {
            emailVerified: true,
            verificationToken: null
        }
    });

    res.json({ message: 'Email verified successfully' });
});

/**
 * POST /api/auth/resend-verification
 * Resend verification email
 */
export const resendVerification = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
        throw new BadRequestError('Email is required');
    }

    const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
    });

    if (!user || user.emailVerified) {
        // SECURITY: Return success regardless of existence or status to prevent enumeration.
        return res.json({ message: 'Se o e-mail for válido e não estiver verificado, você receberá um link de verificação.' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');

    await prisma.user.update({
        where: { id: user.id },
        data: { verificationToken }
    });

    console.log(`[Auth] Verification token resent: ${verificationToken}`);

    // Send verification email
    await MailService.sendVerificationEmail(user.email, verificationToken, user.name || undefined);

    res.json({ message: 'Se o e-mail for válido e não estiver verificado, você receberá um link de verificação.' });
});

/**
 * POST /api/auth/avatar
 * Upload and set user avatar (Base64)
 */
export const uploadAvatar = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const file = req.file;

    if (!file) {
        throw new BadRequestError('No file uploaded');
    }

    // Validate size (1MB)
    if (file.size > 1024 * 1024) {
        throw new BadRequestError('File too large. Max 1MB allowed.');
    }

    // Security: Strip metadata from avatar
    const ext = path.extname(file.originalname || '');
    const reprocessedBuffer = await reprocessImageFromBuffer(file.buffer, ext);

    // Convert to Base64
    const base64Image = reprocessedBuffer.toString('base64');
    const avatarUrl = `data:${file.mimetype};base64,${base64Image}`;

    const user = await prisma.user.update({
        where: { id: userId },
        data: { avatarUrl }
    });

    res.json({
        message: 'Avatar updated successfully',
        avatarUrl: user.avatarUrl
    });
});

/**
 * POST /api/auth/2fa/generate
 * Generate 2FA secret and QR code for setup
 */
export const generate2FA = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;

    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!user) throw new UnauthorizedError();

    const secret = TwoFactorService.generateSecret();
    const qrCodeUrl = await TwoFactorService.generateQRCode(user.email, 'NeuralVault', secret);

    // Store secret temporarily (not enabled yet)
    await (prisma.user as any).update({
        where: { id: userId },
        data: { twoFactorSecret: secret }
    });

    res.json({ qrCodeUrl, secret });
});

/**
 * POST /api/auth/2fa/enable
 * Verify first token and enable 2FA
 */
export const enable2FA = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const { token } = req.body;

    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!user || !(user as any).twoFactorSecret) {
        throw new BadRequestError('2FA setup not initiated');
    }

    const isValid = await TwoFactorService.verifyToken(token, (user as any).twoFactorSecret);

    if (!isValid) {
        throw new BadRequestError('Código inválido. Tente novamente.');
    }

    await (prisma.user as any).update({
        where: { id: userId },
        data: { twoFactorEnabled: true }
    });

    res.json({ message: 'Autenticação de dois fatores ativada com sucesso!' });
});

/**
 * POST /api/auth/2fa/disable
 * Disable 2FA
 */
export const disable2FA = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const { token } = req.body;

    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!user || !(user as any).twoFactorEnabled || !(user as any).twoFactorSecret) {
        throw new BadRequestError('2FA não está ativada');
    }

    const isValid = await TwoFactorService.verifyToken(token, (user as any).twoFactorSecret);

    if (!isValid) {
        throw new BadRequestError('Código inválido. Tente novamente para desativar.');
    }

    await (prisma.user as any).update({
        where: { id: userId },
        data: {
            twoFactorEnabled: false,
            twoFactorSecret: null
        }
    });

    res.json({ message: 'Autenticação de dois fatores desativada.' });
});

/**
 * POST /api/auth/2fa/verify
 * Public endpoint to verify 2FA during login
 */
export const verify2FA = asyncHandler(async (req: Request, res: Response) => {
    const { tempToken, token } = req.body;

    if (!tempToken || !token) {
        throw new BadRequestError('Token temporário e código são obrigatórios');
    }

    // Verify temp token
    const decoded = AuthService.verifyToken(tempToken);
    if (!decoded.isPending2FA) {
        throw new UnauthorizedError('Token inválido');
    }

    const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
    });

    if (!user || !(user as any).twoFactorSecret) {
        throw new UnauthorizedError();
    }

    const isValid = await TwoFactorService.verifyToken(token, (user as any).twoFactorSecret);

    if (!isValid) {
        throw new UnauthorizedError('Código 2FA inválido');
    }

    // Success! Generate real token
    const finalToken = AuthService.generateToken(user.id, user.email);
    const { getContextFingerprint } = await import('../middleware/zeroTrust.js');
    const fingerprint = getContextFingerprint(req);
    await AuthService.createSession(user.id, finalToken, fingerprint);

    res.json({
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatarUrl: user.avatarUrl,
            plan: user.plan,
            twoFactorEnabled: true
        },
        token: finalToken
    });
});

/**
 * POST /api/auth/forgot-password
 * Send a password reset email
 */
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
        throw new BadRequestError('Email is required');
    }

    const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
    });

    // Security: Always return success to prevent email enumeration
    if (!user) {
        return res.json({ message: 'Se o e-mail existir no nosso sistema, você receberá um link de recuperação.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
        where: { id: user.id },
        data: {
            resetToken,
            resetTokenExpiry
        } as any
    });

    await MailService.sendPasswordResetEmail(user.email, resetToken, user.name || undefined);

    res.json({ message: 'Se o e-mail existir no nosso sistema, você receberá um link de recuperação.' });
});

/**
 * POST /api/auth/reset-password
 * Reset user password using token
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        throw new BadRequestError('Token e nova senha são obrigatórios');
    }

    if (newPassword.length < 8) {
        throw new BadRequestError('A senha deve ter pelo menos 8 caracteres');
    }

    const user = await prisma.user.findFirst({
        where: {
            resetToken: token,
            resetTokenExpiry: {
                gt: new Date()
            }
        } as any
    });

    if (!user) {
        throw new BadRequestError('Token inválido ou expirado. Por favor, solicite a recuperação de senha novamente.');
    }

    const passwordHash = await AuthService.hashPassword(newPassword);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            passwordHash,
            resetToken: null,
            resetTokenExpiry: null
        } as any
    });

    res.json({ message: 'Senha redefinida com sucesso. Você já pode fazer login com sua nova senha.' });
});
