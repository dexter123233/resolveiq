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

## ⚙️ Setup

### Backend
1. Navigate to `/backend`
2. Install dependencies: `npm install`
3. Create a `.env` file and add your API key:
   ```env
   CEREBRAS_API_KEY=your_api_key_here
   ```
4. Start the server: `node index.js`

### Frontend
1. Navigate to `/frontend`
2. Install dependencies: `npm install`
3. Start the app: `npm start`

## 📖 How it Works
1. **Triage**: Classifies severity and determines if a vision check is needed.
2. **Vision**: Extracts error signatures from images.
3. **Retrieval**: Pulls relevant solutions from the Knowledge Base.
4. **Response**: Synthesizes all data into a final JSON resolution draft.
5. **Escalation**: Flags high-priority tickets for human intervention.
