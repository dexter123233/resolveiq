/**
 * Ticket triage: severity classification and category detection.
 * Uses shared text utilities to eliminate duplicated term-matching logic.
 */

const { normalize, firstMatchingGroup } = require('../utils/textUtils');

const SEVERITY_GROUPS = [
  { terms: ['sev1', 'sev-1', 'critical', 'outage', 'down', 'production unavailable'], value: 'critical' },
  { terms: ['blocked', 'security', 'breach', 'data loss', 'cannot login', 'vip'], value: 'high' },
  { terms: ['failed', 'error', 'quota', 'vpn', 'password', 'timeout'], value: 'medium' },
];

const CATEGORY_GROUPS = [
  { terms: ['vpn'], value: 'network-access' },
  { terms: ['password', 'okta', 'mfa'], value: 'identity-access' },
  { terms: ['email', 'mailbox', 'exchange'], value: 'messaging' },
  { terms: ['outage', 'production'], value: 'service-incident' },
];

function triageTicket(text, hasImage) {
  const lower = normalize(text);
  const severity = firstMatchingGroup(lower, SEVERITY_GROUPS) || 'low';
  const category = firstMatchingGroup(lower, CATEGORY_GROUPS) || 'general-support';

  return { severity, category, needs_vision: Boolean(hasImage) };
}

function shouldEscalate(severity) {
  return severity === 'high' || severity === 'critical';
}

module.exports = { triageTicket, shouldEscalate, SEVERITY_GROUPS, CATEGORY_GROUPS };
