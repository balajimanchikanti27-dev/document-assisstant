import fs from 'fs';
import pdfParse from 'pdf-parse';

async function test(v?: string) {
  const p = 'uploads/documents/tester_full_suite_01__doc_pdf_net_manual_v1_Network_Protocols_Manual.pdf';
  try {
    const r = await pdfParse(fs.readFileSync(p), { version: v || 'default' });
    console.log(`Version ${v} SUCCESS! Pages:`, r.numpages, 'Text:', r.text.trim());
  } catch (e: any) {
    console.log(`Version ${v} FAILED:`, e.message);
  }
}

async function run() {
  await test('v1.10.88');
  await test('v2.0.550');
}

run();
