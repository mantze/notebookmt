/**
 * Authentication Routes
 * POST /api/auth/register - Register new user
 * POST /api/auth/login - Login
 * POST /api/auth/logout - Logout (client-side token removal)
 * GET /api/auth/me - Get current user
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { getDatabase } = require('../utils/database');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Register new user
 * POST /api/auth/register
 */
router.post('/register', asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
        return res.status(400).json({
            success: false,
            error: { message: 'Username, email and password are required', code: 'VALIDATION_ERROR' }
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            success: false,
            error: { message: 'Password must be at least 6 characters', code: 'VALIDATION_ERROR' }
        });
    }

    const db = getDatabase();

    // Check if user exists
    const existingUser = db.prepare(
        'SELECT id FROM users WHERE username = ? OR email = ?'
    ).get(username, email);

    if (existingUser) {
        return res.status(409).json({
            success: false,
            error: { message: 'Username or email already exists', code: 'USER_EXISTS' }
        });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = db.prepare(
        'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)'
    ).run(username, email, passwordHash);

    // Create default notebook
    db.prepare(
        'INSERT INTO notebooks (user_id, title, description) VALUES (?, ?, ?)'
    ).run(result.lastInsertRowid, '我的筆記本', '我的第一個筆記本');

    // Generate token
    const token = generateToken({
        id: result.lastInsertRowid,
        username,
        email
    });

    res.status(201).json({
        success: true,
        data: {
            user: { id: result.lastInsertRowid, username, email },
            token
        }
    });
}));

/**
 * Login
 * POST /api/auth/login
 */
router.post('/login', asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
        return res.status(400).json({
            success: false,
            error: { message: 'Username and password are required', code: 'VALIDATION_ERROR' }
        });
    }

    const db = getDatabase();

    // Find user
    const user = db.prepare(
        'SELECT id, username, email, password_hash FROM users WHERE username = ? OR email = ?'
    ).get(username, username);

    if (!user) {
        return res.status(401).json({
            success: false,
            error: { message: 'Invalid credentials', code: 'AUTH_FAILED' }
        });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
        return res.status(401).json({
            success: false,
            error: { message: 'Invalid credentials', code: 'AUTH_FAILED' }
        });
    }

    // Generate token
    const token = generateToken(user);

    res.json({
        success: true,
        data: {
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            },
            token
        }
    });
}));

/**
 * Get current user
 * GET /api/auth/me
 */
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
    const db = getDatabase();

    const user = db.prepare(
        'SELECT id, username, email, created_at FROM users WHERE id = ?'
    ).get(req.user.id);

    if (!user) {
        return res.status(404).json({
            success: false,
            error: { message: 'User not found', code: 'USER_NOT_FOUND' }
        });
    }

    res.json({
        success: true,
        data: { user }
    });
}));

/**
 * Update profile
 * PUT /api/auth/me
 */
router.put('/me', authenticateToken, asyncHandler(async (req, res) => {
    const { username, email } = req.body;
    const db = getDatabase();

    const updates = [];
    const values = [];

    if (username) {
        updates.push('username = ?');
        values.push(username);
    }

    if (email) {
        updates.push('email = ?');
        values.push(email);
    }

    if (updates.length === 0) {
        return res.status(400).json({
            success: false,
            error: { message: 'No fields to update', code: 'VALIDATION_ERROR' }
        });
    }

    values.push(req.user.id);

    db.prepare(
        `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(...values);

    const updatedUser = db.prepare(
        'SELECT id, username, email, created_at FROM users WHERE id = ?'
    ).get(req.user.id);

    res.json({
        success: true,
        data: { user: updatedUser }
    });
}));

module.exports = router;
