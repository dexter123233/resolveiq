const request = require('supertest');
const { app } = require('../app');

describe('GET /api/health', () => {
  test('returns 200 with ok and model', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.model).toBeDefined();
  });
});

describe('POST /api/resolve', () => {
  test('returns 400 when text is missing', async () => {
    const res = await request(app).post('/api/resolve').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Ticket text is required.');
  });

  test('returns 400 when text is empty', async () => {
    const res = await request(app).post('/api/resolve').send({ text: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Ticket text is required.');
  });

  test('returns fallback resolution when no API key is set', async () => {
    const originalKey = process.env.CEREBRAS_API_KEY;
    delete process.env.CEREBRAS_API_KEY;

    const res = await request(app)
      .post('/api/resolve')
      .field('text', 'VPN connection failed with error 403');

    expect(res.status).toBe(200);
    expect(res.body.resolution).toBeDefined();
    expect(res.body.resolution.severity).toBeDefined();
    expect(res.body.metrics.provider).toBe('local-fallback');

    if (originalKey) process.env.CEREBRAS_API_KEY = originalKey;
  });

  test('response includes all expected top-level fields', async () => {
    const res = await request(app)
      .post('/api/resolve')
      .field('text', 'Cannot access email');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('resolution');
    expect(res.body).toHaveProperty('escalated');
    expect(res.body).toHaveProperty('triage');
    expect(res.body).toHaveProperty('retrieved_docs');
    expect(res.body).toHaveProperty('image_received');
    expect(res.body).toHaveProperty('escalation');
    expect(res.body).toHaveProperty('metrics');
  });

  test('resolution has all required schema fields', async () => {
    const res = await request(app)
      .post('/api/resolve')
      .field('text', 'Password reset needed');

    const { resolution } = res.body;
    expect(resolution).toHaveProperty('severity');
    expect(resolution).toHaveProperty('root_cause_hypothesis');
    expect(resolution).toHaveProperty('recommended_action');
    expect(resolution).toHaveProperty('citations');
    expect(resolution).toHaveProperty('confidence');
    expect(resolution).toHaveProperty('customer_facing_draft');
  });

  test('triage is correct for VPN ticket', async () => {
    const res = await request(app)
      .post('/api/resolve')
      .field('text', 'VPN not working');

    expect(res.body.triage.category).toBe('network-access');
    expect(res.body.triage.severity).toBe('medium');
    expect(res.body.triage.needs_vision).toBe(false);
  });

  test('escalated is true for critical tickets', async () => {
    const res = await request(app)
      .post('/api/resolve')
      .field('text', 'sev1 production outage everything is down');

    expect(res.body.escalated).toBe(true);
    expect(res.body.escalation).not.toBeNull();
    expect(res.body.escalation.tool).toBe('escalate_ticket');
  });

  test('escalated is false for low severity tickets', async () => {
    const res = await request(app)
      .post('/api/resolve')
      .field('text', 'How do I change my display name?');

    expect(res.body.escalated).toBe(false);
    expect(res.body.escalation).toBeNull();
  });

  test('image_received is false when no file attached', async () => {
    const res = await request(app)
      .post('/api/resolve')
      .field('text', 'Some issue');

    expect(res.body.image_received).toBe(false);
  });

  test('image_received is true when image is attached', async () => {
    const res = await request(app)
      .post('/api/resolve')
      .field('text', 'Error on screen')
      .attach('image', Buffer.from('fake-png'), {
        filename: 'screenshot.png',
        contentType: 'image/png',
      });

    expect(res.body.image_received).toBe(true);
    expect(res.body.triage.needs_vision).toBe(true);
  });

  test('retrieved_docs is an array', async () => {
    const res = await request(app)
      .post('/api/resolve')
      .field('text', 'VPN 403 gateway error');

    expect(Array.isArray(res.body.retrieved_docs)).toBe(true);
    expect(res.body.retrieved_docs.length).toBeGreaterThan(0);
  });

  test('metrics includes expected fields', async () => {
    const res = await request(app)
      .post('/api/resolve')
      .field('text', 'quota exceeded on mailbox');

    const { metrics } = res.body;
    expect(metrics).toHaveProperty('status');
    expect(metrics).toHaveProperty('provider');
    expect(metrics).toHaveProperty('model');
    expect(metrics).toHaveProperty('total_latency_ms');
    expect(typeof metrics.total_latency_ms).toBe('number');
  });

  test('text is truncated to MAX_TICKET_CHARS', async () => {
    const longText = 'a'.repeat(5000);
    const res = await request(app)
      .post('/api/resolve')
      .field('text', longText);

    expect(res.status).toBe(200);
  });

  test('non-image file is ignored by multer filter', async () => {
    const res = await request(app)
      .post('/api/resolve')
      .field('text', 'File upload test')
      .attach('image', Buffer.from('not an image'), {
        filename: 'document.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(200);
    expect(res.body.image_received).toBe(false);
  });
});
