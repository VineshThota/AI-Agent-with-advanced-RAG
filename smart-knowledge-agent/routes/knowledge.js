const express = require('express');
const router = express.Router();
const ragService = require('../services/ragService');

// POST /api/knowledge/add - Add new knowledge to the system
router.post('/add', async (req, res) => {
  try {
    const { text, metadata = {} } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Text content is required and cannot be empty' 
      });
    }
    
    console.log(`📚 Adding new knowledge: ${text.substring(0, 100)}...`);
    
    const result = await ragService.addKnowledge(text, metadata);
    
    res.json({
      success: true,
      message: 'Knowledge added successfully',
      data: {
        id: result.id,
        text: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
        metadata,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error adding knowledge:', error);
    res.status(500).json({ 
      error: 'Failed to add knowledge',
      message: error.message 
    });
  }
});

// GET /api/knowledge/search - Search knowledge base
router.get('/search', async (req, res) => {
  try {
    const { q: query, limit = 5 } = req.query;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Query parameter "q" is required and cannot be empty' 
      });
    }
    
    console.log(`🔍 Searching knowledge base: ${query}`);
    
    const results = await ragService.searchKnowledge(query, parseInt(limit));
    
    res.json({
      success: true,
      data: {
        query,
        results: results.map(item => ({
          id: item.id,
          text: item.text.substring(0, 300) + (item.text.length > 300 ? '...' : ''),
          score: item.score,
          metadata: item.metadata
        })),
        total: results.length,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error searching knowledge:', error);
    res.status(500).json({ 
      error: 'Failed to search knowledge',
      message: error.message 
    });
  }
});

// GET /api/knowledge/stats - Get knowledge base statistics
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 Fetching knowledge base statistics');
    
    const stats = await ragService.getKnowledgeStats();
    
    res.json({
      success: true,
      data: {
        ...stats,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error fetching knowledge stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch knowledge statistics',
      message: error.message 
    });
  }
});

// POST /api/knowledge/bulk-add - Add multiple knowledge items
router.post('/bulk-add', async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        error: 'Items array is required and cannot be empty' 
      });
    }
    
    console.log(`📚 Bulk adding ${items.length} knowledge items`);
    
    const results = [];
    const errors = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (!item.text || item.text.trim().length === 0) {
        errors.push({ index: i, error: 'Text content is required' });
        continue;
      }
      
      try {
        const result = await ragService.addKnowledge(item.text, item.metadata || {});
        results.push({ index: i, id: result.id, success: true });
      } catch (error) {
        errors.push({ index: i, error: error.message });
      }
    }
    
    res.json({
      success: errors.length === 0,
      message: `Processed ${items.length} items: ${results.length} successful, ${errors.length} failed`,
      data: {
        successful: results,
        failed: errors,
        total: items.length,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error bulk adding knowledge:', error);
    res.status(500).json({ 
      error: 'Failed to bulk add knowledge',
      message: error.message 
    });
  }
});

module.exports = router;