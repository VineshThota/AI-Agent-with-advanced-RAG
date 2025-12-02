const express = require('express');
const router = express.Router();
const ragService = require('../services/ragService');

// POST /api/chat/query - Process user query with RAG
router.post('/query', async (req, res) => {
  try {
    const { query, userId } = req.body;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Query is required and cannot be empty' 
      });
    }
    
    console.log(`💬 Processing query from user ${userId || 'anonymous'}: ${query}`);
    
    const result = await ragService.processQuery(query);
    
    res.json({
      success: true,
      data: {
        query,
        response: result.response,
        sources: result.sources,
        confidence: result.confidence,
        timestamp: new Date().toISOString(),
        userId: userId || null
      }
    });
    
  } catch (error) {
    console.error('Error processing chat query:', error);
    res.status(500).json({ 
      error: 'Failed to process query',
      message: error.message 
    });
  }
});

// GET /api/chat/history/:userId - Get chat history for a user
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    // TODO: Implement chat history storage and retrieval
    // For now, return empty history
    res.json({
      success: true,
      data: {
        userId,
        history: [],
        total: 0,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
    
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch chat history',
      message: error.message 
    });
  }
});

// POST /api/chat/feedback - Submit feedback on a response
router.post('/feedback', async (req, res) => {
  try {
    const { queryId, rating, feedback, userId } = req.body;
    
    if (!queryId || !rating) {
      return res.status(400).json({ 
        error: 'Query ID and rating are required' 
      });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        error: 'Rating must be between 1 and 5' 
      });
    }
    
    console.log(`📝 Feedback received for query ${queryId}: ${rating}/5`);
    
    // TODO: Store feedback in database for model improvement
    
    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        queryId,
        rating,
        feedback: feedback || null,
        userId: userId || null,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ 
      error: 'Failed to submit feedback',
      message: error.message 
    });
  }
});

// GET /api/chat/suggestions - Get query suggestions
router.get('/suggestions', async (req, res) => {
  try {
    const suggestions = [
      "How do I integrate multiple knowledge bases?",
      "What are the best practices for RAG implementation?",
      "How can I improve search accuracy in my knowledge system?",
      "What are the benefits of using vector databases?",
      "How do I handle multilingual knowledge bases?",
      "What metrics should I track for knowledge retrieval?",
      "How can I optimize embedding generation?",
      "What are common challenges in knowledge management?"
    ];
    
    // Randomize and return a subset of suggestions
    const shuffled = suggestions.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 4);
    
    res.json({
      success: true,
      data: {
        suggestions: selected,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch suggestions',
      message: error.message 
    });
  }
});

module.exports = router;