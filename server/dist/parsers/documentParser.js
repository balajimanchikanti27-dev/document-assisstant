import fs from 'fs';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import WordExtractor from 'word-extractor';
export const SUPPORTED_DOCUMENT_EXTENSIONS = [
    '.pdf',
    '.ppt',
    '.pptx',
    '.doc',
    '.docx',
    '.txt',
    '.md',
];
export async function parseDocument(input, filename, mimetype) {
    const buffer = typeof input === 'string' ? fs.readFileSync(input) : input;
    if (!buffer || buffer.length === 0) {
        throw new Error(`The file "${filename}" is empty (0 bytes). Please upload a valid document.`);
    }
    const extension = ('.' + filename.split('.').pop()?.toLowerCase()) || '';
    // Validate format against supported extensions or known file magic bytes
    const isKnownExtension = SUPPORTED_DOCUMENT_EXTENSIONS.includes(extension);
    const isPdfMagic = buffer.length >= 4 && buffer.subarray(0, 4).toString('hex') === '25504446';
    const isOpenXmlMagic = buffer.length >= 2 && buffer.subarray(0, 2).toString('hex') === '504b';
    if (!isKnownExtension && !isPdfMagic && !isOpenXmlMagic) {
        throw new Error(`Unsupported file format "${extension || 'unknown'}". Supported formats: PDF, PPT, PPTX, DOC, DOCX, TXT, MD.`);
    }
    try {
        if (extension === '.pdf' || mimetype === 'application/pdf') {
            return await parsePdf(buffer, filename);
        }
        if (extension === '.pptx') {
            return await parsePptx(buffer, filename);
        }
        if (extension === '.ppt' || mimetype === 'application/vnd.ms-powerpoint') {
            return await parsePpt(buffer, filename);
        }
        if (extension === '.docx') {
            return await parseDocx(buffer, filename);
        }
        if (extension === '.doc' || mimetype === 'application/msword') {
            return await parseDoc(buffer, filename);
        }
        if (extension === '.md') {
            return parseMarkdown(buffer, filename);
        }
        if (extension === '.txt' || mimetype?.startsWith('text/')) {
            return parseText(buffer, filename);
        }
        // Try sniffing file signature if extension was unexpected but magic matched
        if (isPdfMagic) {
            return await parsePdf(buffer, filename);
        }
        if (isOpenXmlMagic) {
            // PK signature (ZIP based OpenXML)
            return await parsePptx(buffer, filename).catch(() => parseDocx(buffer, filename));
        }
        throw new Error(`Unsupported file format "${extension}". Supported formats: PDF, PPT, PPTX, DOC, DOCX, TXT, MD.`);
    }
    catch (err) {
        if (err.message &&
            (err.message.includes('Scanned document') ||
                err.message.includes('empty') ||
                err.message.includes('Unsupported file format'))) {
            throw err;
        }
        throw new Error(`Failed to process "${filename}": ${err.message || 'Corrupt or unsupported format.'}`);
    }
}
async function executePdfParse(buffer, options) {
    // Node.js pool-allocated Buffers have byteOffset > 0 within a shared 8KB+ ArrayBuffer.
    // pdf.js accesses the underlying ArrayBuffer from offset 0, reading unrelated pool memory and causing "bad XRef entry".
    // Creating a new dedicated Buffer copies only the PDF bytes into a dedicated ArrayBuffer starting at offset 0.
    const cleanData = Buffer.from(new Uint8Array(buffer));
    try {
        return await pdfParse(cleanData, options);
    }
    catch (err) {
        return await pdfParse(cleanData, options);
    }
}
async function parsePdf(buffer, filename) {
    const pages = [];
    try {
        const options = {
            pagerender: (pageData) => {
                return pageData.getTextContent().then((textContent) => {
                    let lastY;
                    let text = '';
                    for (const item of textContent.items) {
                        if (lastY === item.transform[5] || lastY === undefined) {
                            text += item.str;
                        }
                        else {
                            text += '\n' + item.str;
                        }
                        lastY = item.transform[5];
                    }
                    const pageNum = (pageData.pageIndex || 0) + 1;
                    return `---PAGE_START_${pageNum}---${text}---PAGE_END_${pageNum}---`;
                });
            },
        };
        const data = await executePdfParse(buffer, options);
        const rawText = data.text || '';
        const regex = /---PAGE_START_(\d+)---([\s\S]*?)---PAGE_END_\1---/g;
        let match;
        while ((match = regex.exec(rawText)) !== null) {
            const pageNum = parseInt(match[1], 10);
            const cleaned = match[2].trim();
            if (cleaned.length > 0) {
                pages.push({
                    pageNumber: pageNum,
                    heading: `Page ${pageNum}`,
                    text: cleaned,
                });
            }
        }
        if (pages.length === 0 && data.text && data.text.trim().length > 0) {
            pages.push({
                pageNumber: 1,
                heading: 'Page 1',
                text: data.text.trim(),
            });
        }
    }
    catch (err) {
        console.warn(`PDF page extraction fallback for ${filename}:`, err.message);
        try {
            const simple = await executePdfParse(buffer);
            if (simple.text && simple.text.trim()) {
                const full = simple.text.trim();
                const parts = full.split(/\f|\n\s*Page \d+/i).filter((s) => s.trim().length > 0);
                if (parts.length > 1) {
                    parts.forEach((p, idx) => {
                        pages.push({
                            pageNumber: idx + 1,
                            heading: `Page ${idx + 1}`,
                            text: p.trim(),
                        });
                    });
                }
                else {
                    pages.push({
                        pageNumber: 1,
                        heading: 'Page 1',
                        text: full,
                    });
                }
            }
        }
        catch (e) {
            throw new Error(`Unable to read PDF file "${filename}". The file may be password-protected or corrupt.`);
        }
    }
    if (pages.length === 0 || pages.every((p) => p.text.trim().length === 0)) {
        throw new Error(`Scanned document detected: The PDF "${filename}" contains no selectable text layer. OCR extraction is required but unavailable in the current configuration.`);
    }
    return pages;
}
function convertHtmlTableToMarkdown(tblHtml) {
    const rowMatches = tblHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
    if (rowMatches.length === 0)
        return '';
    const rows = [];
    for (let r = 0; r < rowMatches.length; r++) {
        const row = rowMatches[r];
        const cellMatches = row.match(/<(?:td|th)[^>]*>[\s\S]*?<\/(?:td|th)>/gi) || [];
        const cellTexts = cellMatches.map((c) => c
            .replace(/<[^>]+>/g, '')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ')
            .trim()
            .replace(/\|/g, '/'));
        if (cellTexts.some((t) => t.length > 0)) {
            rows.push(`| ${cellTexts.join(' | ')} |`);
            if (r === 0) {
                rows.push(`| ${cellTexts.map(() => '---').join(' | ')} |`);
            }
        }
    }
    return rows.join('\n');
}
function extractSectionsFromMammothHtml(html) {
    const sections = [];
    const blockRegex = /<(h[1-6]|p|table|ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi;
    let match;
    let currentHeading = 'Document Overview';
    let currentAcc = '';
    let currentPage = 1;
    while ((match = blockRegex.exec(html)) !== null) {
        const tag = match[1].toLowerCase();
        const inner = match[2];
        if (tag.startsWith('h')) {
            const headingText = inner.replace(/<[^>]+>/g, '').trim();
            if (headingText) {
                if (currentAcc.trim().length > 0) {
                    sections.push({
                        pageNumber: currentPage++,
                        heading: currentHeading,
                        text: currentAcc.trim(),
                    });
                    currentAcc = '';
                }
                currentHeading = headingText;
            }
        }
        else if (tag === 'table') {
            const mdTable = convertHtmlTableToMarkdown(match[0]);
            if (mdTable) {
                currentAcc += `\n\n${mdTable}\n\n`;
            }
        }
        else if (tag === 'ul' || tag === 'ol') {
            const liMatches = inner.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
            const listItems = liMatches
                .map((li) => '- ' + li.replace(/<[^>]+>/g, '').trim())
                .filter((t) => t.length > 2);
            if (listItems.length > 0) {
                currentAcc += `\n${listItems.join('\n')}\n`;
            }
        }
        else if (tag === 'p') {
            const pText = inner.replace(/<[^>]+>/g, '').trim();
            if (pText) {
                currentAcc += `\n\n${pText}`;
            }
        }
        if (currentAcc.length > 2500) {
            sections.push({
                pageNumber: currentPage++,
                heading: currentHeading,
                text: currentAcc.trim(),
            });
            currentAcc = '';
        }
    }
    if (currentAcc.trim().length > 0) {
        sections.push({
            pageNumber: currentPage,
            heading: currentHeading,
            text: currentAcc.trim(),
        });
    }
    return sections;
}
async function parseDocxOpenXml(zip) {
    const docFile = zip.file('word/document.xml');
    if (!docFile)
        return [];
    const xml = await docFile.async('text');
    const sections = [];
    // 1. Extract tables from <w:tbl>
    const tableMatches = xml.match(/<w:tbl[^>]*>[\s\S]*?<\/w:tbl>/gi) || [];
    const formattedTables = [];
    for (const tbl of tableMatches) {
        const rowMatches = tbl.match(/<w:tr[^>]*>[\s\S]*?<\/w:tr>/gi) || [];
        const tableRows = [];
        for (let r = 0; r < rowMatches.length; r++) {
            const row = rowMatches[r];
            const cellMatches = row.match(/<w:tc[^>]*>[\s\S]*?<\/w:tc>/gi) || [];
            const cellTexts = cellMatches.map((cell) => {
                const textMatches = cell.match(/<w:t[^>]*>(.*?)<\/w:t>/gi) || [];
                return textMatches
                    .map((m) => unescapeXml(m.replace(/<[^>]+>/g, '')).trim())
                    .filter(Boolean)
                    .join(' ')
                    .replace(/\|/g, '/');
            });
            if (cellTexts.some((c) => c.length > 0)) {
                tableRows.push(`| ${cellTexts.join(' | ')} |`);
                if (r === 0) {
                    tableRows.push(`| ${cellTexts.map(() => '---').join(' | ')} |`);
                }
            }
        }
        if (tableRows.length > 0) {
            formattedTables.push(tableRows.join('\n'));
        }
    }
    // 2. Extract paragraphs from <w:p>
    const xmlWithoutTables = xml.replace(/<w:tbl[^>]*>[\s\S]*?<\/w:tbl>/gi, '');
    const pMatches = xmlWithoutTables.match(/<w:p[^>]*>[\s\S]*?<\/w:p>/gi) || [];
    const paragraphs = [];
    let detectedHeading = 'Word Document Content';
    for (const pXml of pMatches) {
        const tMatches = pXml.match(/<w:t[^>]*>(.*?)<\/w:t>/gi) || [];
        const lineText = tMatches
            .map((m) => unescapeXml(m.replace(/<[^>]+>/g, '')).trim())
            .filter(Boolean)
            .join(' ');
        if (lineText) {
            if (pXml.includes('Heading') || (lineText.length < 70 && !lineText.endsWith('.'))) {
                detectedHeading = lineText;
            }
            paragraphs.push(lineText);
        }
    }
    const combinedBlocks = [];
    if (paragraphs.length > 0)
        combinedBlocks.push(paragraphs.join('\n\n'));
    if (formattedTables.length > 0)
        combinedBlocks.push(formattedTables.join('\n\n'));
    const fullText = combinedBlocks.join('\n\n').trim();
    if (fullText) {
        sections.push({
            pageNumber: 1,
            heading: detectedHeading,
            text: fullText,
        });
    }
    return sections;
}
async function parseDocx(buffer, filename) {
    // 1. Try rich HTML conversion via Mammoth (extracts headings, tables, lists, and paragraphs)
    try {
        const htmlResult = await mammoth.convertToHtml({ buffer });
        const html = (htmlResult.value || '').trim();
        if (html) {
            const htmlSections = extractSectionsFromMammothHtml(html);
            if (htmlSections.length > 0) {
                return htmlSections;
            }
        }
    }
    catch (err) {
        // Proceed to OpenXML zip parsing
    }
    // 2. Try direct OpenXML ZIP parsing for tables and headings
    try {
        const zip = await JSZip.loadAsync(buffer);
        const xmlSections = await parseDocxOpenXml(zip);
        if (xmlSections.length > 0) {
            return xmlSections;
        }
    }
    catch (e) { }
    // 3. Fallback to Mammoth raw text
    try {
        const result = await mammoth.extractRawText({ buffer });
        const fullText = result.value.trim();
        if (fullText) {
            const paragraphs = fullText.split(/\n\s*\n/);
            const sections = [];
            let currentPage = 1;
            let currentAcc = '';
            let currentHeading = 'Document Section 1';
            for (const p of paragraphs) {
                const trimmed = p.trim();
                if (trimmed.length > 2 && trimmed.length < 80 && !trimmed.endsWith('.')) {
                    currentHeading = trimmed;
                }
                if (currentAcc.length + p.length > 2500 && currentAcc.length > 0) {
                    sections.push({
                        pageNumber: currentPage++,
                        heading: currentHeading,
                        text: currentAcc.trim(),
                    });
                    currentAcc = p + '\n\n';
                }
                else {
                    currentAcc += p + '\n\n';
                }
            }
            if (currentAcc.trim().length > 0) {
                sections.push({
                    pageNumber: currentPage,
                    heading: currentHeading,
                    text: currentAcc.trim(),
                });
            }
            if (sections.length > 0)
                return sections;
        }
    }
    catch (err) {
        throw new Error(`Failed to parse Word document "${filename}": ${err.message}`);
    }
    throw new Error(`The Word document "${filename}" contains no readable text.`);
}
function unescapeXml(text) {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}
function isDecorativeNoise(str) {
    const trimmed = str.trim();
    if (!trimmed)
        return true;
    // Brackets, punctuation, icons, bullets: { }, !, [ ], •, -, etc.
    if (/^[\s{}!\[\]()•\-_|*#~`'"<>+=/\\^]+$/.test(trimmed))
        return true;
    // Single non-alphanumeric character
    if (trimmed.length === 1 && !/[a-zA-Z0-9]/.test(trimmed))
        return true;
    return false;
}
const COMMON_SLIDE_CATEGORIES = new Set([
    'FUNDAMENTALS', 'ROADMAP', 'OVERVIEW', 'INTRODUCTION', 'UNIT I', 'UNIT II', 'UNIT III', 'UNIT IV', 'UNIT V',
    'MODULE 1', 'MODULE 2', 'MODULE 3', 'EXAMPLE PROGRAM', 'EXAMPLE PROGRAMS', 'WHY IT MATTERS',
    'COMPARISON', 'CLASSIFICATION', 'SYNTAX TOOLKIT', 'CORE SYNTAX', 'THE STANDARD LIBRARY',
    'CUSTOM EXCEPTIONS', 'RAISING EXCEPTIONS', 'DECLARING EXCEPTIONS', 'ADVANCED TRY BLOCKS',
    'HANDLING SEVERAL EXCEPTION TYPES', 'TOPIC', 'SUMMARY', 'CONCLUSION', 'AGENDA'
]);
function extractMarkdownTable(tblXml) {
    const rows = tblXml.match(/<a:tr[^>]*>[\s\S]*?<\/a:tr>/gi) || [];
    const formattedRows = [];
    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
        const row = rows[rIdx];
        const cells = row.match(/<a:tc[^>]*>[\s\S]*?<\/a:tc>/gi) || [];
        const cellTexts = cells.map((cell) => {
            const textMatches = cell.match(/<a:t[^>]*>(.*?)<\/a:t>/gi) || [];
            return textMatches
                .map((m) => unescapeXml(m.replace(/<[^>]+>/g, '')).trim())
                .filter((t) => !isDecorativeNoise(t))
                .join(' ')
                .replace(/\|/g, '/');
        });
        if (cellTexts.some((c) => c.length > 0)) {
            formattedRows.push(`| ${cellTexts.join(' | ')} |`);
            if (rIdx === 0) {
                formattedRows.push(`| ${cellTexts.map(() => '---').join(' | ')} |`);
            }
        }
    }
    return formattedRows.join('\n');
}
async function parsePptx(buffer, filename) {
    const sections = [];
    let zip;
    try {
        zip = await JSZip.loadAsync(buffer);
    }
    catch (e) {
        throw new Error(`The presentation "${filename}" is corrupted or is not a valid OpenXML presentation.`);
    }
    const slideFiles = [];
    zip.forEach((relativePath, file) => {
        const match = relativePath.match(/ppt\/slides\/slide(\d+)\.xml$/i);
        if (match) {
            slideFiles.push({
                num: parseInt(match[1], 10),
                file,
            });
        }
    });
    slideFiles.sort((a, b) => a.num - b.num);
    let totalTablesFound = 0;
    for (const slide of slideFiles) {
        const xml = await slide.file.async('text');
        // 1. Extract slide title if available from title placeholder
        let slideTitle = '';
        const titleMatch = xml.match(/<p:sp[^>]*>[\s\S]*?<p:ph[^>]*type="(?:title|ctrTitle)"[\s\S]*?<\/p:sp>/i);
        if (titleMatch) {
            const titleMatches = titleMatch[0].match(/<a:t[^>]*>(.*?)<\/a:t>/gi) || [];
            const extracted = titleMatches
                .map((m) => unescapeXml(m.replace(/<[^>]+>/g, '')).trim())
                .filter((t) => !isDecorativeNoise(t))
                .join(' ');
            if (extracted.length > 1) {
                slideTitle = extracted;
            }
        }
        // 2. Extract structured tables (<a:tbl>)
        const tableMatches = xml.match(/<a:tbl[^>]*>[\s\S]*?<\/a:tbl>/gi) || [];
        const formattedTables = tableMatches.map(extractMarkdownTable).filter(Boolean);
        totalTablesFound += formattedTables.length;
        // 3. Extract text paragraphs (remove table markup first so cell text is not duplicated)
        const xmlWithoutTables = xml.replace(/<a:tbl[^>]*>[\s\S]*?<\/a:tbl>/gi, '');
        const pBlocks = xmlWithoutTables.split(/<a:p[ >]/i).slice(1);
        const paragraphs = [];
        for (const pBlock of pBlocks) {
            const pContent = pBlock.split(/<\/a:p>/i)[0];
            const textMatches = pContent.match(/<a:t[^>]*>(.*?)<\/a:t>/gi) || [];
            const lineText = textMatches
                .map((m) => unescapeXml(m.replace(/<[^>]+>/g, '')).trim())
                .filter(Boolean)
                .join(' ');
            if (lineText && !isDecorativeNoise(lineText)) {
                paragraphs.push(lineText);
            }
        }
        // Fallback to all a:t tags if paragraph split was empty
        if (paragraphs.length === 0) {
            const textMatches = xmlWithoutTables.match(/<a:t[^>]*>(.*?)<\/a:t>/gi) || [];
            const fallbackText = textMatches
                .map((m) => unescapeXml(m.replace(/<[^>]+>/g, '')).trim())
                .filter((t) => !isDecorativeNoise(t))
                .join(' ');
            if (fallbackText)
                paragraphs.push(fallbackText);
        }
        // 4. Intelligent slide heading determination
        if (!slideTitle && paragraphs.length > 0) {
            const p0 = paragraphs[0];
            const p1 = paragraphs.length > 1 ? paragraphs[1] : '';
            const isCategory = COMMON_SLIDE_CATEGORIES.has(p0.toUpperCase()) ||
                (p0.length <= 35 && p0 === p0.toUpperCase() && !/[.!?]$/.test(p0));
            if (isCategory && p1 && p1.length < 100) {
                slideTitle = `${p0} - ${p1}`;
            }
            else if (p0.length < 90) {
                slideTitle = p0;
            }
        }
        // Assemble full slide content
        const contentBlocks = [];
        if (paragraphs.length > 0) {
            contentBlocks.push(paragraphs.join('\n'));
        }
        if (formattedTables.length > 0) {
            contentBlocks.push(formattedTables.join('\n\n'));
        }
        const slideText = contentBlocks.join('\n\n').trim();
        if (slideText.length > 0) {
            sections.push({
                slideNumber: slide.num,
                heading: slideTitle ? `Slide ${slide.num}: ${slideTitle}` : `Slide ${slide.num}`,
                text: slideText,
            });
        }
    }
    // 5. Also extract notes slides if available
    const notesFiles = [];
    zip.forEach((relativePath, file) => {
        const match = relativePath.match(/ppt\/notesSlides\/notesSlide(\d+)\.xml$/i);
        if (match) {
            notesFiles.push({ num: parseInt(match[1], 10), file });
        }
    });
    for (const note of notesFiles) {
        const xml = await note.file.async('text');
        const matches = xml.match(/<a:t[^>]*>(.*?)<\/a:t>/gi) || [];
        const noteText = matches
            .map((m) => unescapeXml(m.replace(/<[^>]+>/g, '')).trim())
            .filter((t) => !isDecorativeNoise(t))
            .join(' ');
        if (noteText.trim().length > 15) {
            const target = sections.find((s) => s.slideNumber === note.num);
            if (target) {
                target.text += `\n[Slide Notes]: ${noteText}`;
            }
        }
    }
    if (sections.length === 0) {
        throw new Error(`The presentation "${filename}" contains no readable text content across its slides.`);
    }
    if (process.env.NODE_ENV !== 'production') {
        console.log(`[PPTX EXTRACTED] "${filename}": ${sections.length} slides extracted (${totalTablesFound} tables preserved)`);
    }
    return sections;
}
async function parsePpt(buffer, filename) {
    // 1. Check if it's an OpenXML presentation with a .ppt extension
    try {
        const zipTest = await JSZip.loadAsync(buffer);
        if (zipTest.file(/ppt\/slides\/slide\d+\.xml/i).length > 0) {
            return await parsePptx(buffer, filename);
        }
    }
    catch (e) { }
    // 2. Parse legacy PowerPoint 97-2003 binary format
    const sections = [];
    const slideIndices = [];
    // Look for SlideAtom signatures (0x03EE)
    for (let i = 0; i < buffer.length - 8; i++) {
        if (buffer[i + 2] === 0xee && buffer[i + 3] === 0x03) {
            slideIndices.push(i);
        }
    }
    function extractStrings(buf) {
        const pieces = [];
        // UTF-16LE scanner
        let utf16 = '';
        for (let i = 0; i < buf.length - 1; i += 2) {
            const code = buf[i] | (buf[i + 1] << 8);
            if (code >= 32 && code <= 126) {
                utf16 += String.fromCharCode(code);
            }
            else if (code === 10 || code === 13 || code === 9) {
                utf16 += ' ';
            }
            else {
                if (utf16.trim().length >= 4)
                    pieces.push(utf16.trim());
                utf16 = '';
            }
        }
        if (utf16.trim().length >= 4)
            pieces.push(utf16.trim());
        // ASCII scanner
        let ascii = '';
        for (let i = 0; i < buf.length; i++) {
            const b = buf[i];
            if (b >= 32 && b <= 126) {
                ascii += String.fromCharCode(b);
            }
            else if (b === 10 || b === 13 || b === 9) {
                ascii += ' ';
            }
            else {
                if (ascii.trim().length >= 5) {
                    const trimmed = ascii.trim();
                    if (!pieces.some((p) => p.includes(trimmed) || trimmed.includes(p))) {
                        pieces.push(trimmed);
                    }
                }
                ascii = '';
            }
        }
        if (ascii.trim().length >= 5)
            pieces.push(ascii.trim());
        return pieces.filter((p) => !p.match(/^(Times New Roman|Arial|Calibri|Wingdings|Segoe UI|Tahoma|Verdana)$/i));
    }
    if (slideIndices.length > 1) {
        for (let idx = 0; idx < slideIndices.length; idx++) {
            const start = slideIndices[idx];
            const end = idx + 1 < slideIndices.length ? slideIndices[idx + 1] : buffer.length;
            const slideBuf = buffer.subarray(start, end);
            const texts = extractStrings(slideBuf);
            const combined = texts.join(' ').replace(/\s+/g, ' ').trim();
            if (combined.length > 0) {
                sections.push({
                    slideNumber: idx + 1,
                    heading: `Slide ${idx + 1}`,
                    text: combined,
                });
            }
        }
    }
    if (sections.length === 0) {
        const allTexts = extractStrings(buffer);
        const combined = allTexts.join(' ').replace(/\s+/g, ' ').trim();
        if (combined.length > 10) {
            const chunks = combined.match(/.{1,1000}(\s|$)/g) || [combined];
            chunks.forEach((chunk, i) => {
                if (chunk.trim()) {
                    sections.push({
                        slideNumber: i + 1,
                        heading: `Slide ${i + 1}`,
                        text: chunk.trim(),
                    });
                }
            });
        }
    }
    if (sections.length === 0) {
        throw new Error(`Could not extract readable text from legacy PowerPoint file "${filename}".`);
    }
    return sections;
}
async function parseDoc(buffer, filename) {
    // 1. Try DOCX parser in case of mistaken extension
    try {
        const zipTest = await JSZip.loadAsync(buffer);
        if (zipTest.file('word/document.xml')) {
            return await parseDocx(buffer, filename);
        }
    }
    catch (e) { }
    // 2. Use WordExtractor for Word 97-2004 binary format
    try {
        const extractor = new WordExtractor();
        const extracted = await extractor.extract(buffer);
        const fullText = (extracted.getBody() || '').trim();
        if (fullText) {
            const paragraphs = fullText.split(/\n\s*\n/);
            const sections = [];
            let currentPage = 1;
            let currentAcc = '';
            for (const p of paragraphs) {
                if (currentAcc.length + p.length > 2500 && currentAcc.length > 0) {
                    sections.push({
                        pageNumber: currentPage,
                        heading: `Page ${currentPage}`,
                        text: currentAcc.trim(),
                    });
                    currentPage++;
                    currentAcc = p + '\n\n';
                }
                else {
                    currentAcc += p + '\n\n';
                }
            }
            if (currentAcc.trim().length > 0) {
                sections.push({
                    pageNumber: currentPage,
                    heading: `Page ${currentPage}`,
                    text: currentAcc.trim(),
                });
            }
            if (sections.length > 0)
                return sections;
        }
    }
    catch (err) {
        console.warn(`WordExtractor fallback for "${filename}":`, err.message);
    }
    throw new Error(`Could not extract text from legacy Word document "${filename}". Please convert to .docx.`);
}
function parseMarkdown(buffer, filename) {
    const text = buffer.toString('utf-8').trim();
    if (!text) {
        throw new Error(`The file "${filename}" is empty.`);
    }
    const sections = [];
    const lines = text.split(/\r?\n/);
    let currentHeading = 'Overview';
    let currentLines = [];
    let sectionIndex = 1;
    for (const line of lines) {
        const headerMatch = line.match(/^#{1,4}\s+(.*)$/);
        if (headerMatch) {
            if (currentLines.length > 0) {
                const body = currentLines.join('\n').trim();
                if (body.length > 0) {
                    sections.push({
                        pageNumber: sectionIndex++,
                        heading: currentHeading,
                        text: body,
                    });
                }
                currentLines = [];
            }
            currentHeading = headerMatch[1].trim();
        }
        else {
            currentLines.push(line);
        }
    }
    if (currentLines.length > 0) {
        const body = currentLines.join('\n').trim();
        if (body.length > 0) {
            sections.push({
                pageNumber: sectionIndex,
                heading: currentHeading,
                text: body,
            });
        }
    }
    if (sections.length === 0) {
        sections.push({
            pageNumber: 1,
            heading: 'Document Content',
            text,
        });
    }
    return sections;
}
function parseText(buffer, filename) {
    const text = buffer.toString('utf-8').trim();
    if (!text) {
        throw new Error(`The document "${filename}" is empty.`);
    }
    const paragraphs = text.split(/\n\s*\n/);
    const sections = [];
    let currentPage = 1;
    let currentAcc = '';
    for (const p of paragraphs) {
        if (currentAcc.length + p.length > 2000 && currentAcc.length > 0) {
            sections.push({
                pageNumber: currentPage,
                heading: `Section ${currentPage}`,
                text: currentAcc.trim(),
            });
            currentPage++;
            currentAcc = p + '\n\n';
        }
        else {
            currentAcc += p + '\n\n';
        }
    }
    if (currentAcc.trim().length > 0) {
        sections.push({
            pageNumber: currentPage,
            heading: `Section ${currentPage}`,
            text: currentAcc.trim(),
        });
    }
    return sections;
}
