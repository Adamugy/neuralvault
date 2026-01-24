import { AuthService } from '../services/authService.js';
import { prisma } from '../services/prisma.js';
import { MailService } from '../services/mailService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { BadRequestError, UnauthorizedError } from '../utils/errors.js';
/**
 * POST /api/auth/signup
 * Register a new user
 */
import crypto from 'crypto';
/**
 * POST /api/auth/signup
 * Register a new user
 */
export const signup = asyncHandler(async (req, res) => {
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
        where: { email: email.toLowerCase() }
    });
    if (existingUser) {
        throw new BadRequestError('Email already registered');
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
        }
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
export const signin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new BadRequestError('Email and password are required');
    }
    // Find user
    const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
    });
    if (!user) {
        throw new UnauthorizedError('Invalid email or password');
    }
    // Verify password
    const isValid = await AuthService.verifyPassword(password, user.passwordHash);
    if (!isValid) {
        throw new UnauthorizedError('Invalid email or password');
    }
    // Check if email is verified
    if (!user.emailVerified) {
        throw new UnauthorizedError('Por favor, verifique seu e-mail antes de fazer login.');
    }
    // Generate token
    const token = AuthService.generateToken(user.id, user.email);
    await AuthService.createSession(user.id, token);
    res.json({
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatarUrl: user.avatarUrl,
            plan: user.plan
        },
        token
    });
});
/**
 * POST /api/auth/signout
 * Sign out the current user
 */
export const signout = asyncHandler(async (req, res) => {
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
export const getMe = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const user = await prisma.user.findUnique({
        where: { id: userId }
    });
    if (!user) {
        throw new UnauthorizedError();
    }
    res.json({
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            lastName: user.lastName,
            role: user.role,
            avatarUrl: user.avatarUrl,
            plan: user.plan,
            emailVerified: user.emailVerified
        }
    });
});
/**
 * PATCH /api/auth/me
 * Update current user profile
 */
export const updateMe = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { name, lastName, role, avatarUrl } = req.body;
    const user = await prisma.user.update({
        where: { id: userId },
        data: {
            name: name !== undefined ? name : undefined,
            lastName: lastName !== undefined ? lastName : undefined,
            role: role !== undefined ? role : undefined,
            avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined
        }
    });
    res.json({
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            lastName: user.lastName,
            role: user.role,
            avatarUrl: user.avatarUrl,
            plan: user.plan,
            emailVerified: user.emailVerified
        }
    });
});
/**
 * POST /api/auth/verify-email
 * Verify user email with token
 */
export const verifyEmail = asyncHandler(async (req, res) => {
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
export const resendVerification = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) {
        throw new BadRequestError('Email is required');
    }
    const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
    });
    if (!user) {
        throw new BadRequestError('User not found');
    }
    if (user.emailVerified) {
        throw new BadRequestError('Email is already verified');
    }
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({
        where: { id: user.id },
        data: { verificationToken }
    });
    console.log(`[Auth] Verification token resent: ${verificationToken}`);
    // Send verification email
    await MailService.sendVerificationEmail(user.email, verificationToken, user.name || undefined);
    res.json({ message: 'Verification email resent' });
});
/**
 * POST /api/auth/avatar
 * Upload and set user avatar (Base64)
 */
export const uploadAvatar = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const file = req.file;
    if (!file) {
        throw new BadRequestError('No file uploaded');
    }
    // Validate size (1MB)
    if (file.size > 1024 * 1024) {
        throw new BadRequestError('File too large. Max 1MB allowed.');
    }
    // Convert to Base64
    const base64Image = file.buffer.toString('base64');
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
