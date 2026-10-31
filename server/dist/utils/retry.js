/**
 * Exponential backoff retry utility for external API requests
 * Retries only transient failures (HTTP 429, 502, 503, 504, timeouts, connection resets)
 * Never retries authentication/client errors (HTTP 400, 401, 403, 404)
 */
export async function withExponentialBackoff(operation, options = {}) {
    const maxRetries = options.maxRetries ?? 2;
    const initialDelay = options.initialDelayMs ?? 500;
    const maxDelay = options.maxDelayMs ?? 4000;
    const factor = options.backoffFactor ?? 2;
    const defaultShouldRetry = (err) => {
        // Never retry client validation or auth errors
        const status = err.status || err.statusCode || (err.response && err.response.status);
        if (status === 400 || status === 401 || status === 403 || status === 404) {
            return false;
        }
        // Retry rate limits and server errors
        if (status === 429 || status === 502 || status === 503 || status === 504) {
            return true;
        }
        const msg = (err.message || '').toLowerCase();
        if (msg.includes('rate limit') ||
            msg.includes('quota') ||
            msg.includes('resource_exhausted') ||
            msg.includes('timeout') ||
            msg.includes('timed out') ||
            msg.includes('econnreset') ||
            msg.includes('etimedout')) {
            return true;
        }
        return false;
    };
    const shouldRetry = options.shouldRetry ?? defaultShouldRetry;
    let attempt = 0;
    let delay = initialDelay;
    while (true) {
        try {
            return await operation();
        }
        catch (err) {
            attempt++;
            if (attempt > maxRetries || !shouldRetry(err)) {
                throw err;
            }
            const jitter = Math.floor(Math.random() * 100);
            const waitTime = Math.min(delay + jitter, maxDelay);
            console.warn(`[RETRY] Transient failure on attempt ${attempt}/${maxRetries}. Retrying in ${waitTime}ms... (${err.message})`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            delay *= factor;
        }
    }
}
