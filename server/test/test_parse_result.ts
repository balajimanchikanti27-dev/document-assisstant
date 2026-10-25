import fs from 'fs';
import pdfParse from 'pdf-parse';

async function run() {
  try {
    const buf = fs.readFileSync('sample_3page.pdf');
    const res = await pdfParse(buf);
    console.log('PDF PARSE SUCCESS! Pages:', res.numpages, 'Rendered:', res.numrender);
    console.log('TEXT CONTENT:\n', JSON.stringify(res.text));
  } catch (e: any) {
    console.log('Error caught:', e.message);
  }
}

run();
