import express from 'express'
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { createDatabaseConnection } from '../config/database';
import { User, UserCreateInput, LoginCredentials, AuthResponse } from '../types';
import { authenticateToken, generateTokens, JWTPayload } from '../middleware/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = express.Router();

// POST /auth/register
router.post('/register', async(req, res) => {
    console.log("Received request: POST /auth/register");
    try {
        const { email, password, first_name, last_name, role = 'owner' }: UserCreateInput & { password: string } = req.body;

        // Validierung
        if (!email || !password || !first_name || !last_name) {
            return res.status(400).json({
                success: false,
                message: 'email, password, first_name and last_name are required'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long!'
            });
        }

        const db = await createDatabaseConnection();

        // Check if user exists
        const [existingUsers] = await db.execute<RowDataPacket[]>(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Hash password
        const saltRounds = 12
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Create user
        const [result] = await db.execute<ResultSetHeader>(
            `INSERT INTO users (email, password_hash, first_name, last_name, role, email_verified) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [email, password_hash, first_name, last_name, role, false]
        );

        // Get created user (ohne password_hash)
        const [newUsers] = await db.execute<RowDataPacket[]>(
            `SELECT id, email, first_name, last_name, role, is_active, email_verified, last_login, login_count, created_at, updated_at 
            FROM users WHERE id = ?`,
            [result.insertId]
        );

        const newUser = newUsers[0] as Omit<User, 'password_hash'>;

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(newUser);

        res.status(201).json({
            success: true,
            data: {
                user: newUser,
                token: accessToken,
                refreshToken
            } as AuthResponse,
            message: 'User registered successfully'
        });
        console.log("Response sent | User registered");
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed'
        });
    }
});

// POST /auth/login
router.post('/login', async (req, res) => {
    console.log("Received request: POST /auth/login");
    try {
        const { email, password }: LoginCredentials = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const db = await createDatabaseConnection();

        // Get user with password
        const [users] = await db.execute<RowDataPacket[]>(
            `SELECT id, email, password_hash, first_name, last_name, role, 
                    is_active, email_verified, last_login, login_count, 
                    created_at, updated_at 
            FROM users WHERE email = ? AND is_active = true`,
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = users[0] as User;

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid password'
            });
        }

        // Update login statistics
        await db.execute(
            'UPDATE users SET last_login = NOW(), login_count = login_count + 1 WHERE id = ?',
            [user.id]
        );

        // Remove pasword_hash from user object
        const { password_hash, ...userWithoutPassword } = user;
        userWithoutPassword.last_login = new Date(); // Update in response
        userWithoutPassword.login_count += 1;

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(userWithoutPassword);

        res.json({
            success: true,
            data: {
                user: userWithoutPassword,
                token: accessToken,
                refreshToken
            } as AuthResponse,
            message: 'Login successful'
        });
        console.log("Response sent | User logged in");

    } catch (error) {
        console.error('Login error', error);
        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
});

// POST /auth/refresh
router.post('/refresh', async(req, res) => {
    console.log("Received request: POST /auth/refresh");
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token required'
            });
        }

        const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
        if (!jwtRefreshSecret) {
            throw new Error('JWT_REFRESH_SECRET is not configured');
        }

        const decoded = jwt.verify(refreshToken, jwtRefreshSecret!) as JWTPayload;

        const db = await createDatabaseConnection();
        const [users] = await db.execute<RowDataPacket[]>(
            `SELECT id, email, first_name, last_name, role, is_active, email_verified, 
                    last_login, login_count, created_at, updated_at 
            FROM users WHERE id = ? AND is_active = true`,
            [decoded.userId]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }

        const user = users[0] as Omit<User, 'password_hash'>;
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

        res.json({
            success: true,
            data: {
                user,
                token: accessToken,
                refreshToken, newRefreshToken
            } as AuthResponse
        });
        console.log("Response sent | Refresh successful");
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid refresh token'
        });
    }
});

// POST /auth/logout
router.post('/logout', authenticateToken, async (req, res) => {
    console.log("Received request: POST /auth/logout");
    // in productive app the token would go to a blacklist
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
    console.log("Response sent | User logged out");
});

// GET /auth/me
router.get('/me', authenticateToken, async(req, res) => {
    console.log("Received request: GET /auth/me");
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        // Fetch data from database
        const db = await createDatabaseConnection();
        const [users] = await db.execute<RowDataPacket[]>(
            `SELECT id, email, first_name, last_name, role, is_active, email_verified, 
                    last_login, login_count, created_at, updated_at 
            FROM users WHERE id = ?`,
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: users[0],
            message: 'User profile retrieved successfully'
        });
        console.log("Response sent | User me");
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user profile'
        });
    }
});

export default router;