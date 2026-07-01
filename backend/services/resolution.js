/**
 * Resolution synthesis: builds prompts, calls Cerebras API, and provides fallbacks.
 * Uses shared httpClient and jsonParser utilities.
 */

const { fetchWithTimeout } = require('../utils/httpClient');
const { parseJson } = require('../utils/jsonParser');

const MODEL = process.env.CEREBRAS_MODEL || 'gemma-4-31b';
const CEREBRAS_BASE_URL = process.env.CEREBRAS_BASE_URL || 'https://api.cerebras.ai';

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

  const response = await fetchWithTimeout(
    `${CEREBRAS_BASE_URL}/v1/chat/completions`,
    {
      method: 'POST',
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
    },
    12000,
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Cerebras HTTP ${response.status}: ${detail.slice(0, 500)}`);
  }

  const payload = await response.json();
  const resolution = parseJson(payload.choices?.[0]?.message?.content);

  if (!resolution || typeof resolution !== 'object') {
    throw new Error('Model returned invalid or empty resolution JSON.');
  }

  return {
    resolution,
    usage: payload.usage || null,
    time_info: payload.time_info || null,
    latency_ms: Date.now() - startedAt,
  };
}

module.exports = { buildFallbackResolution, synthesizeResolution, parseJson, MODEL, RESPONSE_SCHEMA };
