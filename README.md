# ResolveIQ: Enterprise Multimodal Incident Response Copilot 🤖⚡

ResolveIQ is an AI-driven incident response system that automates the triage and resolution of technical support tickets. By leveraging a multimodal pipeline, it analyzes both text and imagery to provide grounded, actionable resolution drafts.

## 🚀 Features
- **Multimodal Analysis**: Processes ticket text and screenshots/diagrams.
- **5-Agent Pipeline**: Orchestrates Triage, Vision, Retrieval, Response, and Escalation agents.
- **RAG-Powered**: Uses a Knowledge Base for grounded resolutions with citations.
- **High Performance**: Low-latency inference powered by Cerebras and Gemma-4.
- **Smart Escalation**: Automatic severity detection and escalation flagging.

## 🛠️ Tech Stack
- **Frontend**: React, TypeScript, Axios, Lucide-React
- **Backend**: Node.js, Express, Multer
- **AI Model**: `gemma-4-31b` via Cerebras Cloud SDK

## 🌐 Live Demo

👉 **[resolveiq.app](https://dexter123233.github.io/resolveiq)**

## ⚙️ Setup

### Frontend (Client-Side)
1. Navigate to `/frontend`
2. Install dependencies: `npm install`
3. Start locally: `npm start`
4. Build & deploy: `npm run deploy`

> The app runs entirely in the browser — just enter your Cerebras API key in the Settings panel and you're ready to go.

## 📖 How it Works
1. **Input**: Describe an incident and optionally attach a screenshot.
2. **Inference**: Calls `gemma-4-31b` directly via the Cerebras API for multimodal analysis.
3. **Result**: Returns a JSON resolution draft including severity, root cause, recommended action, and escalation status.
