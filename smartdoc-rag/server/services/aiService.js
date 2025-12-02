const OpenAI = require('openai');
const logger = require('../utils/logger');

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Generate embeddings for text using OpenAI's embedding model
   * @param {string} text - Text to generate embeddings for
   * @returns {Promise<number[]>} - Array of embedding values
   */
  async generateEmbeddings(text) {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
      }

      // Split text into chunks if it's too long (max 8192 tokens for text-embedding-ada-002)
      const chunks = this.splitTextIntoChunks(text, 8000);
      const embeddings = [];

      for (const chunk of chunks) {
        const response = await this.openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: chunk,
        });

        embeddings.push(response.data[0].embedding);
      }

      // If multiple chunks, average the embeddings
      if (embeddings.length > 1) {
        return this.averageEmbeddings(embeddings);
      }

      return embeddings[0];
    } catch (error) {
      logger.error('Error generating embeddings:', error);
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
  }

  /**
   * Generate AI response based on query and search results
   * @param {string} query - User's search query
   * @param {Array} searchResults - Relevant documents from vector search
   * @returns {Promise<string>} - AI-generated response
   */
  async generateResponse(query, searchResults) {
    try {
      // Prepare context from search results
      const context = searchResults
        .map((result, index) => `Document ${index + 1}: ${result.content}`)
        .join('\n\n');

      const systemPrompt = `You are SmartDoc RAG, an AI assistant specialized in document analysis and knowledge retrieval. 
Your task is to provide accurate, helpful responses based on the provided document context.

Guidelines:
- Use only information from the provided documents
- If the answer isn't in the documents, clearly state that
- Provide specific references to document sections when possible
- Be concise but comprehensive
- Maintain a professional and helpful tone`;

      const userPrompt = `Query: ${query}

Relevant Documents:
${context}

Please provide a comprehensive answer based on the above documents.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      });

      return response.choices[0].message.content;
    } catch (error) {
      logger.error('Error generating AI response:', error);
      throw new Error(`Failed to generate AI response: ${error.message}`);
    }
  }

  /**
   * Extract key topics and entities from text
   * @param {string} text - Text to analyze
   * @returns {Promise<Object>} - Extracted topics and entities
   */
  async extractTopicsAndEntities(text) {
    try {
      const prompt = `Analyze the following text and extract:
1. Key topics (max 10)
2. Important entities (people, organizations, locations, dates)
3. Main themes
4. Document type/category

Text: ${text.substring(0, 4000)}

Provide the response in JSON format with keys: topics, entities, themes, category.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.2,
      });

      try {
        return JSON.parse(response.choices[0].message.content);
      } catch (parseError) {
        logger.warn('Failed to parse AI analysis response as JSON');
        return {
          topics: [],
          entities: [],
          themes: [],
          category: 'unknown'
        };
      }
    } catch (error) {
      logger.error('Error extracting topics and entities:', error);
      return {
        topics: [],
        entities: [],
        themes: [],
        category: 'unknown'
      };
    }
  }

  /**
   * Generate a summary of the document
   * @param {string} text - Text to summarize
   * @param {number} maxLength - Maximum length of summary
   * @returns {Promise<string>} - Document summary
   */
  async generateSummary(text, maxLength = 200) {
    try {
      const prompt = `Provide a concise summary of the following document in approximately ${maxLength} words:

${text.substring(0, 4000)}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: Math.ceil(maxLength * 1.5),
        temperature: 0.3,
      });

      return response.choices[0].message.content;
    } catch (error) {
      logger.error('Error generating summary:', error);
      return 'Summary generation failed';
    }
  }

  /**
   * Split text into chunks for processing
   * @param {string} text - Text to split
   * @param {number} maxChunkSize - Maximum size of each chunk
   * @returns {string[]} - Array of text chunks
   */
  splitTextIntoChunks(text, maxChunkSize = 8000) {
    const chunks = [];
    let currentChunk = '';
    const sentences = text.split(/[.!?]+/);

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = sentence;
        } else {
          // If single sentence is too long, split by words
          const words = sentence.split(' ');
          let wordChunk = '';
          for (const word of words) {
            if ((wordChunk + ' ' + word).length > maxChunkSize) {
              if (wordChunk) {
                chunks.push(wordChunk.trim());
                wordChunk = word;
              }
            } else {
              wordChunk += ' ' + word;
            }
          }
          if (wordChunk) {
            chunks.push(wordChunk.trim());
          }
        }
      } else {
        currentChunk += sentence + '.';
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter(chunk => chunk.length > 0);
  }

  /**
   * Average multiple embedding vectors
   * @param {number[][]} embeddings - Array of embedding vectors
   * @returns {number[]} - Averaged embedding vector
   */
  averageEmbeddings(embeddings) {
    if (embeddings.length === 0) return [];
    if (embeddings.length === 1) return embeddings[0];

    const dimensions = embeddings[0].length;
    const averaged = new Array(dimensions).fill(0);

    for (const embedding of embeddings) {
      for (let i = 0; i < dimensions; i++) {
        averaged[i] += embedding[i];
      }
    }

    for (let i = 0; i < dimensions; i++) {
      averaged[i] /= embeddings.length;
    }

    return averaged;
  }
}

module.exports = new AIService();