/**
 * User Routes (Basic placeholder)
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Get user's notebooks summary
router.get('/:id/summary', authenticateToken, (req, res) => {
    res.json({
        success: true,
        data: {
            message: 'User summary endpoint'
        }
    });
});

module.exports = router;
