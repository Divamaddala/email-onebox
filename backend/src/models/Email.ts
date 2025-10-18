export interface Email {
  id: string;
  accountId: string;
  accountEmail: string;
  folder: string;
  uid: number;
  messageId: string;
  from: {
    address: string;
    name?: string;
  };
  to: Array<{
    address: string;
    name?: string;
  }>;
  subject: string;
  text: string;
  html?: string;
  date: Date;
  category?: EmailCategory;
  receivedAt: Date;
}

export type EmailCategory = 
  | 'Interested' 
  | 'Meeting Booked' 
  | 'Not Interested' 
  | 'Spam' 
  | 'Out of Office' 
  | 'Uncategorized';

export interface SearchQuery {
  q?: string;
  account?: string;
  folder?: string;
  category?: EmailCategory;
  from?: number;
  size?: number;
}