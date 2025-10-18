"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailController = void 0;
class EmailController {
    constructor(esService, aiService, vectorService, webhookService, imapService) {
        this.esService = esService;
        this.aiService = aiService;
        this.vectorService = vectorService;
        this.webhookService = webhookService;
        this.imapService = imapService;
        this.syncEmails = async (req, res) => {
            try {
                await this.imapService.syncNow();
                res.json({
                    success: true,
                    message: 'Email synchronization started'
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    error: 'Sync failed'
                });
            }
        };
        this.getAllEmails = async (req, res) => {
            try {
                const from = parseInt(req.query.from) || 0;
                const size = parseInt(req.query.size) || 100;
                const emails = await this.esService.getAllEmails(from, size);
                res.json({
                    success: true,
                    count: emails.length,
                    emails
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch emails'
                });
            }
        };
        this.searchEmails = async (req, res) => {
            try {
                const query = {
                    q: req.query.q,
                    account: req.query.account,
                    folder: req.query.folder,
                    category: req.query.category,
                    from: parseInt(req.query.from) || 0,
                    size: parseInt(req.query.size) || 50
                };
                const emails = await this.esService.searchEmails(query);
                res.json({
                    success: true,
                    count: emails.length,
                    emails
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    error: 'Search failed'
                });
            }
        };
        this.getEmailById = async (req, res) => {
            try {
                const email = await this.esService.getEmailById(req.params.id);
                if (!email) {
                    res.status(404).json({
                        success: false,
                        error: 'Email not found'
                    });
                    return;
                }
                res.json({
                    success: true,
                    email
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch email'
                });
            }
        };
        this.categorizeEmail = async (req, res) => {
            try {
                const email = await this.esService.getEmailById(req.params.id);
                if (!email) {
                    res.status(404).json({
                        success: false,
                        error: 'Email not found'
                    });
                    return;
                }
                const category = await this.aiService.categorizeEmail(email);
                await this.esService.updateEmail(email.id, { category });
                if (category === 'Interested') {
                    await this.webhookService.sendSlackNotification({ ...email, category });
                    await this.webhookService.triggerExternalWebhook({ ...email, category });
                }
                res.json({
                    success: true,
                    category,
                    email: { ...email, category }
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    error: 'Categorization failed'
                });
            }
        };
        this.suggestReply = async (req, res) => {
            try {
                const email = await this.esService.getEmailById(req.params.id);
                if (!email) {
                    res.status(404).json({
                        success: false,
                        error: 'Email not found'
                    });
                    return;
                }
                const context = await this.vectorService.getRelevantContext(`${email.subject} ${email.text.substring(0, 500)}`);
                const suggestedReply = await this.aiService.generateReply(email, context);
                res.json({
                    success: true,
                    suggestedReply,
                    context
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    error: 'Failed to generate reply'
                });
            }
        };
    }
}
exports.EmailController = EmailController;
