/**
 * File Parser Utilities
 * Parse PDF and TXT files
 */

const fs = require('fs');
const pdf = require('pdf-parse');

/**
 * Parse PDF file
 * @param {string} filePath - Path to PDF file
 * @returns {Promise<{text: string, pages: number, wordCount: number}>}
 */
async function parsePDF(filePath) {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);

        // Count words
        const wordCount = data.text.split(/\s+/).filter(word => word.length > 0).length;

        return {
            text: data.text,
            pages: data.numpages,
            wordCount,
            info: data.info,
            metadata: data.metadata,
            version: data.version
        };
    } catch (error) {
        console.error('PDF parse error:', error);
        throw new Error(`Failed to parse PDF: ${error.message}`);
    }
}

/**
 * Parse TXT/MD file
 * @param {string} filePath - Path to text file
 * @returns {Promise<{text: string, wordCount: number}>}
 */
async function parseTXT(filePath) {
    try {
        const text = fs.readFileSync(filePath, 'utf8');
        const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;

        return {
            text,
            wordCount,
            lines: text.split('\n').length,
            characters: text.length
        };
    } catch (error) {
        console.error('TXT parse error:', error);
        throw new Error(`Failed to parse text file: ${error.message}`);
    }
}

/**
 * Extract text from image (OCR) - Placeholder for future
 * Would need tesseract.js or similar
 */
async function parseImage(filePath) {
    throw new Error('OCR not implemented yet');
}

module.exports = {
    parsePDF,
    parseTXT,
    parseImage
};
