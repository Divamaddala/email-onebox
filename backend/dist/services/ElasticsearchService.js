"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElasticsearchService = void 0;
const elasticsearch_1 = require("@elastic/elasticsearch");
const config_1 = require("../config");
class ElasticsearchService {
    constructor() {
        this.index = config_1.config.elasticsearch.index;
        this.client = new elasticsearch_1.Client({ node: config_1.config.elasticsearch.node });
    }
    async initialize() {
        const exists = await this.client.indices.exists({ index: this.index });
        if (!exists) {
            await this.client.indices.create({
                index: this.index,
                body: {
                    mappings: {
                        properties: {
                            accountId: { type: 'keyword' },
                            accountEmail: { type: 'keyword' },
                            folder: { type: 'keyword' },
                            uid: { type: 'long' },
                            messageId: { type: 'keyword' },
                            'from.address': { type: 'keyword' },
                            'from.name': { type: 'text' },
                            subject: { type: 'text' },
                            text: { type: 'text' },
                            html: { type: 'text', index: false },
                            date: { type: 'date' },
                            category: { type: 'keyword' },
                            receivedAt: { type: 'date' }
                        }
                    }
                }
            });
        }
    }
    async indexEmail(email) {
        await this.client.index({
            index: this.index,
            id: email.id,
            document: email
        });
        await this.client.indices.refresh({ index: this.index });
    }
    async searchEmails(query) {
        const must = [];
        if (query.q) {
            must.push({
                multi_match: {
                    query: query.q,
                    fields: ['subject^2', 'text', 'from.name', 'from.address']
                }
            });
        }
        if (query.account) {
            must.push({ term: { accountEmail: query.account } });
        }
        if (query.folder) {
            must.push({ term: { folder: query.folder } });
        }
        if (query.category) {
            must.push({ term: { category: query.category } });
        }
        const response = await this.client.search({
            index: this.index,
            body: {
                query: must.length > 0 ? { bool: { must } } : { match_all: {} },
                from: query.from || 0,
                size: query.size || 50,
                sort: [{ date: { order: 'desc' } }]
            }
        });
        return response.hits.hits.map(hit => hit._source);
    }
    async getEmailById(id) {
        try {
            const response = await this.client.get({
                index: this.index,
                id
            });
            return response._source;
        }
        catch {
            return null;
        }
    }
    async updateEmail(id, updates) {
        await this.client.update({
            index: this.index,
            id,
            doc: updates
        });
        await this.client.indices.refresh({ index: this.index });
    }
    async getAllEmails(from = 0, size = 100) {
        const response = await this.client.search({
            index: this.index,
            body: {
                query: { match_all: {} },
                from,
                size,
                sort: [{ date: { order: 'desc' } }]
            }
        });
        return response.hits.hits.map(hit => hit._source);
    }
}
exports.ElasticsearchService = ElasticsearchService;
