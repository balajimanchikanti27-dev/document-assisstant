import fs from 'fs';
import pdfParse from 'pdf-parse';

// Let's test warming up or pre-initializing PDFJS
async function run() {
  const p = 'uploads/documents/tester_full_suite_01__doc_pdf_net_manual_v1_Network_Protocols_Manual.pdf';
  const buf = fs.readFileSync(p);

  // Warmup dummy buffer
  try {
    await pdfParse(Buffer.from('%PDF-1.4\n%%EOF'));
  } catch (e) {}

  // Now parse the real file on the first actual call
  try {
    const res = await pdfParse(buf);
    console.log('REAL PARSE RESULT: SUCCESS! Pages:', res.numpages, 'Text length:', res.text.length);
  } catch (e: any) {
    console.error('REAL PARSE RESULT: FAILED:', e.message);
  }
}

run();
