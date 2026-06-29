const express = require('express');
const cors = require('cors');
const multer = require('multer');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype.startsWith('image/'));
  },
});

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const MODEL = process.env.CEREBRAS_MODEL || 'gemma-4-31b';
const CEREBRAS_BASE_URL = process.env.CEREBRAS_BASE_URL || 'https://api.cerebras.ai';
const MAX_TICKET_CHARS = 4000;

const KNOWLEDGE_BASE = [
  {
    id: 'KB-001',
    title: 'GlobalProtect VPN 403 failures',
    keywords: ['vpn', 'globalprotect', '403', 'connection failed', 'gateway'],
    text: 'For VPN 403 or gateway authentication failures, update GlobalProtect to v6.2.1, clear the cached portal profile, restart the PanGPS service, then retry SSO.',
  },
  {
    id: 'KB-002',
    title: 'Okta password reset',
    keywords: ['password', 'reset', 'okta', 'locked', 'mfa'],
    text: 'For password reset and account lockout tickets, direct the user to the Okta self-service reset portal. If MFA is unavailable, verify identity and reset the factor.',
  },
  {
    id: 'KB-003',
    title: 'Exchange mailbox quota',
    keywords: ['email', 'mailbox', 'quota', 'exchange', 'archive'],
    text: 'When Exchange mailbox quota is exceeded, archive large attachments, empty recoverable deleted items, then increase quota only after manager approval.',
  },
  {
    id: 'KB-004',
    title: 'Critical service outage escalation',
    keywords: ['outage', 'production', 'critical', 'sev1', 'sev-1', 'down', 'database'],
    text: 'For production outages or broad service impact, classify as high or critical, notify on-call, capture affected services, and start the incident bridge.',
  },
  {
    id: 'KB-005',
    title: 'Screenshot evidence handling',
    keywords: ['screenshot', 'error', 'dialog', 'image', 'alert'],
    text: 'Use screenshots to extract exact error codes, product names, timestamps, and affected component labels. Do not infer secrets from masked fields.',
  },
];

const RESPONSE_SCHEMA = {
  name: 'resolveiq_resolution',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: [
      'severity',
      'root_cause_hypothesis',
      'recommended_action',
      'citations',
      'confidence',
      'customer_facing_draft',
    ],
    properties: {
      severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      root_cause_hypothesis: { type: 'string' },
      recommended_action: { type: 'string' },
      citations: {
        type: 'array',
        items: { type: 'string' },
      },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      customer_facing_draft: { type: 'string' },
    },
  },
};

function normalize(input) {
  return String(input || '').toLowerCase();
}

function triageTicket(text, hasImage) {
  const lower = normalize(text);
  const criticalTerms = ['sev1', 'sev-1', 'critical', 'outage', 'down', 'production unavailable'];
  const highTerms = ['blocked', 'security', 'breach', 'data loss', 'cannot login', 'vip'];
  const mediumTerms = ['failed', 'error', 'quota', 'vpn', 'password', 'timeout'];

  const severity = criticalTerms.some((term) => lower.includes(term))
    ? 'critical'
    : highTerms.some((term) => lower.includes(term))
      ? 'high'
      : mediumTerms.some((term) => lower.includes(term))
        ? 'medium'
        : 'low';

  const category = lower.includes('vpn')
    ? 'network-access'
    : lower.includes('password') || lower.includes('okta') || lower.includes('mfa')
      ? 'identity-access'
      : lower.includes('email') || lower.includes('mailbox') || lower.includes('exchange')
        ? 'messaging'
        : lower.includes('outage') || lower.includes('production')
          ? 'service-incident'
          : 'general-support';

  return { severity, category, needs_vision: Boolean(hasImage) };
}

function retrieveDocs(text, triage, limit = 3) {
  const haystack = `${text} ${triage.category} ${triage.severity}`;
  const lower = normalize(haystack);

  return KNOWLEDGE_BASE
    .map((doc) => {
      const score = doc.keywords.reduce((total, keyword) => {
        return total + (lower.includes(keyword) ? 2 : 0);
      }, 0) + doc.text
        .toLowerCase()
        .split(/\W+/)
        .filter((word) => word.length > 3 && lower.includes(word)).length;

      return { ...doc, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ id, title, text: docText }) => ({ id, title, excerpt: docText }));
}

function buildFallbackResolution(text, triage, docs) {
  const primaryDoc = docs[0];
  const severity = triage.severity;
  const recommended = primaryDoc
    ? primaryDoc.excerpt
    : 'Collect the exact error message, affected user, timestamp, and recent changes, then route to the appropriate support queue.';

  return {
    severity,
    root_cause_hypothesis: `Initial ${triage.category} triage based on the ticket text. Model synthesis was unavailable, so this is a rules-backed draft.`,
    recommended_action: recommended,
    citations: docs.map((doc) => doc.id),
    confidence: primaryDoc ? 0.58 : 0.35,
    customer_facing_draft: `Thanks for reporting this. We found an initial match for a ${triage.category} issue. Recommended next step: ${recommended}`,
  };
}

function parseJson(content) {
  if (typeof content !== 'string') return content;
  try {
    return JSON.parse(content);
  } catch (_error) {
    const match = content.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  }
}

async function synthesizeResolution({ text, imageDataUri, triage, docs }) {
  const content = [
    {
      type: 'text',
      text: [
        'You are ResolveIQ, an enterprise incident-response copilot.',
        'Return only JSON matching the provided schema.',
        'Do not expose secrets, tokens, passwords, or API keys.',
        `Ticket: ${text}`,
        `Local triage: ${JSON.stringify(triage)}`,
        `Retrieved runbooks: ${JSON.stringify(docs)}`,
        imageDataUri ? 'An image is attached. Extract only visible operational evidence such as error code, product, status, and component labels.' : 'No image is attached.',
      ].join('\n\n'),
    },
  ];

  if (imageDataUri) {
    content.push({
      type: 'image_url',
      image_url: { url: imageDataUri },
    });
  }

  const startedAt = Date.now();
  if (!process.env.CEREBRAS_API_KEY) {
    throw new Error('CEREBRAS_API_KEY is not configured.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  const response = await fetch(`${CEREBRAS_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    signal: controller.signal,
    headers: {
      Authorization: `Bearer ${process.env.CEREBRAS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: 'You produce concise, grounded IT incident resolutions. Cite only supplied KB ids.',
      },
      { role: 'user', content },
    ],
    reasoning_effort: triage.severity === 'critical' ? 'medium' : 'low',
    max_completion_tokens: 700,
    temperature: 0.2,
    response_format: {
      type: 'json_schema',
      json_schema: RESPONSE_SCHEMA,
    },
    }),
  });
  clearTimeout(timeout);

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Cerebras HTTP ${response.status}: ${detail.slice(0, 500)}`);
  }

  const payload = await response.json();

  return {
    resolution: parseJson(payload.choices?.[0]?.message?.content),
    usage: payload.usage || null,
    time_info: payload.time_info || null,
    latency_ms: Date.now() - startedAt,
  };
}

function shouldEscalate(severity) {
  return severity === 'high' || severity === 'critical';
}

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

  try {
    const modelResult = await synthesizeResolution({ text, imageDataUri, triage, docs });
    if (modelResult.resolution && typeof modelResult.resolution === 'object') {
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
    }
  } catch (error) {
    console.error('Cerebras resolution failed:', error.message);
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
    },
  });
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ error: error.message });
  }
  console.error(error);
  return res.status(500).json({ error: 'Unexpected server error.' });
});

const PORT = Number(process.env.PORT || 5000);
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
