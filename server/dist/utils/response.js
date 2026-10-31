export function sendSuccess(res, data, statusCode = 200, requestId) {
    const reqId = requestId || `res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    res.status(statusCode).json({
        success: true,
        data,
        requestId: reqId,
    });
}
export function sendError(res, code, message, statusCode = 500, requestId) {
    const reqId = requestId || `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const safeMessage = (message || '')
        .replace(/([?&]key=)[^&\s]+/gi, '$1[REDACTED]')
        .replace(/AIzaSy[A-Za-z0-9_-]{30,}/g, '[REDACTED_API_KEY]');
    res.status(statusCode).json({
        success: false,
        error: {
            code,
            message: safeMessage,
        },
        requestId: reqId,
    });
}
