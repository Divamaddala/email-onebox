"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImapService = void 0;
const imap_1 = __importDefault(require("imap"));
// use require for mailparser to avoid runtime TS declaration resolution issues
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mailparser = require('mailparser');
const simpleParser = mailparser.simpleParser || mailparser;
const config_1 = require("../config");
const events_1 = require("events");
const crypto_1 = __importDefault(require("crypto"));
class ImapService extends events_1.EventEmitter {
    constructor(esService) {
        super();
        this.connections = new Map();
        this.esService = esService;
    }
    async initializeAccounts() {
        for (const account of config_1.config.imapAccounts) {
            await this.connectAccount(account);
        }
    }
    async connectAccount(account) {
        const imap = new imap_1.default({
            user: account.email,
            password: account.password,
            host: account.host,
            port: account.port,
            tls: account.tls,
            tlsOptions: { rejectUnauthorized: false }
        });
        this.connections.set(account.id, imap);
        imap.once('ready', () => {
            console.log(`✓ Connected to ${account.email}`);
            this.syncLastThirtyDays(account.id, account.email);
            this.enableIdleMode(account.id, account.email);
        });
        imap.once('error', (err) => {
            console.error(`✗ Error for ${account.email}:`, err.message);
            setTimeout(() => this.connectAccount(account), 5000);
        });
        imap.once('end', () => {
            console.log(`⊗ Connection ended for ${account.email}`);
            setTimeout(() => this.connectAccount(account), 5000);
        });
        imap.connect();
    }
    async syncLastThirtyDays(accountId, accountEmail) {
        const imap = this.connections.get(accountId);
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
    async enableIdleMode(accountId, accountEmail) {
        const imap = this.connections.get(accountId);
        imap.openBox('INBOX', false, (err) => {
            if (err) {
                console.error(`Error opening inbox for IDLE ${accountEmail}:`, err);
                return;
            }
            const startIdle = () => {
                // some imap client types don't include idle in typings; cast to any
                imap.idle();
            };
            imap.on('mail', async (numNewMsgs) => {
                console.log(`✉ ${numNewMsgs} new email(s) for ${accountEmail}`);
                imap.idle();
                imap.search(['UNSEEN'], async (err, uids) => {
                    if (!err && uids && uids.length) {
                        await this.fetchEmails(imap, uids, accountId, accountEmail, 'INBOX');
                    }
                    startIdle();
                });
            });
            startIdle();
        });
    }
    async fetchEmails(imap, uids, accountId, accountEmail, folder) {
        const fetch = imap.fetch(uids, { bodies: '', markSeen: false });
        fetch.on('message', (msg, seqno) => {
            let uid = 0;
            msg.on('attributes', (attrs) => {
                uid = attrs.uid;
            });
            msg.on('body', (stream) => {
                simpleParser(stream, async (err, parsed) => {
                    if (err) {
                        console.error('Parse error:', err);
                        return;
                    }
                    const emailId = crypto_1.default
                        .createHash('md5')
                        .update(`${accountId}-${uid}`)
                        .digest('hex');
                    const email = {
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
                        to: parsed.to?.value.map((addr) => ({
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
        fetch.once('error', (err) => {
            console.error('Fetch error:', err);
        });
    }
    async syncNow() {
        for (const account of config_1.config.imapAccounts) {
            await this.syncLastThirtyDays(account.id, account.email);
        }
    }
    disconnect() {
        this.connections.forEach((imap, accountId) => {
            imap.end();
            console.log(`Disconnected ${accountId}`);
        });
    }
}
exports.ImapService = ImapService;
