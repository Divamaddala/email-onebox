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
  date: string;
  category?: EmailCategory;
  receivedAt: string;
}

export type EmailCategory = 
  | 'Interested' 
  | 'Meeting Booked' 
  | 'Not Interested' 
  | 'Spam' 
  | 'Out of Office' 
  | 'Uncategorized';

export interface SearchFilters {
  query: string;
  account: string;
  folder: string;
  category: string;
}