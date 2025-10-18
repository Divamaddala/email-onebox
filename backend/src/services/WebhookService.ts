import axios from 'axios';
import { config } from '../config';
import { Email } from '../models/Email';

export class WebhookService {
  async sendSlackNotification(email: Email): Promise<void> {
    try {
      const message = {
        text: '🎯 New Interested Email!',
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🎯 New Interested Email Received'
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*From:*\n${email.from.name || email.from.address}`
              },
              {
                type: 'mrkdwn',
                text: `*Account:*\n${email.accountEmail}`
              },
              {
                type: 'mrkdwn',
                text: `*Subject:*\n${email.subject}`
              },
              {
                type: 'mrkdwn',
                text: `*Date:*\n${email.date.toLocaleString()}`
              }
            ]
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Preview:*\n${email.text.substring(0, 200)}...`
            }
          }
        ]
      };

      await axios.post(config.slack.webhookUrl, message);
      console.log(`✓ Slack notification sent for: ${email.subject}`);
    } catch (error) {
      console.error('Slack notification error:', error);
    }
  }

  async triggerExternalWebhook(email: Email): Promise<void> {
    try {
      const payload = {
        event: 'email.interested',
        timestamp: new Date().toISOString(),
        email: {
          id: email.id,
          from: email.from,
          subject: email.subject,
          accountEmail: email.accountEmail,
          category: email.category,
          date: email.date
        }
      };

      await axios.post(config.webhook.externalUrl, payload, {
        headers: { 'Content-Type': 'application/json' }
      });
      console.log(`✓ External webhook triggered for: ${email.subject}`);
    } catch (error) {
      console.error('External webhook error:', error);
    }
  }
}