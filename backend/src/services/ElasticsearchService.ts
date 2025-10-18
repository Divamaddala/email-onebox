import { Client } from '@elastic/elasticsearch';
import { config } from '../config';
import { Email, SearchQuery } from '../models/Email';

export class ElasticsearchService {
  private client: Client;
  private index = config.elasticsearch.index;

  constructor() {
    this.client = new Client({ node: config.elasticsearch.node });
  }

  async initialize(): Promise<void> {
    try {
      // Elasticsearch JS client returns { body } for many APIs in v8
      const existsResp: any = await this.client.indices.exists({ index: this.index });
      const exists = typeof existsResp === 'boolean' ? existsResp : existsResp.body;

      if (!exists) {
        try {
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
        } catch (err: any) {
          // Ignore race condition where index was created between exists check and create
          const errType = err?.meta?.body?.error?.type || err?.body?.error?.type;
          if (errType === 'resource_already_exists_exception') {
            console.warn(`Index ${this.index} already exists (race condition)`);
          } else {
            throw err;
          }
        }
      }
    } catch (err) {
      // Bubble up other errors
      throw err;
    }
  }

  async indexEmail(email: Email): Promise<void> {
    await this.client.index({
      index: this.index,
      id: email.id,
      document: email
    });
    await this.client.indices.refresh({ index: this.index });
  }

  async searchEmails(query: SearchQuery): Promise<Email[]> {
    const must: any[] = [];
    
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

    return response.hits.hits.map(hit => hit._source as Email);
  }

  async getEmailById(id: string): Promise<Email | null> {
    try {
      const response = await this.client.get({
        index: this.index,
        id
      });
      return response._source as Email;
    } catch {
      return null;
    }
  }

  async updateEmail(id: string, updates: Partial<Email>): Promise<void> {
    await this.client.update({
      index: this.index,
      id,
      doc: updates
    });
    await this.client.indices.refresh({ index: this.index });
  }

  async getAllEmails(from: number = 0, size: number = 100): Promise<Email[]> {
    const response = await this.client.search({
      index: this.index,
      body: {
        query: { match_all: {} },
        from,
        size,
        sort: [{ date: { order: 'desc' } }]
      }
    });

    return response.hits.hits.map(hit => hit._source as Email);
  }
}