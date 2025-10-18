import { useState, useEffect } from 'react';
import { Mail, Search, RefreshCw, Inbox, Sparkles, Filter, X } from 'lucide-react';
import { api } from './services/api';
import { Email, EmailCategory, SearchFilters } from './types';
import { format } from 'date-fns';

export default function App() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [suggestedReply, setSuggestedReply] = useState('');
  const [filters, setFilters] = useState<Partial<SearchFilters>>({
    query: '',
    account: '',
    folder: '',
    category: ''
  });

  useEffect(() => {
    loadEmails();
  }, []);

  const loadEmails = async () => {
    setLoading(true);
    try {
      const data = await api.getAllEmails();
      setEmails(data);
    } catch (error) {
      console.error('Failed to load emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.syncEmails();
      await new Promise(resolve => setTimeout(resolve, 3000));
      await loadEmails();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const data = await api.searchEmails(filters);
      setEmails(data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorize = async (emailId: string) => {
    try {
      const result = await api.categorizeEmail(emailId);
      setEmails(emails.map(e => 
        e.id === emailId ? { ...e, category: result.category } : e
      ));
      if (selectedEmail?.id === emailId) {
        setSelectedEmail({ ...selectedEmail, category: result.category });
      }
    } catch (error) {
      console.error('Categorization failed:', error);
    }
  };

  const handleSuggestReply = async (emailId: string) => {
    try {
      const result = await api.suggestReply(emailId);
      setSuggestedReply(result.suggestedReply);
    } catch (error) {
      console.error('Reply suggestion failed:', error);
    }
  };

  const getCategoryColor = (category?: EmailCategory) => {
    const colors = {
      'Interested': 'bg-green-100 text-green-800',
      'Meeting Booked': 'bg-blue-100 text-blue-800',
      'Not Interested': 'bg-red-100 text-red-800',
      'Spam': 'bg-gray-100 text-gray-800',
      'Out of Office': 'bg-yellow-100 text-yellow-800',
      'Uncategorized': 'bg-purple-100 text-purple-800'
    };
    return colors[category || 'Uncategorized'] || colors['Uncategorized'];
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      account: '',
      folder: '',
      category: ''
    });
    loadEmails();
  };

  const uniqueAccounts = Array.from(new Set(emails.map(e => e.accountEmail)));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Inbox className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Email Onebox</h1>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search emails..."
                value={filters.query}
                onChange={(e) => setFilters({ ...filters, query: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <select
              value={filters.account}
              onChange={(e) => setFilters({ ...filters, account: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Accounts</option>
              {uniqueAccounts.map(acc => (
                <option key={acc} value={acc}>{acc}</option>
              ))}
            </select>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              <option value="Interested">Interested</option>
              <option value="Meeting Booked">Meeting Booked</option>
              <option value="Not Interested">Not Interested</option>
              <option value="Spam">Spam</option>
              <option value="Out of Office">Out of Office</option>
            </select>
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Search
            </button>
            {(filters.query || filters.account || filters.category) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Emails ({emails.length})
              </h2>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading emails...</div>
              ) : emails.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No emails found</div>
              ) : (
                emails.map(email => (
                  <div
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                      selectedEmail?.id === email.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {email.from.name || email.from.address}
                        </p>
                        <p className="text-sm text-gray-600 truncate">{email.subject}</p>
                      </div>
                      <div className="ml-3 flex flex-col items-end gap-1">
                        <span className="text-xs text-gray-500">
                          {format(new Date(email.date), 'MMM d, HH:mm')}
                        </span>
                        {email.category && (
                          <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(email.category)}`}>
                            {email.category}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2">{email.text}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Mail className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{email.accountEmail}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm">
            {selectedEmail ? (
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    {selectedEmail.subject}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>From: {selectedEmail.from.name || selectedEmail.from.address}</span>
                    <span>{format(new Date(selectedEmail.date), 'PPpp')}</span>
                  </div>
                  {selectedEmail.category && (
                    <span className={`inline-block mt-2 text-sm px-3 py-1 rounded-full ${getCategoryColor(selectedEmail.category)}`}>
                      {selectedEmail.category}
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedEmail.text}</p>
                </div>

                <div className="p-4 border-t border-gray-200 space-y-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCategorize(selectedEmail.id)}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      AI Categorize
                    </button>
                    <button
                      onClick={() => handleSuggestReply(selectedEmail.id)}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Suggest Reply
                    </button>
                  </div>

                  {suggestedReply && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h3 className="font-semibold text-green-900 mb-2">Suggested Reply:</h3>
                      <p className="text-gray-700 whitespace-pre-wrap">{suggestedReply}</p>
                      <button
                        onClick={() => navigator.clipboard.writeText(suggestedReply)}
                        className="mt-3 px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >
                        Copy to Clipboard
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full p-8 text-gray-500">
                <div className="text-center">
                  <Mail className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>Select an email to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}