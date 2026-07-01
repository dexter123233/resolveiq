/**
 * Document retrieval: scores KB entries against ticket text using keyword matching.
 */

const { normalize } = require('../utils/textUtils');
const { KNOWLEDGE_BASE } = require('./knowledgeBase');

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

module.exports = { retrieveDocs };
