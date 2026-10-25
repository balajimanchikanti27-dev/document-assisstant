import fs from 'fs';
import pdfParse from 'pdf-parse';

async function test() {
  const buf = fs.readFileSync('sample_3page.pdf');
  try {
    const res = await pdfParse(buf);
    console.log('Simple pdfParse SUCCESS! Pages:', res.numpages, 'Text:', res.text);
  } catch (err: any) {
    console.error('Simple pdfParse FAILED:', err.message, err.stack);
  }
}

test();
