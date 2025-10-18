import { Request, Response } from 'express';
import { ElasticsearchService } from '../services/ElasticsearchService';
import { AIService } from '../services/AIService';
import { VectorService } from '../services/VectorService';
import { WebhookService } from '../services/WebhookService';

// Lightweight interface for the ImapService used here. This avoids a hard import
// which in some toolchains can cause 'Cannot find module' diagnostics.
interface IImapService {
  syncNow(): Promise<void>;
}

export class EmailController {
  constructor(
    private esService: ElasticsearchService,
    private aiService: AIService,
    private vectorService: VectorService,
    private webhookService: WebhookService,
    private imapService: IImapService
  ) {}

  syncEmails = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.imapService.syncNow();
      res.json({ 
        success: true, 
        message: 'Email synchronization started' 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: 'Sync failed' 
      });
    }
  };

  getAllEmails = async (req: Request, res: Response): Promise<void> => {
    try {
      const from = parseInt(req.query.from as string) || 0;
      const size = parseInt(req.query.size as string) || 100;
      
      const emails = await this.esService.getAllEmails(from, size);
      res.json({ 
        success: true, 
        count: emails.length, 
        emails 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch emails' 
      });
    }
  };

  searchEmails = async (req: Request, res: Response): Promise<void> => {
    try {
      const query = {
        q: req.query.q as string,
        account: req.query.account as string,
        folder: req.query.folder as string,
        category: req.query.category as any,
        from: parseInt(req.query.from as string) || 0,
        size: parseInt(req.query.size as string) || 50
      };

      const emails = await this.esService.searchEmails(query);
      res.json({ 
        success: true, 
        count: emails.length, 
        emails 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: 'Search failed' 
      });
    }
  };

  getEmailById = async (req: Request, res: Response): Promise<void> => {
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
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch email' 
      });
    }
  };

  categorizeEmail = async (req: Request, res: Response): Promise<void> => {
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
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: 'Categorization failed' 
      });
    }
  };

  suggestReply = async (req: Request, res: Response): Promise<void> => {
    try {
      const email = await this.esService.getEmailById(req.params.id);
      
      if (!email) {
        res.status(404).json({ 
          success: false, 
          error: 'Email not found' 
        });
        return;
      }

      const context = await this.vectorService.getRelevantContext(
        `${email.subject} ${email.text.substring(0, 500)}`
      );

      const suggestedReply = await this.aiService.generateReply(email, context);

      res.json({ 
        success: true, 
        suggestedReply,
        context 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to generate reply' 
      });
    }
  };
}