/**
 * Notebooks Routes
 * GET /api/notebooks - List all notebooks for user
 * POST /api/notebooks - Create new notebook
 * GET /api/notebooks/:id - Get notebook details
 * PUT /api/notebooks/:id - Update notebook
 * DELETE /api/notebooks/:id - Delete notebook
 */

const express = require('express');
const router = express.Router();
const { getDatabase } = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// All routes require authentication
router.use(authenticateToken);

/**
 * List all notebooks for current user
 * GET /api/notebooks
 */
router.get('/', asyncHandler(async (req, res) => {
    const db = getDatabase();
    const userId = req.user.id;

    const notebooks = db.prepare(`
        SELECT n.*, 
               COUNT(DISTINCT d.id) as document_count,
               COUNT(DISTINCT c.id) as conversation_count
        FROM notebooks n
        LEFT JOIN documents d ON n.id = d.notebook_id
        LEFT JOIN conversations c ON n.id = c.notebook_id
        WHERE n.user_id = ?
        GROUP BY n.id
        ORDER BY n.updated_at DESC
    `).all(userId);

    res.json({
        success: true,
        data: { notebooks }
    });
}));

/**
 * Create new notebook
 * POST /api/notebooks
 */
router.post('/', asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    const userId = req.user.id;

    if (!title) {
        return res.status(400).json({
            success: false,
            error: { message: 'Title is required', code: 'VALIDATION_ERROR' }
        });
    }

    const db = getDatabase();

    const result = db.prepare(
        'INSERT INTO notebooks (user_id, title, description) VALUES (?, ?, ?)'
    ).run(userId, title, description || '');

    const notebook = db.prepare(
        'SELECT * FROM notebooks WHERE id = ?'
    ).get(result.lastInsertRowid);

    res.status(201).json({
        success: true,
        data: { notebook }
    });
}));

/**
 * Get notebook details with documents and conversations
 * GET /api/notebooks/:id
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const db = getDatabase();

    // Get notebook
    const notebook = db.prepare(
        'SELECT * FROM notebooks WHERE id = ? AND user_id = ?'
    ).get(id, userId);

    if (!notebook) {
        return res.status(404).json({
            success: false,
            error: { message: 'Notebook not found', code: 'NOT_FOUND' }
        });
    }

    // Get documents
    const documents = db.prepare(`
        SELECT id, title, original_filename, file_type, file_size, word_count, created_at
        FROM documents
        WHERE notebook_id = ?
        ORDER BY created_at DESC
    `).all(id);

    // Get conversations
    const conversations = db.prepare(`
        SELECT c.*, 
               (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
        FROM conversations c
        WHERE c.notebook_id = ?
        ORDER BY c.updated_at DESC
    `).all(id);

    res.json({
        success: true,
        data: {
            notebook,
            documents,
            conversations
        }
    });
}));

/**
 * Update notebook
 * PUT /api/notebooks/:id
 */
router.put('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description } = req.body;
    const userId = req.user.id;
    const db = getDatabase();

    // Check ownership
    const notebook = db.prepare(
        'SELECT id FROM notebooks WHERE id = ? AND user_id = ?'
    ).get(id, userId);

    if (!notebook) {
        return res.status(404).json({
            success: false,
            error: { message: 'Notebook not found', code: 'NOT_FOUND' }
        });
    }

    const updates = [];
    const values = [];

    if (title !== undefined) {
        updates.push('title = ?');
        values.push(title);
    }

    if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
    }

    if (updates.length > 0) {
        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id, userId);

        db.prepare(
            `UPDATE notebooks SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
        ).run(...values);
    }

    const updatedNotebook = db.prepare(
        'SELECT * FROM notebooks WHERE id = ?'
    ).get(id);

    res.json({
        success: true,
        data: { notebook: updatedNotebook }
    });
}));

/**
 * Delete notebook
 * DELETE /api/notebooks/:id
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const db = getDatabase();

    // Check ownership
    const notebook = db.prepare(
        'SELECT id FROM notebooks WHERE id = ? AND user_id = ?'
    ).get(id, userId);

    if (!notebook) {
        return res.status(404).json({
            success: false,
            error: { message: 'Notebook not found', code: 'NOT_FOUND' }
        });
    }

    // Delete (cascade will handle documents, conversations, etc.)
    db.prepare('DELETE FROM notebooks WHERE id = ?').run(id);

    res.json({
        success: true,
        data: { message: 'Notebook deleted successfully' }
    });
}));

module.exports = router;
