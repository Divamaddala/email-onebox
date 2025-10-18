"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorService = void 0;
const pinecone_1 = require("@pinecone-database/pinecone");
const config_1 = require("../config");
class VectorService {
    constructor(aiService) {
        this.indexName = config_1.config.pinecone.index;
        this.enabled = true;
        this.aiService = aiService;
        if (!config_1.config.pinecone?.apiKey || !config_1.config.pinecone?.environment) {
            console.warn('Pinecone credentials missing - vector DB disabled');
            this.enabled = false;
            return;
        }
        this.pinecone = new pinecone_1.Pinecone({
            apiKey: config_1.config.pinecone.apiKey,
            environment: config_1.config.pinecone.environment
        });
    }
    async initialize() {
        try {
            if (!this.enabled) {
                console.log('VectorService disabled (no Pinecone credentials). Skipping initialization.');
                return;
            }
            // listIndexes may return different shapes depending on SDK version.
            if (!this.pinecone)
                return;
            const listRes = await this.pinecone.listIndexes();
            // Normalize to array of names or objects
            let indexExists = false;
            if (Array.isArray(listRes)) {
                // older/newer SDK might return an array of strings
                indexExists = listRes.includes(this.indexName);
            }
            else if (Array.isArray(listRes.indexes)) {
                indexExists = listRes.indexes.some((idx) => {
                    return (typeof idx === 'string' && idx === this.indexName) || (idx && idx.name === this.indexName);
                });
            }
            else if (typeof listRes.indexes === 'string') {
                indexExists = listRes.indexes === this.indexName;
            }
            if (!indexExists) {
                // createIndex can take time to provision. Add retries and guard params.
                if (!this.pinecone)
                    return;
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
                });
                // wait for index to become available (try a few times)
                const maxAttempts = 6;
                const delayMs = 3000;
                for (let attempt = 0; attempt < maxAttempts; attempt++) {
                    try {
                        if (!this.pinecone)
                            return;
                        const names = await this.pinecone.listIndexes();
                        const existsNow = Array.isArray(names) ? names.includes(this.indexName) : (Array.isArray(names.indexes) ? names.indexes.some((i) => (i && (i.name === this.indexName || i === this.indexName))) : false);
                        if (existsNow)
                            break;
                    }
                    catch (err) {
                        // ignore and retry
                    }
                    // eslint-disable-next-line no-await-in-loop
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            }
            await this.storeProductContext();
        }
        catch (error) {
            console.error('Vector service initialization error:', error);
        }
    }
    async storeProductContext() {
        if (!this.enabled)
            return;
        if (!this.pinecone)
            return;
        const index = this.pinecone.index(this.indexName);
        const contexts = [
            {
                id: 'product-context',
                text: config_1.config.rag.productContext
            },
            {
                id: 'outreach-agenda',
                text: config_1.config.rag.outreachAgenda
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
    async getRelevantContext(query) {
        try {
            if (!this.enabled) {
                // Return RAG defaults
                return `${config_1.config.rag.productContext}\n\n${config_1.config.rag.outreachAgenda}`;
            }
            if (!this.pinecone)
                return `${config_1.config.rag.productContext}\n\n${config_1.config.rag.outreachAgenda}`;
            const index = this.pinecone.index(this.indexName);
            const queryEmbedding = await this.aiService.generateEmbedding(query);
            if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
                throw new Error('Empty query embedding');
            }
            const results = await index.query({
                vector: queryEmbedding,
                topK: 2,
                includeMetadata: true
            });
            const matches = Array.isArray(results.matches) ? results.matches : (Array.isArray(results) ? results : []);
            const contexts = matches
                .map((match) => (match && match.metadata && match.metadata.text) || (match?.metadata?.text) || '')
                .filter(Boolean);
            if (contexts.length === 0) {
                return `${config_1.config.rag.productContext}\n\n${config_1.config.rag.outreachAgenda}`;
            }
            return contexts.join('\n\n');
        }
        catch (error) {
            console.error('Error fetching context:', error);
            return `${config_1.config.rag.productContext}\n\n${config_1.config.rag.outreachAgenda}`;
        }
    }
}
exports.VectorService = VectorService;
