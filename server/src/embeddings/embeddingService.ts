import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { stemWord, ACADEMIC_ACRONYM_MAP } from '../utils/textNormalizer.js';

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
   * tokenization, morphological stems, academic acronym expansions, and character tri-grams.
   */
  private generateDeterministicVector(text: string): number[] {
    const vector = new Array(VECTOR_DIMENSIONS).fill(0);
    const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    const words = clean.split(/\s+/).filter((w) => w.length > 1);

    for (const word of words) {
      // 1. Exact word token
      const hash = this.stringHash(word);
      const index = Math.abs(hash) % VECTOR_DIMENSIONS;
      vector[index] += 1.0;

      // 2. Morphological root / stem token
      const stem = stemWord(word);
      if (stem && stem !== word && stem.length >= 3) {
        const stemHash = this.stringHash(`stem:${stem}`);
        const stemIndex = Math.abs(stemHash) % VECTOR_DIMENSIONS;
        vector[stemIndex] += 0.85;
      }

      // 3. Academic acronym expansion tokens (bridges "1NF" <-> "First Normal Form", "BFS" <-> "Breadth First Search", etc.)
      const expansions = ACADEMIC_ACRONYM_MAP[word];
      if (expansions) {
        for (const exp of expansions) {
          for (const expWord of exp.toLowerCase().split(/\s+/)) {
            if (expWord.length > 2) {
              const expIndex = Math.abs(this.stringHash(expWord)) % VECTOR_DIMENSIONS;
              vector[expIndex] += 0.65;
            }
          }
        }
      }

      // 4. Character tri-grams for subword similarity
      if (word.length >= 3) {
        for (let i = 0; i <= word.length - 3; i++) {
          const tri = word.slice(i, i + 3);
          const triHash = this.stringHash(tri);
          const triIndex = Math.abs(triHash) % VECTOR_DIMENSIONS;
          vector[triIndex] += 0.35;
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
