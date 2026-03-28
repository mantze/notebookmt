/**
 * Documents Routes
 * POST /api/documents/upload - Upload document
 * GET /api/documents/:id - Get document details
 * DELETE /api/documents/:id - Delete document
 * GET /api/documents/:id/content - Get document content
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { getDatabase } = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { parsePDF, parseTXT } = require('../utils/fileParser');

// Configure multer for file uploads
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Create user-specific folder
        const userFolder = path.join(uploadDir, `user_${req.user.id}`);
        if (!fs.existsSync(userFolder)) {
            fs.mkdirSync(userFolder, { recursive: true });
        }
        cb(null, userFolder);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `doc_${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['.pdf', '.txt', '.md'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error(`File type ${ext} not allowed. Allowed: ${allowedTypes.join(', ')}`), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024  // 10MB default
    }
});

// All routes require authentication
router.use(authenticateToken);

/**
 * Upload document
 * POST /api/documents/upload
 */
router.post('/upload', upload.single('file'), asyncHandler(async (req, res) => {
    const { notebook_id, title } = req.body;
    const userId = req.user.id;

    if (!req.file) {
        return res.status(400).json({
            success: false,
            error: { message: 'No file uploaded', code: 'NO_FILE' }
        });
    }

    if (!notebook_id) {
        // Delete uploaded file
        fs.unlinkSync(req.file.path);
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
        fs.unlinkSync(req.file.path);
        return res.status(404).json({
            success: false,
            error: { message: 'Notebook not found', code: 'NOT_FOUND' }
        });
    }

    // Parse file content
    const filePath = req.file.path;
    const fileType = path.extname(req.file.originalname).toLowerCase();
    let contentText = '';
    let contentJson = null;
    let wordCount = 0;

    try {
        if (fileType === '.pdf') {
            const result = await parsePDF(filePath);
            contentText = result.text;
            contentJson = JSON.stringify(result);
            wordCount = result.wordCount;
        } else if (['.txt', '.md'].includes(fileType)) {
            const result = await parseTXT(filePath);
            contentText = result.text;
            contentJson = JSON.stringify(result);
            wordCount = result.wordCount;
        }
    } catch (error) {
        console.error('Parse error:', error);
        // Continue even if parsing fails
    }

    // Create document record
    const documentTitle = title || path.basename(req.file.originalname, path.extname(req.file.originalname));
    
    const result = db.prepare(`
        INSERT INTO documents (notebook_id, user_id, title, original_filename, file_path, file_type, file_size, content_text, content_json, word_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        notebook_id,
        userId,
        documentTitle,
        req.file.originalname,
        filePath,
        fileType,
        req.file.size,
        contentText,
        contentJson,
        wordCount
    );

    const document = db.prepare(
        'SELECT * FROM documents WHERE id = ?'
    ).get(result.lastInsertRowid);

    // Create chunks for RAG (simple chunking)
    if (contentText) {
        createDocumentChunks(db, result.lastInsertRowid, contentText);
    }

    // Update notebook timestamp
    db.prepare(
        'UPDATE notebooks SET updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(notebook_id);

    res.status(201).json({
        success: true,
        data: { document }
    });
}));

/**
 * Create document chunks for full-text search
 */
function createDocumentChunks(db, documentId, content) {
    const chunkSize = 500;  // characters
    const overlap = 50;
    
    const chunks = [];
    let start = 0;
    let index = 0;
    
    while (start < content.length) {
        let end = Math.min(start + chunkSize, content.length);
        
        // Try to break at sentence or paragraph
        if (end < content.length) {
            const lastPeriod = content.lastIndexOf('.', end);
            const lastNewline = content.lastIndexOf('\n', end);
            const breakPoint = Math.max(lastPeriod, lastNewline);
            
            if (breakPoint > start + chunkSize / 2) {
                end = breakPoint + 1;
            }
        }
        
        const chunkContent = content.substring(start, end).trim();
        if (chunkContent.length > 10) {
            chunks.push({
                document_id: documentId,
                chunk_index: index,
                content: chunkContent,
                start_pos: start,
                end_pos: end
            });
            index++;
        }
        
        start = end - overlap;
        if (start >= content.length) break;
    }

    // Insert chunks
    const stmt = db.prepare(
        'INSERT INTO document_chunks (document_id, chunk_index, content, start_pos, end_pos) VALUES (?, ?, ?, ?, ?)'
    );
    
    const insertMany = db.transaction((chunks) => {
        for (const chunk of chunks) {
            stmt.run(chunk.document_id, chunk.chunk_index, chunk.content, chunk.start_pos, chunk.end_pos);
        }
    });
    
    insertMany(chunks);
}

/**
 * Get document details
 * GET /api/documents/:id
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const db = getDatabase();

    const document = db.prepare(`
        SELECT d.*, n.title as notebook_title
        FROM documents d
        JOIN notebooks n ON d.notebook_id = n.id
        WHERE d.id = ? AND d.user_id = ?
    `).get(id, userId);

    if (!document) {
        return res.status(404).json({
            success: false,
            error: { message: 'Document not found', code: 'NOT_FOUND' }
        });
    }

    res.json({
        success: true,
        data: { document }
    });
}));

/**
 * Get document content (for AI queries)
 * GET /api/documents/:id/content
 */
router.get('/:id/content', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const db = getDatabase();

    const document = db.prepare(
        'SELECT id, title, content_text, content_json, word_count FROM documents WHERE id = ? AND user_id = ?'
    ).get(id, userId);

    if (!document) {
        return res.status(404).json({
            success: false,
            error: { message: 'Document not found', code: 'NOT_FOUND' }
        });
    }

    res.json({
        success: true,
        data: { document }
    });
}));

/**
 * Search within notebook documents
 * GET /api/documents/search?notebook_id=1&q=query
 */
router.get('/search', asyncHandler(async (req, res) => {
    const { notebook_id, q } = req.query;
    const userId = req.user.id;
    const db = getDatabase();

    if (!q || !notebook_id) {
        return res.status(400).json({
            success: false,
            error: { message: 'Query and notebook_id are required', code: 'VALIDATION_ERROR' }
        });
    }

    // Full-text search in document_chunks
    const results = db.prepare(`
        SELECT DISTINCT d.id, d.title, d.original_filename,
               dc.content as snippet,
               dc.start_pos, dc.end_pos
        FROM documents d
        JOIN document_chunks dc ON d.id = dc.document_id
        WHERE d.notebook_id = ? AND d.user_id = ?
          AND dc.content LIKE ?
        LIMIT 20
    `).all(notebook_id, userId, `%${q}%`);

    // Log search history
    db.prepare(
        'INSERT INTO search_history (user_id, query, notebook_id, results_count) VALUES (?, ?, ?, ?)'
    ).run(userId, q, notebook_id, results.length);

    res.json({
        success: true,
        data: { results, query: q }
    });
}));

/**
 * Delete document
 * DELETE /api/documents/:id
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const db = getDatabase();

    const document = db.prepare(
        'SELECT file_path, notebook_id FROM documents WHERE id = ? AND user_id = ?'
    ).get(id, userId);

    if (!document) {
        return res.status(404).json({
            success: false,
            error: { message: 'Document not found', code: 'NOT_FOUND' }
        });
    }

    // Delete file from disk
    try {
        if (fs.existsSync(document.file_path)) {
            fs.unlinkSync(document.file_path);
        }
    } catch (error) {
        console.error('Failed to delete file:', error);
    }

    // Delete from database (cascade handles chunks)
    db.prepare('DELETE FROM documents WHERE id = ?').run(id);

    // Update notebook timestamp
    db.prepare(
        'UPDATE notebooks SET updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(document.notebook_id);

    res.json({
        success: true,
        data: { message: 'Document deleted successfully' }
    });
}));

/**
 * Export document as Markdown (階段二)
 * GET /api/documents/:id/export
 */
router.get('/:id/export', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const db = getDatabase();

    const document = db.prepare(
        'SELECT title, content_text FROM documents WHERE id = ? AND user_id = ?'
    ).get(id, userId);

    if (!document) {
        return res.status(404).json({
            success: false,
            error: { message: 'Document not found', code: 'NOT_FOUND' }
        });
    }

    const markdown = `# ${document.title}\n\n${document.content_text || ''}`;

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="${document.title}.md"`);
    res.send(markdown);
}));

module.exports = router;
