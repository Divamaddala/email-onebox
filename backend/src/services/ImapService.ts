import Imap from 'imap';
// use require for mailparser to avoid runtime TS declaration resolution issues
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mailparser: any = require('mailparser');
const simpleParser: (stream: NodeJS.ReadableStream, callback: (err: Error | null, parsed: any) => void) => void = mailparser.simpleParser || mailparser;
import { config } from '../config';
import { Email } from '../models/Email';
import { ElasticsearchService } from './ElasticsearchService';
import { EventEmitter } from 'events';
import crypto from 'crypto';

export class ImapService extends EventEmitter {
  private connections: Map<string, Imap> = new Map();
  private esService: ElasticsearchService;

  constructor(esService: ElasticsearchService) {
    super();
    this.esService = esService;
  }

  async initializeAccounts(): Promise<void> {
    for (const account of config.imapAccounts) {
      await this.connectAccount(account);
    }
  }

  private async connectAccount(account: typeof config.imapAccounts[0]): Promise<void> {
    const imap = new Imap({
      user: account.email,
      password: account.password,
      host: account.host,
      port: account.port,
      tls: account.tls,
      tlsOptions: { rejectUnauthorized: false }
    });

    this.connections.set(account.id, imap);

    const acctLabel = (acct: typeof account) => acct?.email || acct?.id || 'unknown-account';

    imap.once('ready', () => {
      console.log(`✓ Connected to ${acctLabel(account)}`);
      this.syncLastThirtyDays(account.id, account.email);
      this.enableIdleMode(account.id, account.email);
    });

    imap.once('error', (err: Error) => {
      console.error(`✗ Error for ${acctLabel(account)}:`, err?.message ?? err);
      setTimeout(() => this.connectAccount(account), 5000);
    });

    imap.once('end', () => {
      console.log(`⊗ Connection ended for ${acctLabel(account)}`);
      setTimeout(() => this.connectAccount(account), 5000);
    });

    imap.connect();
  }

  private async syncLastThirtyDays(accountId: string, accountEmail: string): Promise<void> {
    const imap = this.connections.get(accountId)!;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    imap.openBox('INBOX', true, async (err, box) => {
      if (err) {
        console.error(`Error opening inbox for ${accountEmail}:`, err);
        return;
      }

      const searchCriteria = [['SINCE', thirtyDaysAgo]];
      
      imap.search(searchCriteria, async (err, uids) => {
        if (err || !uids.length) {
          console.log(`No emails found for ${accountEmail}`);
          return;
        }

        console.log(`Found ${uids.length} emails for ${accountEmail}`);
        await this.fetchEmails(imap, uids, accountId, accountEmail, 'INBOX');
      });
    });
  }

  private async enableIdleMode(accountId: string, accountEmail: string): Promise<void> {
    const imap = this.connections.get(accountId)!;

    imap.openBox('INBOX', false, (err) => {
      if (err) {
        console.error(`Error opening inbox for IDLE ${accountEmail}:`, err);
        return;
      }

      const startIdle = () => {
        // some imap client types don't include idle in typings; cast to any
        (imap as any).idle();
      };

      imap.on('mail', async (numNewMsgs: number) => {
        console.log(`✉ ${numNewMsgs} new email(s) for ${accountEmail}`);
        (imap as any).idle();
        
        imap.search(['UNSEEN'], async (err: Error | null, uids: number[]) => {
          if (!err && uids && uids.length) {
            await this.fetchEmails(imap, uids, accountId, accountEmail, 'INBOX');
          }
          startIdle();
        });
      });

      startIdle();
    });
  }

  private async fetchEmails(
    imap: Imap, 
    uids: number[], 
    accountId: string, 
    accountEmail: string, 
    folder: string
  ): Promise<void> {
    const fetch = imap.fetch(uids, { bodies: '', markSeen: false });

    fetch.on('message', (msg: any, seqno: number) => {
      let uid = 0;
      
      msg.on('attributes', (attrs: any) => {
        uid = attrs.uid;
      });

      msg.on('body', (stream: NodeJS.ReadableStream) => {
        simpleParser(stream, async (err: Error | null, parsed: any) => {
          if (err) {
            console.error('Parse error:', err);
            return;
          }

          const emailId = crypto
            .createHash('md5')
            .update(`${accountId}-${uid}`)
            .digest('hex');

          const email: Email = {
            id: emailId,
            accountId,
            accountEmail,
            folder,
            uid,
            messageId: parsed.messageId || '',
            from: {
              address: parsed.from?.value[0]?.address || '',
              name: parsed.from?.value[0]?.name
            },
            to: parsed.to?.value.map((addr: any) => ({
              address: addr.address || '',
              name: addr.name
            })) || [],
            subject: parsed.subject || '(No Subject)',
            text: parsed.text || '',
            html: parsed.html || undefined,
            date: parsed.date || new Date(),
            receivedAt: new Date()
          };

          await this.esService.indexEmail(email);
          this.emit('newEmail', email);
          console.log(`Indexed: ${email.subject} from ${email.from.address}`);
        });
      });
    });

    fetch.once('error', (err: Error) => {
      console.error('Fetch error:', err);
    });
  }

  async syncNow(): Promise<void> {
    for (const account of config.imapAccounts) {
      await this.syncLastThirtyDays(account.id, account.email);
    }
  }

  disconnect(): void {
    this.connections.forEach((imap, accountId) => {
      imap.end();
      console.log(`Disconnected ${accountId}`);
    });
  }
}