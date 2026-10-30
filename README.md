# AI Assistant — Full-Stack Grounded RAG & Web Research Application

> **"Your documents. The world's knowledge. One intelligent assistant."**

AI Assistant is a complete, production-ready AI application designed for strictly grounded document analysis (RAG) and transparent AI web research. Built with React, TypeScript, Vite, Tailwind CSS, Firebase Authentication, Cloud Firestore, Firebase Storage, and a dedicated Node.js TypeScript RAG backend powered by Google Gemini and vector retrieval.

---

## 📋 Table of Contents

1. [Architecture Overview](#-architecture-overview)
2. [Prerequisites](#-prerequisites)
3. [Environment Configuration](#-environment-configuration)
4. [Firebase Project Setup & Security Rules](#-firebase-project-setup--security-rules)
5. [AI Models & Vector Index Configuration](#-ai-models--vector-index-configuration)
6. [Web Research API Setup](#-web-research-api-setup)
7. [Running Locally](#-running-locally)
8. [Automated Testing](#-automated-testing)
9. [Deployment Instructions](#-deployment-instructions)
10. [Security & Isolation Guarantees](#-security--isolation-guarantees)
11. [Troubleshooting & Known Limitations](#-troubleshooting--known-limitations)

---

## 🏗️ Architecture Overview

The application is structured into two cleanly separated tiers:

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT APPLICATION                       │
│  React 18 + TypeScript + Vite + Tailwind CSS (Port 3000)    │
├─────────────────────────────────────────────────────────────┤
│  • Firebase Authentication (Google, Email/Pass, Phone SMS)  │
│  • Firestore Client SDK (User profiles, chat history)       │
│  • Document Library & Selection Checklist                   │
│  • Grounded Markdown Renderer & Real Citations Badges       │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      FIREBASE PLATFORM       │ │     RAG BACKEND SERVER     │
│ • Authentication Service     │ │ Express + TypeScript (5000)│
│ • Cloud Firestore Database   │ ├────────────────────────────┤
│ • Firebase Storage Buckets   │ │ • PDF, DOCX, PPTX Parsers  │
│ • Firestore & Storage Rules  │ │ • Overlapping Chunker      │
└──────────────────────────────┘ │ • Vector Store & Cosine Sim│
                                 │ • Gemini LLM + Embeddings  │
                                 │ • Wikipedia & Tavily Search│
                                 └────────────────────────────┘
```

---

## 📦 Prerequisites

- **Node.js**: `v18.0.0` or higher (`v20+` or `v22+` recommended)
- **Package Manager**: `npm` (included with Node.js)
- **Firebase Account**: Free Spark tier or Blaze plan
- **Google AI Studio API Key** *(Optional for live LLM inference)*: [Google AI Studio](https://aistudio.google.com/)
- **Tavily Search API Key** *(Optional for live web search)*: [Tavily AI](https://tavily.com/)

---

## ⚙️ Environment Configuration

### 1. Frontend Environment (`.env`)

Copy the template from `.env.example`:

```bash
cp .env.example .env
```

Populate your `.env` with your Firebase project credentials:

```env
# Firebase Client SDK Configuration
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-app
VITE_FIREBASE_STORAGE_BUCKET=your-app.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Backend API Endpoint
VITE_API_BASE_URL=http://localhost:5000
```

> **Security Note:** Never expose server secrets (`GEMINI_API_KEY`, `TAVILY_API_KEY`) in the root `.env` or any `VITE_*` variables. Client variables are compiled into public JavaScript bundles.

---

### 2. Backend Environment (`server/.env`)

Copy the backend template:

```bash
cp server/.env.example server/.env
```

Configure backend secrets:

```env
# Backend Port
PORT=5000

# Client Application URL (for CORS)
CLIENT_URL=http://localhost:3000

# Google Gemini API Key (Embeddings & Grounded Generation)
GEMINI_API_KEY=AIzaSy...

# Gemini Model Selection (default: gemini-2.5-flash)
GEMINI_MODEL=gemini-2.5-flash

# Tavily Web Search API Key
TAVILY_API_KEY=tvly-...
```

---

## 🔥 Firebase Project Setup & Security Rules

### A. Authentication Providers
In the [Firebase Console](https://console.firebase.google.com/) under **Build → Authentication → Sign-in method**:
1. **Email/Password**: Enable.
2. **Google**: Enable (Select project support email).
3. **Phone**: Enable.
   - For local development without SMS fees, add test phone numbers under **Phone → Phone numbers for testing** (e.g., `+91 9999999999` with test code `123456`).
4. **Authorized Domains**: Add `localhost` and `127.0.0.1` under **Authentication → Settings → Authorized domains**.

### B. Deploy Security Rules

The project contains pre-configured security rules enforcing strict multi-tenant isolation:

#### Firestore Rules (`firestore.rules`):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() { return request.auth != null; }
    function isOwner(userId) { return isAuthenticated() && request.auth.uid == userId; }

    match /users/{userId} {
      allow read, write: if isOwner(userId);
      match /documents/{documentId} { allow read, write, delete: if isOwner(userId); }
      match /chats/{chatId} {
        allow read, write, delete: if isOwner(userId);
        match /messages/{messageId} { allow read, write, delete: if isOwner(userId); }
      }
    }
    match /{document=**} { allow read, write: if false; }
  }
}
```

#### Storage Rules (`storage.rules`):
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isOwner(userId) { return request.auth != null && request.auth.uid == userId; }
    function isValidSize() { return request.resource.size < 100 * 1024 * 1024; } // 100 MB per file limit

    match /users/{userId}/documents/{documentPath=**} {
      allow read: if isOwner(userId);
      allow create, update: if isOwner(userId) && isValidSize();
      allow delete: if isOwner(userId);
    }
    match /{allPaths=**} { allow read, write: if false; }
  }
}
```

Deploy rules using the Firebase CLI:
```bash
npx firebase-tools deploy --only firestore:rules,storage
```
*(Or copy and paste directly into the Firebase Console rules editor).*

---

## 🧠 AI Models, Document Processing & Vector Index Configuration

### Document Ingestion & Parsing (Up to 100 MB per file)
The backend streams uploaded files directly to disk (`server/uploads/temp/`) via Multer disk storage and automatically cleans up after processing, completely preventing memory exhaustion. The pipeline automatically parses:
- **PowerPoint Presentations** (`.pptx`): XML slide tree extraction extracting text across **all slides**, slide notes, shapes, and tables, with exact slide number tracking (`Slide 1`, `Slide 2`, etc.).
- **Legacy PowerPoint** (`.ppt`): Binary OLE stream scanner parsing text records across slides.
- **Word Documents** (`.docx`): Mammoth raw text & paragraph extraction.
- **Legacy Word Documents** (`.doc`): Word 97-2004 binary format extractor via `word-extractor`.
- **PDF Documents** (`.pdf`): Page-by-page text extraction with page numbers, plus detection for purely scanned image PDFs.
- **Plain Text / Markdown** (`.txt`, `.md`): Full UTF-8 document parsing.

### Chunking & Vector Retrieval
- Overlapping sliding window (700 characters with 150 character overlap).
- Every chunk is tagged with `chunkId`, `documentId`, `userId`, `documentName`, and `pageNumber` or `slideNumber`.
- Embeddings:
  - When `GEMINI_API_KEY` is present: Uses Google's `text-embedding-004`.
  - Offline / Dev fallback: Uses normalized 256-dimensional semantic trigram vector space.
- Vector Retrieval uses Cosine Similarity with a calibrated relevance threshold (`0.18`).
- Strict Grounding Fallback: If information is absent or documents are irrelevant, the system strictly returns:
  > *"There is no answer to your question in your uploaded document."*

---

## 🌐 Web Research API Setup

1. **Wikipedia MediaWiki API**:
   - Zero-configuration required. Uses public MediaWiki Action and REST summary endpoints with CORS.
2. **Tavily Web Search API**:
   - Provides clean, grounded web search excerpts.
   - Sign up at [tavily.com](https://tavily.com/) for a free API key.
   - Place in `server/.env` as `TAVILY_API_KEY=tvly-...`.

---

## 🚀 Running Locally

### 1. Install All Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server && npm install && cd ..
```

### 2. Start the Backend Server

```bash
npm run server
```
*Backend starts on `http://localhost:5000` with live reload (`tsx watch`).*

### 3. Start the Frontend Development Server

In a separate terminal:
```bash
npm run dev
```
*Frontend opens on `http://localhost:3000`.*

---

## 🧪 Automated Testing & Evaluation Benchmark

Run the full automated test suite (84 assertions across 4 suites covering RAG retrieval, 100 MB uploads, Google Gemini integration, and the 10-archetype evaluation benchmark):

```bash
npm test
```

Or run individual verification and evaluation suites:

```bash
# 1. Automated Research Agent Quality Benchmark (10 archetypes across 10 quality dimensions)
npm run test:benchmark

# 2. Google Gemini answer generation, prompt injection defense, token limits, and fallback
npm run test:gemini

# 3. 100 MB uploads, multi-slide PPTX, legacy PPT/DOC, large file streaming, and limit rejection
npm run test:100mb

# 4. RAG retrieval, citations, semantic search, and user isolation
npm run test:rag
```

### The 4 Test Suites Validate:

1. **Automated Research Quality Benchmark (`test:benchmark`)**:
   Evaluates 10 distinct question archetypes (factual, explanation, current events, ambiguous wording, conflicting sources, unanswerable future prediction, multi-source comparison, document-only isolation, misleading false premises, and prompt injection attempts) against 10 quality dimensions (relevance, factual correctness, evidence support, citation validity, completeness, uncertainty handling, mode separation, hallucination resistance, retrieval relevance, and latency).
2. **Google Gemini Answer Generation (`test:gemini`)**:
   Validates grounded answers, prompt injection mitigation, token usage tracking, multi-turn conversation context, and typed error handling for missing keys (`GeminiConfigurationError`), invalid credentials (`GeminiAuthenticationError`), rate limits (`GeminiRateLimitError`), and timeouts (`GeminiTimeoutError`).
3. **100 MB Document Uploads & Multi-Format Parsing (`test:100mb`)**:
   Confirms files up to 100 MB upload and process via streaming disk storage without OOM errors, extracts text across all slides of presentations, parses legacy `.ppt` and `.doc` files, and rejects files exceeding 100 MB with HTTP 413.
4. **Grounded RAG Retrieval & Strict Multi-Tenant Isolation (`test:rag`)**:
   Preserves exact facts and matches conceptual synonyms across vector space. Strictly returns `"There is no answer to your question in your uploaded document."` with zero hallucinated citations when evidence is missing. Proves User A cannot retrieve User B's documents under any circumstances.

---

## 🚢 Deployment Instructions

### Option 1: Frontend on Firebase Hosting
```bash
npm run build
npx firebase-tools deploy --only hosting
```

### Option 2: Backend on Google Cloud Run
```bash
cd server
gcloud run deploy ai-assistant-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_key,CLIENT_URL=https://your-app.web.app
```

Then update `VITE_API_BASE_URL` in your frontend environment with your Cloud Run service URL.

---

## 🔒 Security & Isolation Guarantees

1. **Zero Secret Leakage**: `GEMINI_API_KEY` and `TAVILY_API_KEY` reside exclusively in the backend runtime.
2. **Multi-Tenant Partitioning**: Chunks in the vector index and documents in Firestore/Storage are strictly scoped to `request.auth.uid`.
3. **No Plaintext Passwords**: Password hashing and SMS tokens are handled exclusively through Google Identity Platform.
4. **Safe Error Handling**: Internal server errors mask system paths and credentials before returning to the browser.

---

## 🛠️ Troubleshooting & Known Limitations

- **reCAPTCHA Error in Phone Login**: Ensure `localhost` is listed under Firebase Console → Authentication → Settings → Authorized domains.
- **Quota Exceeded for Phone SMS**: Use Firebase Console test phone numbers for local development.
- **CORS Errors**: Check that `CLIENT_URL` in `server/.env` matches your frontend origin (default `http://localhost:3000`).
- **Scanned PDF Images**: Purely scanned image-based PDFs without OCR text require pre-OCR processing before text extraction.
