const express = require('express');
const router = express.Router();
const ragService = require('../services/ragService');

// GET /api/health - Basic health check
router.get('/', async (req, res) => {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      services: {
        api: 'healthy',
        database: 'unknown',
        vectorDb: 'unknown',
        openai: 'unknown'
      }
    };

    // Test vector database connection
    try {
      await ragService.getKnowledgeStats();
      healthStatus.services.vectorDb = 'healthy';
    } catch (error) {
      healthStatus.services.vectorDb = 'unhealthy';
      healthStatus.status = 'degraded';
    }

    // Test OpenAI connection
    try {
      await ragService.generateEmbedding('health check');
      healthStatus.services.openai = 'healthy';
    } catch (error) {
      healthStatus.services.openai = 'unhealthy';
      healthStatus.status = 'degraded';
    }

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
    
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// GET /api/health/detailed - Detailed health check
router.get('/detailed', async (req, res) => {
  try {
    const detailedHealth = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      system: {
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
          external: process.memoryUsage().external,
          rss: process.memoryUsage().rss
        },
        cpu: {
          usage: process.cpuUsage()
        },
        platform: process.platform,
        nodeVersion: process.version
      },
      services: {
        api: { status: 'healthy', responseTime: 0 },
        vectorDb: { status: 'unknown', responseTime: 0 },
        openai: { status: 'unknown', responseTime: 0 }
      }
    };

    // Test vector database with timing
    const vectorDbStart = Date.now();
    try {
      const stats = await ragService.getKnowledgeStats();
      detailedHealth.services.vectorDb = {
        status: 'healthy',
        responseTime: Date.now() - vectorDbStart,
        stats: stats
      };
    } catch (error) {
      detailedHealth.services.vectorDb = {
        status: 'unhealthy',
        responseTime: Date.now() - vectorDbStart,
        error: error.message
      };
      detailedHealth.status = 'degraded';
    }

    // Test OpenAI with timing
    const openaiStart = Date.now();
    try {
      await ragService.generateEmbedding('health check test');
      detailedHealth.services.openai = {
        status: 'healthy',
        responseTime: Date.now() - openaiStart
      };
    } catch (error) {
      detailedHealth.services.openai = {
        status: 'unhealthy',
        responseTime: Date.now() - openaiStart,
        error: error.message
      };
      detailedHealth.status = 'degraded';
    }

    const statusCode = detailedHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(detailedHealth);
    
  } catch (error) {
    console.error('Detailed health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// GET /api/health/ready - Readiness probe
router.get('/ready', async (req, res) => {
  try {
    // Check if all critical services are ready
    const checks = [];
    
    // Check vector database
    try {
      await ragService.getKnowledgeStats();
      checks.push({ service: 'vectorDb', status: 'ready' });
    } catch (error) {
      checks.push({ service: 'vectorDb', status: 'not ready', error: error.message });
    }
    
    // Check OpenAI
    try {
      await ragService.generateEmbedding('readiness check');
      checks.push({ service: 'openai', status: 'ready' });
    } catch (error) {
      checks.push({ service: 'openai', status: 'not ready', error: error.message });
    }
    
    const allReady = checks.every(check => check.status === 'ready');
    
    res.status(allReady ? 200 : 503).json({
      ready: allReady,
      timestamp: new Date().toISOString(),
      checks
    });
    
  } catch (error) {
    console.error('Readiness check failed:', error);
    res.status(503).json({
      ready: false,
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// GET /api/health/live - Liveness probe
router.get('/live', (req, res) => {
  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;