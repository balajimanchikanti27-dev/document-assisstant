import fs from 'fs';
import { generateValidPdf } from './minimal_pdf_test.js';

// Let's create the pdf buffer and inspect the exact bytes
const pdfBuffer = fs.readFileSync('sample_3page.pdf');

// Let's look at what pdf.worker.js does:
// In fetchUncompressed:
// var stream = this.stream.makeSubStream(xrefEntry.offset + this.stream.start);
// var parser = new _parser.Parser(new _parser.Lexer(stream), true, this);
// var obj1 = parser.getObj();
// var obj2 = parser.getObj();
// var obj3 = parser.getObj();

console.log('PDF Length:', pdfBuffer.length);
console.log('Obj 1 offset is 9. Bytes at 9:', JSON.stringify(pdfBuffer.slice(9, 30).toString('latin1')));
