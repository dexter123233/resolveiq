/**
 * Reusable HTTP client with timeout/abort support.
 * Eliminates duplicated AbortController + setTimeout + clearTimeout pattern.
 */

async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { fetchWithTimeout };
