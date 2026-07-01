const {
  normalize,
  triageTicket,
  retrieveDocs,
  buildFallbackResolution,
  parseJson,
  shouldEscalate,
  KNOWLEDGE_BASE,
} = require('../app');

// ---------------------------------------------------------------------------
// normalize
// ---------------------------------------------------------------------------
describe('normalize', () => {
  test('lowercases a regular string', () => {
    expect(normalize('Hello World')).toBe('hello world');
  });

  test('handles null input', () => {
    expect(normalize(null)).toBe('');
  });

  test('handles undefined input', () => {
    expect(normalize(undefined)).toBe('');
  });

  test('handles empty string', () => {
    expect(normalize('')).toBe('');
  });

  test('converts numeric input to string', () => {
    expect(normalize(123)).toBe('123');
  });

  test('handles mixed-case with special characters', () => {
    expect(normalize('VPN-403 Error!')).toBe('vpn-403 error!');
  });
});

// ---------------------------------------------------------------------------
// triageTicket
// ---------------------------------------------------------------------------
describe('triageTicket', () => {
  describe('severity classification', () => {
    test('classifies critical severity for "sev1"', () => {
      const result = triageTicket('This is a sev1 issue', false);
      expect(result.severity).toBe('critical');
    });

    test('classifies critical severity for "sev-1"', () => {
      const result = triageTicket('sev-1 production issue', false);
      expect(result.severity).toBe('critical');
    });

    test('classifies critical severity for "outage"', () => {
      const result = triageTicket('Service outage in production', false);
      expect(result.severity).toBe('critical');
    });

    test('classifies critical severity for "down"', () => {
      const result = triageTicket('Server is down', false);
      expect(result.severity).toBe('critical');
    });

    test('classifies critical severity for "production unavailable"', () => {
      const result = triageTicket('production unavailable since 2pm', false);
      expect(result.severity).toBe('critical');
    });

    test('classifies high severity for "blocked"', () => {
      const result = triageTicket('User is blocked from accessing system', false);
      expect(result.severity).toBe('high');
    });

    test('classifies high severity for "security"', () => {
      const result = triageTicket('Security incident detected', false);
      expect(result.severity).toBe('high');
    });

    test('classifies high severity for "breach"', () => {
      const result = triageTicket('Possible data breach', false);
      expect(result.severity).toBe('high');
    });

    test('classifies high severity for "data loss"', () => {
      const result = triageTicket('Experiencing data loss', false);
      expect(result.severity).toBe('high');
    });

    test('classifies high severity for "cannot login"', () => {
      const result = triageTicket('User cannot login to the portal', false);
      expect(result.severity).toBe('high');
    });

    test('classifies high severity for "vip"', () => {
      const result = triageTicket('VIP user requesting access', false);
      expect(result.severity).toBe('high');
    });

    test('classifies medium severity for "failed"', () => {
      const result = triageTicket('Deployment failed', false);
      expect(result.severity).toBe('medium');
    });

    test('classifies medium severity for "error"', () => {
      const result = triageTicket('Getting an error on the page', false);
      expect(result.severity).toBe('medium');
    });

    test('classifies medium severity for "vpn"', () => {
      const result = triageTicket('VPN connection issue', false);
      expect(result.severity).toBe('medium');
    });

    test('classifies medium severity for "password"', () => {
      const result = triageTicket('Need to reset my password', false);
      expect(result.severity).toBe('medium');
    });

    test('classifies medium severity for "timeout"', () => {
      const result = triageTicket('Request timeout on load', false);
      expect(result.severity).toBe('medium');
    });

    test('classifies low severity for unrecognised text', () => {
      const result = triageTicket('How do I change my profile picture?', false);
      expect(result.severity).toBe('low');
    });

    test('critical takes precedence over high', () => {
      const result = triageTicket('critical security breach', false);
      expect(result.severity).toBe('critical');
    });

    test('high takes precedence over medium', () => {
      const result = triageTicket('blocked by vpn error', false);
      expect(result.severity).toBe('high');
    });
  });

  describe('category classification', () => {
    test('vpn -> network-access', () => {
      expect(triageTicket('VPN is not connecting', false).category).toBe('network-access');
    });

    test('password -> identity-access', () => {
      expect(triageTicket('Need password reset', false).category).toBe('identity-access');
    });

    test('okta -> identity-access', () => {
      expect(triageTicket('Okta MFA not working', false).category).toBe('identity-access');
    });

    test('mfa -> identity-access', () => {
      expect(triageTicket('MFA token expired', false).category).toBe('identity-access');
    });

    test('email -> messaging', () => {
      expect(triageTicket('Email delivery delayed', false).category).toBe('messaging');
    });

    test('mailbox -> messaging', () => {
      expect(triageTicket('Mailbox is full', false).category).toBe('messaging');
    });

    test('exchange -> messaging', () => {
      expect(triageTicket('Exchange sync failing', false).category).toBe('messaging');
    });

    test('outage -> service-incident', () => {
      expect(triageTicket('Complete outage of the API', false).category).toBe('service-incident');
    });

    test('production -> service-incident', () => {
      expect(triageTicket('Production deploy issue', false).category).toBe('service-incident');
    });

    test('unrecognised text -> general-support', () => {
      expect(triageTicket('How do I use the app?', false).category).toBe('general-support');
    });
  });

  describe('needs_vision', () => {
    test('true when hasImage is true', () => {
      expect(triageTicket('Some text', true).needs_vision).toBe(true);
    });

    test('false when hasImage is false', () => {
      expect(triageTicket('Some text', false).needs_vision).toBe(false);
    });

    test('false when hasImage is undefined', () => {
      expect(triageTicket('Some text').needs_vision).toBe(false);
    });
  });

  test('is case-insensitive', () => {
    const result = triageTicket('CRITICAL OUTAGE', false);
    expect(result.severity).toBe('critical');
  });
});

// ---------------------------------------------------------------------------
// retrieveDocs
// ---------------------------------------------------------------------------
describe('retrieveDocs', () => {
  test('returns up to 3 documents by default', () => {
    const triage = { category: 'general-support', severity: 'low' };
    const docs = retrieveDocs('something random', triage);
    expect(docs.length).toBeLessThanOrEqual(3);
  });

  test('respects custom limit', () => {
    const triage = { category: 'general-support', severity: 'low' };
    const docs = retrieveDocs('vpn error password outage email', triage, 2);
    expect(docs.length).toBeLessThanOrEqual(2);
  });

  test('returns VPN doc first for VPN-related text', () => {
    const triage = { category: 'network-access', severity: 'medium' };
    const docs = retrieveDocs('VPN connection failed with 403 error on GlobalProtect gateway', triage);
    expect(docs[0].id).toBe('KB-001');
  });

  test('returns password doc for password-related text', () => {
    const triage = { category: 'identity-access', severity: 'medium' };
    const docs = retrieveDocs('I need to reset my Okta password and MFA is locked', triage);
    expect(docs[0].id).toBe('KB-002');
  });

  test('returns mailbox doc for exchange/quota text', () => {
    const triage = { category: 'messaging', severity: 'medium' };
    const docs = retrieveDocs('Exchange mailbox quota exceeded, need to archive', triage);
    expect(docs[0].id).toBe('KB-003');
  });

  test('returns outage doc for production outage text', () => {
    const triage = { category: 'service-incident', severity: 'critical' };
    const docs = retrieveDocs('sev1 production outage database down', triage);
    expect(docs[0].id).toBe('KB-004');
  });

  test('each doc has id, title, and excerpt fields', () => {
    const triage = { category: 'general-support', severity: 'low' };
    const docs = retrieveDocs('vpn', triage);
    for (const doc of docs) {
      expect(doc).toHaveProperty('id');
      expect(doc).toHaveProperty('title');
      expect(doc).toHaveProperty('excerpt');
    }
  });

  test('does not include score in output', () => {
    const triage = { category: 'general-support', severity: 'low' };
    const docs = retrieveDocs('vpn', triage);
    for (const doc of docs) {
      expect(doc).not.toHaveProperty('score');
    }
  });

  test('returns docs even for unrelated text (best-effort)', () => {
    const triage = { category: 'general-support', severity: 'low' };
    const docs = retrieveDocs('completely unrelated query about cats', triage);
    expect(docs.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// buildFallbackResolution
// ---------------------------------------------------------------------------
describe('buildFallbackResolution', () => {
  const triage = { category: 'network-access', severity: 'medium' };
  const docs = [
    { id: 'KB-001', title: 'VPN fix', excerpt: 'Update GlobalProtect' },
    { id: 'KB-005', title: 'Screenshot', excerpt: 'Extract error codes' },
  ];

  test('uses triage severity', () => {
    const result = buildFallbackResolution('vpn issue', triage, docs);
    expect(result.severity).toBe('medium');
  });

  test('uses primary doc excerpt as recommended_action', () => {
    const result = buildFallbackResolution('vpn issue', triage, docs);
    expect(result.recommended_action).toBe('Update GlobalProtect');
  });

  test('includes all doc ids as citations', () => {
    const result = buildFallbackResolution('vpn issue', triage, docs);
    expect(result.citations).toEqual(['KB-001', 'KB-005']);
  });

  test('sets confidence to 0.58 when primary doc exists', () => {
    const result = buildFallbackResolution('vpn issue', triage, docs);
    expect(result.confidence).toBe(0.58);
  });

  test('sets confidence to 0.35 when no docs', () => {
    const result = buildFallbackResolution('something', triage, []);
    expect(result.confidence).toBe(0.35);
  });

  test('provides generic recommended_action when no docs', () => {
    const result = buildFallbackResolution('something', triage, []);
    expect(result.recommended_action).toContain('Collect the exact error message');
  });

  test('root_cause_hypothesis includes category', () => {
    const result = buildFallbackResolution('vpn issue', triage, docs);
    expect(result.root_cause_hypothesis).toContain('network-access');
  });

  test('customer_facing_draft includes category', () => {
    const result = buildFallbackResolution('vpn issue', triage, docs);
    expect(result.customer_facing_draft).toContain('network-access');
  });

  test('customer_facing_draft includes recommended action', () => {
    const result = buildFallbackResolution('vpn issue', triage, docs);
    expect(result.customer_facing_draft).toContain('Update GlobalProtect');
  });

  test('returns all required schema fields', () => {
    const result = buildFallbackResolution('x', triage, docs);
    expect(result).toHaveProperty('severity');
    expect(result).toHaveProperty('root_cause_hypothesis');
    expect(result).toHaveProperty('recommended_action');
    expect(result).toHaveProperty('citations');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('customer_facing_draft');
  });
});

// ---------------------------------------------------------------------------
// parseJson
// ---------------------------------------------------------------------------
describe('parseJson', () => {
  test('parses valid JSON string', () => {
    const input = '{"severity":"high","confidence":0.9}';
    const result = parseJson(input);
    expect(result).toEqual({ severity: 'high', confidence: 0.9 });
  });

  test('returns non-string input as-is', () => {
    const obj = { severity: 'low' };
    expect(parseJson(obj)).toBe(obj);
  });

  test('returns null input as-is', () => {
    expect(parseJson(null)).toBe(null);
  });

  test('returns number input as-is', () => {
    expect(parseJson(42)).toBe(42);
  });

  test('extracts JSON from surrounding text', () => {
    const input = 'Here is the result: {"severity":"medium"} and more text';
    const result = parseJson(input);
    expect(result).toEqual({ severity: 'medium' });
  });

  test('extracts JSON from markdown code fences', () => {
    const input = '```json\n{"severity":"low","confidence":0.5}\n```';
    const result = parseJson(input);
    expect(result).toEqual({ severity: 'low', confidence: 0.5 });
  });

  test('returns null for non-JSON string without braces', () => {
    const result = parseJson('no json here at all');
    expect(result).toBeNull();
  });

  test('returns null for malformed JSON in braces', () => {
    const result = parseJson('{not valid json}');
    expect(result).toBeNull();
  });

  test('handles nested JSON objects', () => {
    const input = '{"a":{"b":"c"},"d":[1,2]}';
    const result = parseJson(input);
    expect(result).toEqual({ a: { b: 'c' }, d: [1, 2] });
  });

  test('handles multiline JSON', () => {
    const input = `{
      "severity": "critical",
      "confidence": 1.0
    }`;
    const result = parseJson(input);
    expect(result).toEqual({ severity: 'critical', confidence: 1.0 });
  });
});

// ---------------------------------------------------------------------------
// shouldEscalate
// ---------------------------------------------------------------------------
describe('shouldEscalate', () => {
  test('returns true for "high"', () => {
    expect(shouldEscalate('high')).toBe(true);
  });

  test('returns true for "critical"', () => {
    expect(shouldEscalate('critical')).toBe(true);
  });

  test('returns false for "medium"', () => {
    expect(shouldEscalate('medium')).toBe(false);
  });

  test('returns false for "low"', () => {
    expect(shouldEscalate('low')).toBe(false);
  });

  test('returns false for undefined', () => {
    expect(shouldEscalate(undefined)).toBe(false);
  });

  test('returns false for empty string', () => {
    expect(shouldEscalate('')).toBe(false);
  });
});
