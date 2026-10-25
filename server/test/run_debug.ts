import fs from 'fs';
import { parseDocument } from '../src/parsers/documentParser.js';

const rawBuf = fs.readFileSync('sample_3page.pdf');

// 1. Try passing new Uint8Array(rawBuf)
const uint8 = new Uint8Array(rawBuf);
console.log('uint8 byteOffset:', uint8.byteOffset, 'buffer byteLength:', uint8.buffer.byteLength);

import pdfParse from 'pdf-parse';
const sections = await parseDocument(rawBuf, 'sample_3page.pdf');
console.log('parseDocument SUCCESS! Total sections:', sections.length);
sections.forEach(s => console.log(`  Page ${s.pageNumber}: ${s.text.trim()}`));
