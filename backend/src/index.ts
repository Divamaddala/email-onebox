import express from 'express';
import cors from 'cors';
import { config } from './config';
import { ElasticsearchService } from './services/ElasticsearchService';
import { ImapService } from './services/ImapService';
import { AIService } from './services/AIService';
import { VectorService } from './services/VectorService';
import { WebhookService } from './services/WebhookService';
import { EmailController } from './controllers/EmailController';
import { createEmailRoutes } from './routes/emailRoutes';

const app = express();

app.use(cors());
app.use(express.json());

const esService = new ElasticsearchService();
const aiService = new AIService();
const vectorService = new VectorService(aiService);
const webhookService = new WebhookService();
const imapService = new ImapService(esService);
const emailController = new EmailController(
  esService,
  aiService,
  vectorService,
  webhookService,
  imapService
);

app.use('/api/emails', createEmailRoutes(emailController));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

imapService.on('newEmail', async (email: any) => {
  console.log(`📧 New email received: ${email.subject}`);
  
  try {
    const category = await aiService.categorizeEmail(email);
    await esService.updateEmail(email.id, { category });
    
    if (category === 'Interested') {
      await webhookService.sendSlackNotification({ ...email, category });
      await webhookService.triggerExternalWebhook({ ...email, category });
    }
  } catch (error) {
    console.error('Error processing new email:', error);
  }
});

const startServer = async () => {
  try {
    console.log('🚀 Initializing Email Onebox...');
    
    await esService.initialize();
    console.log('✓ Elasticsearch connected');
    
    await vectorService.initialize();
    console.log('✓ Vector database initialized');
    
    await imapService.initializeAccounts();
    console.log('✓ IMAP accounts connected');
    
    app.listen(config.port, () => {
      console.log(`✓ Server running on port ${config.port}`);
      console.log(`✓ Health check: http://localhost:${config.port}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => {
  console.log('\n⊗ Shutting down gracefully...');
  imapService.disconnect();
  process.exit(0);
});

startServer();