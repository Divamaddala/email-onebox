import OpenAI from 'openai';
import { config } from '../config';
import { Email, EmailCategory } from '../models/Email';

export class AIService {
  private openai?: OpenAI;
  private enabled: boolean;

  constructor() {
    if (config.openai && config.openai.apiKey) {
      try {
        this.openai = new OpenAI({ apiKey: config.openai.apiKey });
        this.enabled = true;
      } catch (err) {
        console.warn('Failed to initialize OpenAI client, AI features disabled:', err);
        this.enabled = false;
      }
    } else {
      console.warn('OPENAI_API_KEY not provided. AI features are disabled.');
      this.enabled = false;
    }
  }

  async categorizeEmail(email: Email): Promise<EmailCategory> {
    const prompt = `Analyze this email and categorize it into ONE of these categories:
- Interested: Shows positive interest, wants to learn more
- Meeting Booked: Confirms or schedules a meeting
- Not Interested: Declines, not interested, or negative response
- Spam: Promotional, unsolicited, or spam
- Out of Office: Automated out of office reply

Email Details:
From: ${email.from.address}
Subject: ${email.subject}
Content: ${email.text.substring(0, 500)}

Reply with ONLY the category name.`;

    if (!this.enabled || !this.openai) {
      // Fallback: simple heuristic or default to Uncategorized
      console.warn('AI not enabled - returning Uncategorized for categorizeEmail');
      return 'Uncategorized';
    }

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 50
    });

    const category = completion.choices[0].message.content?.trim() as EmailCategory;
    
    const validCategories: EmailCategory[] = [
      'Interested', 
      'Meeting Booked', 
      'Not Interested', 
      'Spam', 
      'Out of Office'
    ];

    return validCategories.includes(category) ? category : 'Uncategorized';
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.enabled || !this.openai) {
      console.warn('AI not enabled - returning zero-vector embedding');
      // Return a zero vector matching the expected dimension (1536)
      return new Array(1536).fill(0);
    }

    const response = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text
    });

    return response.data[0].embedding;
  }

  async generateReply(email: Email, context: string): Promise<string> {
    const prompt = `You are an AI assistant helping to draft email replies.

Context about our product/service:
${context}

Email received:
From: ${email.from.address}
Subject: ${email.subject}
Content: ${email.text}

Generate a professional, concise reply based on the context provided. If the email shows interest, include relevant next steps or meeting links from the context.`;

    if (!this.enabled || !this.openai) {
      console.warn('AI not enabled - generateReply returning fallback message');
      return 'AI is not configured (OPENAI_API_KEY missing). Cannot generate reply.';
    }

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 300
    });

    return completion.choices[0].message.content || '';
  }
}