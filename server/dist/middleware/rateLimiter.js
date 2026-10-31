/**
 * In-Memory Sliding Window Rate Limiter
 * Phase 9: Protects backend AI routes and file upload endpoints from DoS and abuse.
 */
export class RateLimiter {
    records = new Map();
    windowMs;
    maxRequests;
    message;
    constructor(options = {}) {
        this.windowMs = options.windowMs || 60 * 1000;
        this.maxRequests = options.maxRequests || 60;
        this.message = options.message || 'Rate limit exceeded. Please wait before making further requests.';
        // Cleanup stale entries every 5 minutes (unref prevents blocking process exit)
        const timer = setInterval(() => this.cleanup(), 5 * 60 * 1000);
        if (timer.unref)
            timer.unref();
    }
    middleware() {
        return (req, res, next) => {
            // Use authenticated userId if available, otherwise IP address
            const key = (req.userId && req.userId !== 'anonymous')
                ? `user_${req.userId}`
                : `ip_${req.ip || req.socket.remoteAddress || 'unknown'}`;
            const now = Date.now();
            let record = this.records.get(key);
            if (!record || now > record.resetTime) {
                record = {
                    count: 1,
                    resetTime: now + this.windowMs,
                };
                this.records.set(key, record);
            }
            else {
                record.count++;
            }
            res.setHeader('X-RateLimit-Limit', this.maxRequests);
            res.setHeader('X-RateLimit-Remaining', Math.max(0, this.maxRequests - record.count));
            res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));
            if (record.count > this.maxRequests) {
                const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
                res.setHeader('Retry-After', retryAfterSeconds);
                res.status(429).json({
                    error: this.message,
                    retryAfterSeconds,
                });
                return;
            }
            next();
        };
    }
    reset(key) {
        if (key) {
            this.records.delete(key);
        }
        else {
            this.records.clear();
        }
    }
    cleanup() {
        const now = Date.now();
        for (const [key, record] of this.records.entries()) {
            if (now > record.resetTime) {
                this.records.delete(key);
            }
        }
    }
}
export const generalRateLimiter = new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 120, // 120 req/min for general routes
});
export const aiQueryRateLimiter = new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 45, // 45 queries/min for heavy LLM queries
    message: 'AI query rate limit reached. Please wait a moment before sending another question.',
});
