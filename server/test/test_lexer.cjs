const fs = require('fs');
const pdfBuffer = fs.readFileSync('sample_3page.pdf');

// Let's see what is at offset 9:
console.log('Bytes from 9 to 30:', JSON.stringify(pdfBuffer.slice(9, 30).toString('latin1')));

// In pdfjs, let's load the Lexer and Parser
const pdfjs = require('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js');
// Wait, pdf.js has internal classes
