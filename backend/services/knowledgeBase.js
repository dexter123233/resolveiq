/**
 * Knowledge base entries used by retrieval and fallback resolution.
 */

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

module.exports = { KNOWLEDGE_BASE };
