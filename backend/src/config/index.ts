import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
    index: 'emails'
  },
  imapAccounts: [
    {
      id: 'account1',
      email: process.env.IMAP_ACCOUNT_1_EMAIL!,
      password: process.env.IMAP_ACCOUNT_1_PASSWORD!,
      host: process.env.IMAP_ACCOUNT_1_HOST || 'imap.gmail.com',
      port: parseInt(process.env.IMAP_ACCOUNT_1_PORT || '993'),
      tls: true
    },
    {
      id: 'account2',
      email: process.env.IMAP_ACCOUNT_2_EMAIL!,
      password: process.env.IMAP_ACCOUNT_2_PASSWORD!,
      host: process.env.IMAP_ACCOUNT_2_HOST || 'imap.gmail.com',
      port: parseInt(process.env.IMAP_ACCOUNT_2_PORT || '993'),
      tls: true
    }
  ],
  openai: {
    apiKey: process.env.OPENAI_API_KEY!
  },
  slack: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL!
  },
  webhook: {
    externalUrl: process.env.EXTERNAL_WEBHOOK_URL!
  },
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY!,
    environment: process.env.PINECONE_ENVIRONMENT!,
    index: process.env.PINECONE_INDEX || 'email-context'
  },
  rag: {
    productContext: process.env.PRODUCT_CONTEXT || '',
    outreachAgenda: process.env.OUTREACH_AGENDA || ''
  }
};