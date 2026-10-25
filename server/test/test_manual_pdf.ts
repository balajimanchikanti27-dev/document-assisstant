import fs from 'fs';
import pdfParse from 'pdf-parse';

async function test() {
  const p = 'uploads/documents/tester_full_suite_01__doc_pdf_net_manual_v1_Network_Protocols_Manual.pdf';
  try {
    const r = await pdfParse(fs.readFileSync(p));
    console.log('Network_Protocols_Manual SUCCESS! Pages:', r.numpages, 'Text length:', r.text.length);
    console.log('Text preview:\n', r.text.slice(0, 300));
  } catch (e: any) {
    console.error('FAILED:', e.message);
  }
}

test();
