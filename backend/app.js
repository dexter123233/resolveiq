const express = require('express');
const cors = require('cors');
const multer = require('multer');

const { normalize } = require('./utils/textUtils');
const { parseJson } = require('./utils/jsonParser');
const { KNOWLEDGE_BASE } = require('./services/knowledgeBase');
const { triageTicket, shouldEscalate } = require('./services/triage');
const { retrieveDocs } = require('./services/retrieval');
const { buildFallbackResolution, synthesizeResolution, MODEL, RESPONSE_SCHEMA } = require('./services/resolution');

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed.'), false);
    }
  },
});

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const MAX_TICKET_CHARS = 4000;

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, model: MODEL });
});

app.post('/api/resolve', upload.single('image'), async (req, res) => {
  const startedAt = Date.now();
  const text = String(req.body.text || '').trim().slice(0, MAX_TICKET_CHARS);

  if (!text) {
    return res.status(400).json({ error: 'Ticket text is required.' });
  }

  const hasImage = Boolean(req.file);
  const imageDataUri = req.file
    ? `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
    : null;
  const triage = triageTicket(text, hasImage);
  const docs = retrieveDocs(text, triage);

  let resolution = buildFallbackResolution(text, triage, docs);
  let model = { provider: 'local-fallback', model: MODEL, usage: null, time_info: null, latency_ms: 0 };

  let modelError = null;
  try {
    const modelResult = await synthesizeResolution({ text, imageDataUri, triage, docs });
    resolution = {
      ...resolution,
      ...modelResult.resolution,
      citations: Array.isArray(modelResult.resolution.citations)
        ? modelResult.resolution.citations
        : resolution.citations,
    };
    model = {
      provider: 'cerebras',
      model: MODEL,
      usage: modelResult.usage,
      time_info: modelResult.time_info,
      latency_ms: modelResult.latency_ms,
    };
  } catch (error) {
    modelError = error.message || 'Unknown model error';
    console.error('Cerebras resolution failed, using fallback:', modelError);
  }

  const escalated = shouldEscalate(resolution.severity);

  res.json({
    resolution,
    escalated,
    triage,
    retrieved_docs: docs,
    image_received: hasImage,
    escalation: escalated
      ? {
          tool: 'escalate_ticket',
          status: 'mocked',
          summary: `${resolution.severity.toUpperCase()}: ${resolution.root_cause_hypothesis}`,
        }
      : null,
    metrics: {
      status: model.provider === 'cerebras' ? 'success' : 'fallback',
      provider: model.provider,
      model: model.model,
      total_latency_ms: Date.now() - startedAt,
      inference_latency_ms: model.latency_ms,
      usage: model.usage,
      time_info: model.time_info,
      ...(modelError ? { fallback_reason: modelError } : {}),
    },
  });
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ error: error.message });
  }
  if (error.message === 'Only image files are allowed.') {
    return res.status(400).json({ error: error.message });
  }
  console.error('Unhandled error:', error);
  return res.status(500).json({ error: 'Unexpected server error.' });
});

module.exports = {
  app,
  normalize,
  triageTicket,
  retrieveDocs,
  buildFallbackResolution,
  parseJson,
  synthesizeResolution,
  shouldEscalate,
  KNOWLEDGE_BASE,
  RESPONSE_SCHEMA,
  MAX_TICKET_CHARS,
};
