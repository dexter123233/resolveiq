/**
 * Robust JSON parsing with fallback extraction from freeform text.
 */

function parseJson(content) {
  if (typeof content !== 'string') return content;
  try {
    return JSON.parse(content);
  } catch (_error) {
    const match = content.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  }
}

module.exports = { parseJson };
