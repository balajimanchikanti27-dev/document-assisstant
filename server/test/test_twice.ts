import fs from 'fs';
import pdfParse from 'pdf-parse';

async function run() {
  const buf = fs.readFileSync('uploads/documents/tester_full_suite_01__doc_pdf_net_manual_v1_Network_Protocols_Manual.pdf');
  try {
    console.log('Call 1...');
    await pdfParse(buf);
  } catch (e: any) {
    console.log('Call 1 failed:', e.message);
  }

  try {
    console.log('Call 2...');
    const r = await pdfParse(buf);
    console.log('Call 2 SUCCESS! Pages:', r.numpages, 'Text:', r.text.trim());
  } catch (e: any) {
    console.log('Call 2 failed:', e.message);
  }
}

run();
