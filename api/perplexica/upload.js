/**
 * Perplexica File Upload Handler
 * Handles PDF, DOCX, TXT file uploads
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.pdf', '.docx', '.txt', '.doc'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, and TXT files are allowed.'));
    }
  },
});

// Extract text from different file types
async function extractText(buffer, filename) {
  const ext = path.extname(filename).toLowerCase();

  try {
    if (ext === '.txt') {
      return buffer.toString('utf-8');
    } else if (ext === '.pdf') {
      // TODO: Implement PDF parsing with pdf-parse
      // For now, return placeholder
      return `[PDF Content from ${filename}]\nPDF parsing requires pdf-parse library.`;
    } else if (ext === '.docx' || ext === '.doc') {
      // TODO: Implement DOCX parsing with mammoth
      // For now, return placeholder
      return `[DOCX Content from ${filename}]\nDOCX parsing requires mammoth library.`;
    }

    return buffer.toString('utf-8');
  } catch (error) {
    console.error('Text extraction error:', error);
    return `[Unable to extract text from ${filename}]`;
  }
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Use multer middleware
  const uploadMiddleware = upload.array('files', 5); // Max 5 files

  uploadMiddleware(req, res, async (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ error: err.message });
    }

    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const processedFiles = await Promise.all(
        req.files.map(async (file) => {
          const fileId = crypto.randomBytes(16).toString('hex');
          const fileExtension = path.extname(file.originalname);
          const content = await extractText(file.buffer, file.originalname);

          return {
            fileId,
            fileName: file.originalname,
            fileExtension,
            content,
            size: file.size,
          };
        })
      );

      res.json({
        success: true,
        files: processedFiles,
      });
    } catch (error) {
      console.error('File processing error:', error);
      res.status(500).json({ error: 'Failed to process files' });
    }
  });
}

module.exports = { default: handler };
