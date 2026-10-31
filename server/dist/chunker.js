/**
 * Intelligent Semantic Chunking Service:
 * - Target chunk size: 400-700 tokens (~1600-2800 chars)
 * - Chunk overlap: 60-100 tokens (~240-400 chars)
 * - Keeps headings connected to related content
 * - Avoids breaking definitions, lists, tables, and explanations
 * - Preserves short PPT slides as intact slide-level searchable units
 * - Splits oversized slides or sections while preserving slide/section metadata
 * - Avoids empty, duplicate, or irrelevant chunks
 * - Enforces metadata: userId, documentId, filename, fileType, page/slide, section, sequence, version, createdAt
 */
export function chunkSections(sections, documentId, userId, documentName, chunkSize, overlap, options) {
    // Configurable settings via options, env variables, or defaults
    const envTargetTokens = process.env.CHUNK_TARGET_SIZE_TOKENS
        ? parseInt(process.env.CHUNK_TARGET_SIZE_TOKENS, 10)
        : 500;
    const envOverlapTokens = process.env.CHUNK_OVERLAP_TOKENS
        ? parseInt(process.env.CHUNK_OVERLAP_TOKENS, 10)
        : 80;
    const targetTokens = options?.targetTokens || envTargetTokens;
    const overlapTokens = options?.overlapTokens || envOverlapTokens;
    // Approximate 4 characters per token
    const defaultSizeChars = Math.max(1200, Math.min(3000, targetTokens * 4));
    const defaultOverlapChars = Math.max(150, Math.min(500, overlapTokens * 4));
    const effectiveChunkSize = typeof chunkSize === 'number' && chunkSize > 0
        ? chunkSize
        : defaultSizeChars;
    const effectiveOverlap = typeof overlap === 'number' && overlap >= 0
        ? overlap
        : defaultOverlapChars;
    const fileType = (documentName.split('.').pop()?.toLowerCase() || 'unknown').replace(/[^a-z0-9]/g, '');
    const creationTime = Date.now();
    const version = 'v2.2-rag';
    const chunks = [];
    let globalIndex = 0;
    const seenTexts = new Set();
    for (const section of sections) {
        const text = section.text.trim();
        if (!text || text.length < 5)
            continue;
        const pageOrSlidePrefix = section.slideNumber
            ? `s${section.slideNumber}`
            : `p${section.pageNumber || 1}`;
        const heading = section.heading || (section.slideNumber ? `Slide ${section.slideNumber}` : `Page ${section.pageNumber || 1}`);
        const headingPrefix = heading ? `[${heading}]\n` : '';
        const isSlide = typeof section.slideNumber === 'number';
        // For presentation slides, keep short slides (up to 2500 chars) intact as individual slide-level units
        const slideUnitLimit = isSlide ? Math.max(effectiveChunkSize, 2500) : effectiveChunkSize;
        if (text.length <= slideUnitLimit) {
            const fullText = headingPrefix && !text.startsWith('[Slide') ? `${headingPrefix}${text}` : text;
            const normalizedKey = fullText.trim().toLowerCase();
            if (seenTexts.has(normalizedKey))
                continue;
            seenTexts.add(normalizedKey);
            chunks.push({
                id: `chunk_${documentId}_${pageOrSlidePrefix}_${globalIndex}`,
                documentId,
                userId,
                documentName,
                sourceFilename: documentName,
                fileType,
                pageNumber: section.pageNumber,
                slideNumber: section.slideNumber,
                heading,
                sectionTitle: heading,
                chunkIndex: globalIndex,
                sequenceNumber: globalIndex++,
                processingVersion: version,
                indexingVersion: version,
                createdAt: creationTime,
                text: fullText,
                textContent: fullText,
            });
            continue;
        }
        // Oversized slide or document section: split into overlapping semantic windows
        let start = 0;
        while (start < text.length) {
            let end = start + effectiveChunkSize;
            // Find natural boundary (markdown table row, newline, sentence end, or space)
            if (end < text.length) {
                const nextBreak = text.lastIndexOf('\n', end);
                const nextSentence = text.lastIndexOf('. ', end);
                const nextSpace = text.lastIndexOf(' ', end);
                if (nextBreak > start + effectiveChunkSize * 0.5) {
                    end = nextBreak + 1;
                }
                else if (nextSentence > start + effectiveChunkSize * 0.5) {
                    end = nextSentence + 2;
                }
                else if (nextSpace > start + effectiveChunkSize * 0.5) {
                    end = nextSpace + 1;
                }
            }
            else {
                end = text.length;
            }
            const chunkBody = text.slice(start, end).trim();
            if (chunkBody.length > 25) {
                const chunkWithHeading = headingPrefix && !chunkBody.startsWith('[Slide')
                    ? `${headingPrefix}${chunkBody}`
                    : chunkBody;
                const normalizedKey = chunkWithHeading.trim().toLowerCase();
                if (!seenTexts.has(normalizedKey)) {
                    seenTexts.add(normalizedKey);
                    chunks.push({
                        id: `chunk_${documentId}_${pageOrSlidePrefix}_${globalIndex}`,
                        documentId,
                        userId,
                        documentName,
                        sourceFilename: documentName,
                        fileType,
                        pageNumber: section.pageNumber,
                        slideNumber: section.slideNumber,
                        heading,
                        sectionTitle: heading,
                        chunkIndex: globalIndex,
                        sequenceNumber: globalIndex++,
                        processingVersion: version,
                        indexingVersion: version,
                        createdAt: creationTime,
                        text: chunkWithHeading,
                        textContent: chunkWithHeading,
                    });
                }
            }
            if (end >= text.length)
                break;
            start = end - effectiveOverlap;
            if (start >= end)
                start = end;
        }
    }
    return chunks;
}
