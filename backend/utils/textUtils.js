/**
 * Shared text-processing utilities used across triage, retrieval, and resolution.
 */

function normalize(input) {
  return String(input || '').toLowerCase();
}

function matchesAny(text, terms) {
  const lower = normalize(text);
  return terms.some((term) => lower.includes(term));
}

function firstMatchingGroup(text, termGroups) {
  const lower = normalize(text);
  for (const { terms, value } of termGroups) {
    if (terms.some((term) => lower.includes(term))) {
      return value;
    }
  }
  return null;
}

module.exports = { normalize, matchesAny, firstMatchingGroup };
