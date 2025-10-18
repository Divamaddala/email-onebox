"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config");
const ElasticsearchService_1 = require("./services/ElasticsearchService");
const ImapService_1 = require("./services/ImapService");
const AIService_1 = require("./services/AIService");
const VectorService_1 = require("./services/VectorService");
const WebhookService_1 = require("./services/WebhookService");
const EmailController_1 = require("./controllers/EmailController");
const emailRoutes_1 = require("./routes/emailRoutes");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const esService = new ElasticsearchService_1.ElasticsearchService();
const aiService = new AIService_1.AIService();
const vectorService = new VectorService_1.VectorService(aiService);
const webhookService = new WebhookService_1.WebhookService();
const imapService = new ImapService_1.ImapService(esService);
const emailController = new EmailController_1.EmailController(esService, aiService, vectorService, webhookService, imapService);
app.use('/api/emails', (0, emailRoutes_1.createEmailRoutes)(emailController));
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
imapService.on('newEmail', async (email) => {
    console.log(`📧 New email received: ${email.subject}`);
    try {
        const category = await aiService.categorizeEmail(email);
        await esService.updateEmail(email.id, { category });
        if (category === 'Interested') {
            await webhookService.sendSlackNotification({ ...email, category });
            await webhookService.triggerExternalWebhook({ ...email, category });
        }
    }
    catch (error) {
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
        app.listen(config_1.config.port, () => {
            console.log(`✓ Server running on port ${config_1.config.port}`);
            console.log(`✓ Health check: http://localhost:${config_1.config.port}/health`);
        });
    }
    catch (error) {
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
