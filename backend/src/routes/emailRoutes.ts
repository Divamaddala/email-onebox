import { Router } from 'express';
import { EmailController } from '../controllers/EmailController';

export const createEmailRoutes = (controller: EmailController): Router => {
  const router = Router();

  router.get('/sync', controller.syncEmails);
  router.get('/', controller.getAllEmails);
  router.get('/search', controller.searchEmails);
  router.get('/:id', controller.getEmailById);
  router.post('/:id/categorize', controller.categorizeEmail);
  router.post('/:id/suggest-reply', controller.suggestReply);

  return router;
};