# Email Onebox - Feature-Rich IMAP Email Aggregator

> AI-powered email aggregator with real-time IMAP synchronization, Elasticsearch search, and intelligent categorization.

## 🚀 Features Implemented

### ✅ Core Features
- **Real-Time Email Synchronization**: Persistent IMAP IDLE connections for 2+ accounts
- **Last 30 Days Sync**: Automatic fetching of recent emails
- **Elasticsearch Storage**: Locally hosted with full-text search capabilities
- **AI Email Categorization**: GPT-4 powered categorization into 5 categories
- **Slack Notifications**: Instant alerts for interested emails
- **Webhook Integration**: External webhook triggers for automation
- **Frontend Interface**: Clean, responsive UI with filters and search
- **AI Reply Suggestions**: RAG-powered contextual reply generation using Pinecone

### 📊 Email Categories
- Interested
- Meeting Booked
- Not Interested
- Spam
- Out of Office

## 🏗️ Architecture

```
┌─────────────────┐
│  Frontend (React) │
│  Port: 5173      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Backend (Node)  │
│  Port: 3000      │
└────────┬────────┘
         │
         ├──────────► Elasticsearch (Port: 9200)
         ├──────────► IMAP Servers (Gmail)
         ├──────────► OpenAI API (GPT-4)
         ├──────────► Pinecone (Vector DB)
         ├──────────► Slack Webhook
         └──────────► External Webhook
```

## 📦 Tech Stack

**Backend:**
- Node.js + TypeScript
- Express.js
- IMAP (persistent connections with IDLE)
- Elasticsearch
- OpenAI GPT-4
- Pinecone Vector Database

**Frontend:**
- React + TypeScript
- Vite
- Tailwind CSS
- Lucide Icons
- Axios

## 🔧 Installation & Setup

### Prerequisites
```bash
Node.js 18+
Docker Desktop
Gmail accounts (2+)
OpenAI API key
Pinecone account
Slack workspace
```

### Step 1: Clone Repository
```bash
git clone <your-repo-url>
cd email-onebox
```

### Step 2: Setup Environment Variables
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
- Gmail app passwords (not regular passwords!)
- OpenAI API key
- Pinecone credentials
- Slack webhook URL
- External webhook URL (webhook.site)

### Step 3: Start Elasticsearch
```bash
docker-compose up -d
```

Wait 30 seconds for Elasticsearch to be ready.

### Step 4: Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd ../frontend
npm install
```

### Step 5: Run Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Step 6: Access Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Elasticsearch: http://localhost:9200

## 📖 API Endpoints

### Postman Collection

**1. Sync Emails**
```
GET http://localhost:3000/api/emails/sync
```

**2. Get All Emails**
```
GET http://localhost:3000/api/emails?from=0&size=100
```

**3. Search Emails**
```
GET http://localhost:3000/api/emails/search?q=meeting&account=email@gmail.com&category=Interested
```

**4. Get Email by ID**
```
GET http://localhost:3000/api/emails/:id
```

**5. Categorize Email**
```
POST http://localhost:3000/api/emails/:id/categorize
```

**6. Get Suggested Reply (RAG)**
```
POST http://localhost:3000/api/emails/:id/suggest-reply
```

## 🎯 How It Works

### 1. Real-Time Sync
- Backend connects to Gmail via IMAP using persistent connections
- IDLE mode listens for new emails in real-time
- No polling or cron jobs - instant notifications

### 2. Email Processing
- New emails are parsed and indexed in Elasticsearch
- Full-text search enabled on subject, body, sender
- Metadata stored for filtering (account, folder)

### 3. AI Categorization
- GPT-4 analyzes email content
- Categorizes into 5 predefined labels
- If "Interested" → triggers Slack + Webhook

### 4. RAG Reply Suggestions
- Product context stored in Pinecone vector database
- User queries generate embeddings
- Relevant context retrieved and passed to GPT-4
- Contextual, personalized replies generated

### 5. Frontend Features
- View all emails in one place
- Filter by account, folder, category
- Full-text search across all emails
- One-click AI categorization
- AI-powered reply suggestions

## 📱 Gmail App Password Setup

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification
3. Go to App Passwords
4. Generate password for "Mail" + "Other device"
5. Copy 16-character password (no spaces)
6. Use in `.env` file

## 🔍 Testing Guide

### Postman Testing
1. Import endpoints listed above
2. Test sync endpoint first
3. Wait 10 seconds for emails to index
4. Test search and filter endpoints
5. Test categorization with email ID
6. Test reply suggestion (requires Pinecone setup)

### Frontend Testing
1. Open http://localhost:5173
2. Click "Sync Now" button
3. Wait for emails to load
4. Try search and filters
5. Click email to view details
6. Test "AI Categorize" button
7. Test "Suggest Reply" button

## 🚢 Deployment

### Backend (Railway/Render)
```bash
cd backend
npm run build
# Deploy dist/ folder
# Set environment variables in dashboard
```

### Frontend (Vercel/Netlify)
```bash
cd frontend
npm run build
# Deploy dist/ folder
# Update API_BASE URL in src/services/api.ts
```

## 📹 Demo Video Checklist

1. Show project structure (30s)
2. Postman API testing (2 min)
   - Sync endpoint
   - Search endpoint
   - Categorization
   - Reply suggestion
3. Frontend demonstration (2 min)
   - Email list view
   - Search and filters
   - Email details
   - AI categorization
   - Reply suggestions
4. Real-time sync demo (30s)
   - Send test email
   - Show instant appearance

## 🎓 Learning Resources

- [IMAP Protocol](https://www.rfc-editor.org/rfc/rfc3501)
- [Elasticsearch Guide](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [OpenAI API](https://platform.openai.com/docs)
- [Pinecone Docs](https://docs.pinecone.io/)

## 🐛 Troubleshooting

**Elasticsearch not starting:**
```bash
docker-compose down -v
docker-compose up -d
```

**IMAP connection failed:**
- Check Gmail app password (16 chars, no spaces)
- Ensure 2FA is enabled
- Check firewall settings

**AI categorization errors:**
- Verify OpenAI API key
- Check API quota/credits

**Pinecone errors:**
- Create index manually in dashboard
- Wait 60s after index creation



---

**Built with ❤️ for ReachInbox Assignment**
