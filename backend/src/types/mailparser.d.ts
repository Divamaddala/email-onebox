declare module 'mailparser' {
  // Minimal types used in this project
  export interface AddressObject {
    address?: string;
    name?: string;
  }

  export interface ParsedMail {
    messageId?: string;
    from?: { value: AddressObject[] };
    to?: { value: AddressObject[] };
    subject?: string;
    text?: string;
    html?: string;
    date?: Date;
  }

  export function simpleParser(stream: NodeJS.ReadableStream, callback: (err: Error | null, parsed: ParsedMail) => void): void;
}
