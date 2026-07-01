/**
 * Robust JSON parsing with fallback extraction from freeform text.
 */

function parseJson(content) {
  if (typeof content !== 'string') return content;
  try {
    return JSON.parse(content);
  } catch (_error) {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch (_innerError) {
      return null;
    }
  }
}

module.exports = { parseJson };
