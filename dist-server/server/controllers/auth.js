import { AuthService } from '../services/authService.js';
import { prisma } from '../services/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { BadRequestError, UnauthorizedError } from '../utils/errors.js';
/**
 * POST /api/auth/signup
 * Register a new user
 */
export const signup = asyncHandler(async (req, res) => {
    const { email, password, name } = req.body;
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
    // Create user
    const user = await prisma.user.create({
        data: {
            email: email.toLowerCase(),
            passwordHash,
            name: name || null
        }
    });
    // Generate token
    const token = AuthService.generateToken(user.id, user.email);
    await AuthService.createSession(user.id, token);
    res.status(201).json({
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
            role: user.role,
            avatarUrl: user.avatarUrl,
            plan: user.plan
        }
    });
});
/**
 * PATCH /api/auth/me
 * Update current user profile
 */
export const updateMe = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { name, role, avatarUrl } = req.body;
    const user = await prisma.user.update({
        where: { id: userId },
        data: {
            name: name !== undefined ? name : undefined,
            role: role !== undefined ? role : undefined,
            avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined
        }
    });
    res.json({
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            avatarUrl: user.avatarUrl,
            plan: user.plan
        }
    });
});
