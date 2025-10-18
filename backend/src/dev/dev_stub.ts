import { AIService } from '../services/AIService';
import { WebhookService } from '../services/WebhookService';
import { ElasticsearchService } from '../services/ElasticsearchService';
import { VectorService } from '../services/VectorService';
import { Email } from '../models/Email';

(async () => {
  console.log('Starting dev stub...\n');

  const es = new ElasticsearchService();
  const ai = new AIService();
  const vector = new VectorService(ai as any);
  const webhook = new WebhookService();

  // create a fake email
  const email: Email = {
    id: 'stub-1',
    accountId: 'account1',
    accountEmail: 'test@example.com',
    folder: 'INBOX',
    uid: 1,
    messageId: 'msg-1',
    from: { address: 'sender@example.com', name: 'Sender Name' },
    to: [],
    subject: 'Interested in your product',
    text: 'Hi, I would like to learn more about your product and pricing.',
    html: undefined,
    date: new Date(),
    receivedAt: new Date()
  };

  console.log('Email created:\n', JSON.stringify({ subject: email.subject, text: email.text }, null, 2));

  const category = await ai.categorizeEmail(email);
  console.log('\nCategorized as:', category);

  const context = await vector.getRelevantContext(`${email.subject} ${email.text.substring(0, 200)}`);
  console.log('\nRetrieved context (truncated):', context.substring(0, 200));

  const reply = await ai.generateReply(email, context);
  console.log('\nSuggested reply:\n', reply);

  console.log('\nSimulating webhook calls (no network if URLs not set)...');
  try {
    await webhook.sendSlackNotification(email);
    await webhook.triggerExternalWebhook(email);
  } catch (err) {
    console.error('Webhook simulation error:', err);
  }

  console.log('\nDev stub finished.');
})();
