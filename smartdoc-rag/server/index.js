const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const documentProcessor = require('./services/documentProcessor');
const aiService = require('./services/aiService');
const vectorService = require('./services/vectorService');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx', '.txt', '.html'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, TXT, and HTML files are allowed.'));
    }
  }
});

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Document upload and processing
app.post('/api/documents/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    logger.info(`Processing document: ${req.file.originalname}`);

    // Extract text from document
    const extractedText = await documentProcessor.extractText(req.file.path, req.file.mimetype);
    
    // Generate embeddings
    const embeddings = await aiService.generateEmbeddings(extractedText);
    
    // Store in vector database
    const documentId = await vectorService.storeDocument({
      filename: req.file.originalname,
      content: extractedText,
      embeddings: embeddings,
      metadata: {
        uploadDate: new Date().toISOString(),
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      }
    });

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      documentId: documentId,
      filename: req.file.originalname,
      contentLength: extractedText.length,
      message: 'Document processed and indexed successfully'
    });

  } catch (error) {
    logger.error('Document processing error:', error);
    res.status(500).json({ error: 'Failed to process document', details: error.message });
  }
});

// Search documents
app.post('/api/documents/search', async (req, res) => {
  try {
    const { query, limit = 5 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    logger.info(`Searching for: ${query}`);

    // Generate query embeddings
    const queryEmbeddings = await aiService.generateEmbeddings(query);
    
    // Search vector database
    const results = await vectorService.searchSimilar(queryEmbeddings, limit);
    
    // Generate AI-powered response
    const aiResponse = await aiService.generateResponse(query, results);

    res.json({
      success: true,
      query: query,
      results: results,
      aiResponse: aiResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Search error:', error);
    res.status(500).json({ error: 'Search failed', details: error.message });
  }
});

// Get document analytics
app.get('/api/analytics', async (req, res) => {
  try {
    const stats = await vectorService.getAnalytics();
    res.json({
      success: true,
      analytics: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics', details: error.message });
  }
});

// List all documents
app.get('/api/documents', async (req, res) => {
  try {
    const documents = await vectorService.listDocuments();
    res.json({
      success: true,
      documents: documents,
      count: documents.length
    });
  } catch (error) {
    logger.error('List documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents', details: error.message });
  }
});

// Delete document
app.delete('/api/documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await vectorService.deleteDocument(id);
    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    logger.error('Delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document', details: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error', details: error.message });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`SmartDoc RAG server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;