import axios from 'axios';
import { Email, SearchFilters } from '../types';

const API_BASE = '/api';

export const api = {
  async syncEmails() {
    const { data } = await axios.get(`${API_BASE}/emails/sync`);
    return data;
  },

  async getAllEmails(from: number = 0, size: number = 100) {
    const { data } = await axios.get(`${API_BASE}/emails`, {
      params: { from, size }
    });
    return data.emails as Email[];
  },

  async searchEmails(filters: Partial<SearchFilters>) {
    const params: any = {};
    if (filters.query) params.q = filters.query;
    if (filters.account) params.account = filters.account;
    if (filters.folder) params.folder = filters.folder;
    if (filters.category) params.category = filters.category;

    const { data } = await axios.get(`${API_BASE}/emails/search`, { params });
    return data.emails as Email[];
  },

  async getEmailById(id: string) {
    const { data } = await axios.get(`${API_BASE}/emails/${id}`);
    return data.email as Email;
  },

  async categorizeEmail(id: string) {
    const { data } = await axios.post(`${API_BASE}/emails/${id}/categorize`);
    return data;
  },

  async suggestReply(id: string) {
    const { data } = await axios.post(`${API_BASE}/emails/${id}/suggest-reply`);
    return data;
  }
};