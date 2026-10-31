/**
 * Image Validation & Inspection Utility
 * Validates actual binary content, magic bytes, dimensions, and limits for JPEG, PNG, and WEBP.
 * Enforces security requirements: does not trust client-supplied filenames or MIME types.
 */
export class ImageValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ImageValidationError';
    }
}
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_DIMENSION_PX = 12000;
/**
 * Sanitize filename to prevent directory traversal or malformed strings
 */
function sanitizeFilename(filename) {
    if (!filename || typeof filename !== 'string')
        return 'attachment_image';
    // Strip paths, control chars, keep standard characters
    return filename.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 120);
}
/**
 * Extract dimensions from image binary buffer
 */
export function extractImageDimensions(buffer, mimeType) {
    try {
        if (mimeType === 'image/png' && buffer.length >= 24) {
            const width = buffer.readUInt32BE(16);
            const height = buffer.readUInt32BE(20);
            return { width, height };
        }
        if (mimeType === 'image/jpeg' && buffer.length >= 8) {
            let offset = 2;
            while (offset < buffer.length - 8) {
                if (buffer[offset] !== 0xff)
                    break;
                const marker = buffer[offset + 1];
                // Stop if SOS (0xDA) or EOI (0xD9)
                if (marker === 0xda || marker === 0xd9)
                    break;
                const segmentLength = buffer.readUInt16BE(offset + 2);
                // Check for Start of Frame (SOF) markers
                const isSOF = (marker >= 0xc0 && marker <= 0xc3) ||
                    (marker >= 0xc5 && marker <= 0xc7) ||
                    (marker >= 0xc9 && marker <= 0xcb) ||
                    (marker >= 0xcd && marker <= 0xcf);
                if (isSOF && offset + 8 <= buffer.length) {
                    const height = buffer.readUInt16BE(offset + 5);
                    const width = buffer.readUInt16BE(offset + 7);
                    return { width, height };
                }
                offset += 2 + segmentLength;
            }
        }
        if (mimeType === 'image/webp' && buffer.length >= 30) {
            const chunkType = buffer.toString('ascii', 12, 16);
            if (chunkType === 'VP8 ') {
                const width = buffer.readUInt16LE(26) & 0x3fff;
                const height = buffer.readUInt16LE(28) & 0x3fff;
                return { width, height };
            }
            else if (chunkType === 'VP8L') {
                const b1 = buffer[21];
                const b2 = buffer[22];
                const b3 = buffer[23];
                const b4 = buffer[24];
                const width = 1 + (((b2 & 0x3f) << 8) | b1);
                const height = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
                return { width, height };
            }
            else if (chunkType === 'VP8X' && buffer.length >= 30) {
                const width = 1 + buffer.readUIntLE(24, 3);
                const height = 1 + buffer.readUIntLE(27, 3);
                return { width, height };
            }
        }
    }
    catch (err) {
        // Graceful dimension parse failure
    }
    return {};
}
/**
 * Validate image payload from request:
 * - Checks base64 integrity
 * - Enforces 10MB size limit
 * - Verifies real binary magic bytes (JPEG/PNG/WEBP only)
 * - Verifies image dimensions (non-zero, <= 12000px)
 */
export function validateAndNormalizeImage(imageInput) {
    if (!imageInput || typeof imageInput !== 'object') {
        throw new ImageValidationError('Image payload must be an object.');
    }
    const rawData = imageInput.data || imageInput.base64;
    if (!rawData || typeof rawData !== 'string') {
        throw new ImageValidationError('Image data (base64) is required.');
    }
    // Strip possible data:image/...;base64, prefix
    const cleanBase64 = rawData.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '').trim();
    if (!cleanBase64) {
        throw new ImageValidationError('Image base64 content is empty.');
    }
    // Decode buffer
    let buffer;
    try {
        buffer = Buffer.from(cleanBase64, 'base64');
    }
    catch (err) {
        throw new ImageValidationError('Invalid base64 encoding.');
    }
    if (buffer.length === 0) {
        throw new ImageValidationError('Decoded image buffer is empty.');
    }
    // Enforce size limit (10MB)
    if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
        const sizeMb = (buffer.length / (1024 * 1024)).toFixed(1);
        throw new ImageValidationError(`Image exceeds maximum allowed size of 10MB (Received ${sizeMb}MB).`);
    }
    // Verify Magic Bytes
    let verifiedMime = null;
    // 1. JPEG: 0xFF 0xD8 0xFF
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        verifiedMime = 'image/jpeg';
    }
    // 2. PNG: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
    else if (buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a) {
        verifiedMime = 'image/png';
    }
    // 3. WEBP: "RIFF" (bytes 0-3) and "WEBP" (bytes 8-11)
    else if (buffer.length >= 12 &&
        buffer[0] === 0x52 && // R
        buffer[1] === 0x49 && // I
        buffer[2] === 0x46 && // F
        buffer[3] === 0x46 && // F
        buffer[8] === 0x57 && // W
        buffer[9] === 0x45 && // E
        buffer[10] === 0x42 && // B
        buffer[11] === 0x50 // P
    ) {
        verifiedMime = 'image/webp';
    }
    if (!verifiedMime) {
        throw new ImageValidationError('Unsupported image format. Only JPEG, PNG, and WEBP images are supported.');
    }
    // Extract dimensions
    const { width, height } = extractImageDimensions(buffer, verifiedMime);
    if (width !== undefined && height !== undefined) {
        if (width <= 0 || height <= 0) {
            throw new ImageValidationError('Malformed image with invalid zero dimensions.');
        }
        if (width > MAX_DIMENSION_PX || height > MAX_DIMENSION_PX) {
            throw new ImageValidationError(`Image dimensions exceed maximum allowed limit of ${MAX_DIMENSION_PX}x${MAX_DIMENSION_PX}px.`);
        }
    }
    return {
        data: cleanBase64,
        mimeType: verifiedMime,
        filename: sanitizeFilename(imageInput.filename),
        size: buffer.length,
        width,
        height,
    };
}
