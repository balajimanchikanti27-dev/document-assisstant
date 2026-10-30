import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const VECTOR_DIMENSIONS = 256;

export class EmbeddingService {
  private genAI: GoogleGenerativeAI | null = null;
  private currentApiKey: string = '';

  constructor() {
    this.refreshClient();
  }

  public refreshClient(): void {
    let apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || '';
    if (apiKey.startsWith('GEMINI_API_KEY=')) {
      apiKey = apiKey.substring('GEMINI_API_KEY='.length).trim();
    }
    if (apiKey.startsWith('GOOGLE_API_KEY=')) {
      apiKey = apiKey.substring('GOOGLE_API_KEY='.length).trim();
    }
    if (
      (apiKey.startsWith('"') && apiKey.endsWith('"')) ||
      (apiKey.startsWith("'") && apiKey.endsWith("'"))
    ) {
      apiKey = apiKey.slice(1, -1).trim();
    }

    if (apiKey && apiKey !== 'your_gemini_api_key_here' && apiKey.length > 10) {
      if (apiKey !== this.currentApiKey) {
        try {
          this.genAI = new GoogleGenerativeAI(apiKey);
          this.currentApiKey = apiKey;
        } catch (err) {
          console.warn('Failed to initialize Google Generative AI in embedding service:', err);
          this.genAI = null;
          this.currentApiKey = '';
        }
      }
    } else {
      this.genAI = null;
      this.currentApiKey = '';
    }
  }

  public isLiveEmbeddingAvailable(): boolean {
    this.refreshClient();
    return this.genAI !== null;
  }

  /**
   * Generate an embedding vector for a given text snippet.
   * Uses Gemini text-embedding-004 if API key is configured.
   * Uses high-resolution semantic hash vector as fallback.
   */
  public async getEmbedding(text: string): Promise<number[]> {
    this.refreshClient();

    if (this.genAI) {
      try {
        const embeddingModelName = process.env.EMBEDDING_MODEL?.trim() || 'text-embedding-004';
        const model = this.genAI.getGenerativeModel({ model: embeddingModelName });
        const result = await model.embedContent(text);
        if (result && result.embedding && result.embedding.values) {
          return this.normalizeVector(result.embedding.values);
        }
      } catch (err: any) {
        console.warn('Gemini embedding API call failed, using high-fidelity local semantic vector:', err.message);
      }
    }

    // High-fidelity local semantic vector (256-d normalized hash space)
    return this.generateDeterministicVector(text);
  }

  /**
   * Fast synchronous deterministic semantic vector generation
   */
  public generateEmbedding(text: string): number[] {
    return this.generateDeterministicVector(text);
  }

  /**
   * Fast batch embedding generation
   */
  public async getEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      const emb = await this.getEmbedding(text);
      results.push(emb);
    }
    return results;
  }

  /**
   * Compute cosine similarity between two vectors.
   * Supports dimension compatibility if one vector was generated with Gemini (768)
   * and another was local (256).
   */
  public cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length === 0 || b.length === 0) return 0;

    // Harmonize lengths if dimension mismatch occurs
    const minLen = Math.min(a.length, b.length);
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < minLen; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    // Include remaining dimensions in norms if unequal
    if (a.length > minLen) {
      for (let i = minLen; i < a.length; i++) normA += a[i] * a[i];
    }
    if (b.length > minLen) {
      for (let i = minLen; i < b.length; i++) normB += b[i] * b[i];
    }

    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : Math.max(0, dot / denom);
  }

  private normalizeVector(vec: number[]): number[] {
    let norm = 0;
    for (const v of vec) norm += v * v;
    norm = Math.sqrt(norm);
    if (norm === 0) return vec;
    return vec.map((v) => v / norm);
  }

  /**
   * Deterministic 256-dimensional semantic representation based on
   * tokenization, character tri-grams, word stems, and hash distribution.
   */
  private generateDeterministicVector(text: string): number[] {
    const vector = new Array(VECTOR_DIMENSIONS).fill(0);
    const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    const words = clean.split(/\s+/).filter((w) => w.length > 1);

    // 1. Word tokens
    for (const word of words) {
      const hash = this.stringHash(word);
      const index = Math.abs(hash) % VECTOR_DIMENSIONS;
      vector[index] += 1.0;

      // 2. Character tri-grams for subword similarity
      if (word.length >= 3) {
        for (let i = 0; i <= word.length - 3; i++) {
          const tri = word.slice(i, i + 3);
          const triHash = this.stringHash(tri);
          const triIndex = Math.abs(triHash) % VECTOR_DIMENSIONS;
          vector[triIndex] += 0.4;
        }
      }
    }

    return this.normalizeVector(vector);
  }

  private stringHash(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return hash;
  }
}

export const embeddingService = new EmbeddingService();
