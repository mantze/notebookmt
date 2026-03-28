/**
 * Conversations Routes
 * POST /api/conversations - Create new conversation
 * GET /api/conversations/:id - Get conversation with messages
 * DELETE /api/conversations/:id - Delete conversation
 * POST /api/conversations/:id/messages - Add message
 */

const express = require('express');
const router = express.Router();
const { getDatabase } = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// All routes require authentication
router.use(authenticateToken);

/**
 * Create new conversation
 * POST /api/conversations
 */
router.post('/', asyncHandler(async (req, res) => {
    const { notebook_id, title } = req.body;
    const userId = req.user.id;

    if (!notebook_id) {
        return res.status(400).json({
            success: false,
            error: { message: 'notebook_id is required', code: 'VALIDATION_ERROR' }
        });
    }

    const db = getDatabase();

    // Verify notebook ownership
    const notebook = db.prepare(
        'SELECT id FROM notebooks WHERE id = ? AND user_id = ?'
    ).get(notebook_id, userId);

    if (!notebook) {
        return res.status(404).json({
            success: false,
            error: { message: 'Notebook not found', code: 'NOT_FOUND' }
        });
    }

    const result = db.prepare(
        'INSERT INTO conversations (notebook_id, user_id, title) VALUES (?, ?, ?)'
    ).run(notebook_id, userId, title || '新對話');

    const conversation = db.prepare(
        'SELECT * FROM conversations WHERE id = ?'
    ).get(result.lastInsertRowid);

    res.status(201).json({
        success: true,
        data: { conversation }
    });
}));

/**
 * List conversations for a notebook
 * GET /api/notebooks/:notebookId/conversations
 */
router.get('/notebook/:notebookId', asyncHandler(async (req, res) => {
    const { notebookId } = req.params;
    const userId = req.user.id;
    const db = getDatabase();

    const conversations = db.prepare(`
        SELECT c.*,
               (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count,
               (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
        FROM conversations c
        WHERE c.notebook_id = ? AND c.user_id = ?
        ORDER BY c.updated_at DESC
    `).all(notebookId, userId);

    res.json({
        success: true,
        data: { conversations }
    });
}));

/**
 * Get conversation with messages
 * GET /api/conversations/:id
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const db = getDatabase();

    const conversation = db.prepare(
        'SELECT * FROM conversations WHERE id = ? AND user_id = ?'
    ).get(id, userId);

    if (!conversation) {
        return res.status(404).json({
            success: false,
            error: { message: 'Conversation not found', code: 'NOT_FOUND' }
        });
    }

    const messages = db.prepare(
        'SELECT id, role, content, sources, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
    ).all(id);

    res.json({
        success: true,
        data: { conversation, messages }
    });
}));

/**
 * Add message to conversation
 * POST /api/conversations/:id/messages
 */
router.post('/:id/messages', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role, content, sources } = req.body;
    const userId = req.user.id;
    const db = getDatabase();

    // Verify conversation ownership
    const conversation = db.prepare(
        'SELECT id, notebook_id FROM conversations WHERE id = ? AND user_id = ?'
    ).get(id, userId);

    if (!conversation) {
        return res.status(404).json({
            success: false,
            error: { message: 'Conversation not found', code: 'NOT_FOUND' }
        });
    }

    if (!role || !content) {
        return res.status(400).json({
            success: false,
            error: { message: 'role and content are required', code: 'VALIDATION_ERROR' }
        });
    }

    const result = db.prepare(
        'INSERT INTO messages (conversation_id, role, content, sources) VALUES (?, ?, ?, ?)'
    ).run(id, role, content, sources ? JSON.stringify(sources) : null);

    // Update conversation timestamp
    db.prepare(
        'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(id);

    const message = db.prepare(
        'SELECT * FROM messages WHERE id = ?'
    ).get(result.lastInsertRowid);

    res.status(201).json({
        success: true,
        data: { message }
    });
}));

/**
 * Delete conversation
 * DELETE /api/conversations/:id
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const db = getDatabase();

    const conversation = db.prepare(
        'SELECT id FROM conversations WHERE id = ? AND user_id = ?'
    ).get(id, userId);

    if (!conversation) {
        return res.status(404).json({
            success: false,
            error: { message: 'Conversation not found', code: 'NOT_FOUND' }
        });
    }

    db.prepare('DELETE FROM conversations WHERE id = ?').run(id);

    res.json({
        success: true,
        data: { message: 'Conversation deleted successfully' }
    });
}));

/**
 * Get search history (階段二)
 * GET /api/conversations/search-history
 */
router.get('/search-history', asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const db = getDatabase();

    const history = db.prepare(`
        SELECT sh.*, n.title as notebook_title
        FROM search_history sh
        LEFT JOIN notebooks n ON sh.notebook_id = n.id
        WHERE sh.user_id = ?
        ORDER BY sh.created_at DESC
        LIMIT 50
    `).all(userId);

    res.json({
        success: true,
        data: { history }
    });
}));

module.exports = router;
