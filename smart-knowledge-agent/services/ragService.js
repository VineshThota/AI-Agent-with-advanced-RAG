const { OpenAI } = require('openai');
const { Pinecone } = require('@pinecone-database/pinecone');
const { v4: uuidv4 } = require('uuid');

class RAGService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    
    this.indexName = process.env.PINECONE_INDEX_NAME || 'smart-knowledge-agent';
    this.index = null;
    this.initializePinecone();
  }

  async initializePinecone() {
    try {
      this.index = this.pinecone.index(this.indexName);
      console.log('✅ Pinecone initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Pinecone:', error);
    }
  }

  async generateEmbedding(text) {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  async addKnowledge(text, metadata = {}) {
    try {
      const embedding = await this.generateEmbedding(text);
      const id = uuidv4();
      
      await this.index.upsert([
        {
          id,
          values: embedding,
          metadata: {
            text,
            timestamp: new Date().toISOString(),
            ...metadata
          }
        }
      ]);
      
      return { id, success: true };
    } catch (error) {
      console.error('Error adding knowledge:', error);
      throw error;
    }
  }

  async searchKnowledge(query, topK = 5) {
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      
      const searchResults = await this.index.query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
        includeValues: false
      });
      
      return searchResults.matches.map(match => ({
        id: match.id,
        score: match.score,
        text: match.metadata.text,
        metadata: match.metadata
      }));
    } catch (error) {
      console.error('Error searching knowledge:', error);
      throw error;
    }
  }

  async generateResponse(query, context) {
    try {
      const systemPrompt = `You are SmartKnowledge Agent, an AI assistant that helps users find and synthesize information from multiple knowledge sources. 
      
      Use the provided context to answer the user's question accurately and comprehensively. If the context doesn't contain enough information, say so clearly.
      
      Context:
      ${context.map((item, index) => `${index + 1}. ${item.text}`).join('\n\n')}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating response:', error);
      throw error;
    }
  }

  async processQuery(query) {
    try {
      // Search for relevant knowledge
      const relevantKnowledge = await this.searchKnowledge(query);
      
      if (relevantKnowledge.length === 0) {
        return {
          response: "I couldn't find any relevant information in the knowledge base for your query. Please try rephrasing your question or add more context.",
          sources: [],
          confidence: 0
        };
      }
      
      // Generate response using RAG
      const response = await this.generateResponse(query, relevantKnowledge);
      
      // Calculate average confidence score
      const avgConfidence = relevantKnowledge.reduce((sum, item) => sum + item.score, 0) / relevantKnowledge.length;
      
      return {
        response,
        sources: relevantKnowledge.map(item => ({
          id: item.id,
          text: item.text.substring(0, 200) + '...',
          score: item.score,
          metadata: item.metadata
        })),
        confidence: avgConfidence
      };
    } catch (error) {
      console.error('Error processing query:', error);
      throw error;
    }
  }

  async getKnowledgeStats() {
    try {
      const stats = await this.index.describeIndexStats();
      return {
        totalVectors: stats.totalVectorCount,
        dimension: stats.dimension,
        indexFullness: stats.indexFullness
      };
    } catch (error) {
      console.error('Error getting knowledge stats:', error);
      throw error;
    }
  }
}

module.exports = new RAGService();