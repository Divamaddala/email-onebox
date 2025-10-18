import { Pinecone } from '@pinecone-database/pinecone';
import { config } from '../config';
import { AIService } from './AIService';

export class VectorService {
  private pinecone?: Pinecone;
  private aiService: AIService;
  private indexName = config.pinecone.index;
  private enabled: boolean = true;

  constructor(aiService: AIService) {
    this.aiService = aiService;

    if (!config.pinecone?.apiKey || !config.pinecone?.environment) {
      console.warn('Pinecone credentials missing - vector DB disabled');
      this.enabled = false;
      return;
    }

    this.pinecone = new Pinecone({
      apiKey: config.pinecone.apiKey,
      environment: config.pinecone.environment
    });
  }

  async initialize(): Promise<void> {
    try {
      if (!this.enabled) {
        console.log('VectorService disabled (no Pinecone credentials). Skipping initialization.');
        return;
      }
      // listIndexes may return different shapes depending on SDK version.
  if (!this.pinecone) return;
  const listRes: any = await this.pinecone.listIndexes();

      // Normalize to array of names or objects
      let indexExists = false;
      if (Array.isArray(listRes)) {
        // older/newer SDK might return an array of strings
        indexExists = listRes.includes(this.indexName);
      } else if (Array.isArray(listRes.indexes)) {
        indexExists = listRes.indexes.some((idx: any) => {
          return (typeof idx === 'string' && idx === this.indexName) || (idx && idx.name === this.indexName);
        });
      } else if (typeof listRes.indexes === 'string') {
        indexExists = listRes.indexes === this.indexName;
      }

      if (!indexExists) {
        // createIndex can take time to provision. Add retries and guard params.
  if (!this.pinecone) return;
  await this.pinecone.createIndex({
          name: this.indexName,
          dimension: 1536,
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1'
            }
          }
        } as any);

        // wait for index to become available (try a few times)
        const maxAttempts = 6;
        const delayMs = 3000;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          try {
            if (!this.pinecone) return;
            const names: any = await this.pinecone.listIndexes();
            const existsNow = Array.isArray(names) ? names.includes(this.indexName) : (Array.isArray(names.indexes) ? names.indexes.some((i: any) => (i && (i.name === this.indexName || i === this.indexName))) : false);
            if (existsNow) break;
          } catch (err) {
            // ignore and retry
          }
          // eslint-disable-next-line no-await-in-loop
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }

      await this.storeProductContext();
    } catch (error) {
      console.error('Vector service initialization error:', error);
    }
  }

  private async storeProductContext(): Promise<void> {
    if (!this.enabled) return;
  if (!this.pinecone) return;
  const index = this.pinecone.index(this.indexName);
    
    const contexts = [
      {
        id: 'product-context',
        text: config.rag.productContext
      },
      {
        id: 'outreach-agenda',
        text: config.rag.outreachAgenda
      }
    ];

    for (const ctx of contexts) {
      const embedding = await this.aiService.generateEmbedding(ctx.text);

      if (!Array.isArray(embedding) || embedding.length === 0) {
        console.warn(`Skipping upsert for ${ctx.id}: empty embedding`);
        continue;
      }

      await index.upsert([
        {
          id: ctx.id,
          values: embedding,
          metadata: { text: ctx.text }
        }
      ]);
    }

    console.log('✓ Product context stored in vector database');
  }

  async getRelevantContext(query: string): Promise<string> {
    try {
      if (!this.enabled) {
        // Return RAG defaults
        return `${config.rag.productContext}\n\n${config.rag.outreachAgenda}`;
      }
  if (!this.pinecone) return `${config.rag.productContext}\n\n${config.rag.outreachAgenda}`;
  const index = this.pinecone.index(this.indexName);
      const queryEmbedding = await this.aiService.generateEmbedding(query);
      if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
        throw new Error('Empty query embedding');
      }

      const results: any = await index.query({
        vector: queryEmbedding,
        topK: 2,
        includeMetadata: true
      });

      const matches = Array.isArray(results.matches) ? results.matches : (Array.isArray(results) ? results : []);

      const contexts = matches
        .map((match: any) => (match && match.metadata && match.metadata.text) || (match?.metadata?.text) || '')
        .filter(Boolean);

      if (contexts.length === 0) {
        return `${config.rag.productContext}\n\n${config.rag.outreachAgenda}`;
      }

      return contexts.join('\n\n');
    } catch (error) {
      console.error('Error fetching context:', error);
      return `${config.rag.productContext}\n\n${config.rag.outreachAgenda}`;
    }
  }
}