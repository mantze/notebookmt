/**
 * Authentication Middleware
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';

/**
 * Verify JWT token
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];  // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            error: {
                message: 'Access token required',
                code: 'TOKEN_REQUIRED'
            }
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    error: {
                        message: 'Token expired',
                        code: 'TOKEN_EXPIRED'
                    }
                });
            }
            return res.status(403).json({
                success: false,
                error: {
                    message: 'Invalid token',
                    code: 'TOKEN_INVALID'
                }
            });
        }
        
        req.user = user;
        next();
    });
}

/**
 * Optional authentication (doesn't fail if no token)
 */
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (!err) {
                req.user = user;
            }
        });
    }
    
    next();
}

/**
 * Generate JWT token
 */
function generateToken(user) {
    return jwt.sign(
        { 
            id: user.id, 
            username: user.username,
            email: user.email 
        },
        JWT_SECRET,
        { expiresIn: '7d' }  // Token expires in 7 days
    );
}

module.exports = {
    authenticateToken,
    optionalAuth,
    generateToken,
    JWT_SECRET
};
