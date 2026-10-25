import fs from 'fs';
import pdfParse from 'pdf-parse';

async function run() {
  const buf = fs.readFileSync('uploads/documents/tester_full_suite_01__doc_pdf_net_manual_v1_Network_Protocols_Manual.pdf');
  try {
    const res = await pdfParse(buf, { version: 'v2.0.550' });
    console.log('SUCCESS! numpages:', res.numpages, 'text length:', res.text.length);
    console.log(res.text);
  } catch (err: any) {
    console.error('FAILED:', err.message);
  }
}

run();
