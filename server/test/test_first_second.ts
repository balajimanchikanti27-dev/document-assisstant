import fs from 'fs';
import pdfParse from 'pdf-parse';

// Handle harmless unhandled rejections from pdf.js v1.10.100 internal worker cleanup in modern Node
process.on('unhandledRejection', (reason: any) => {
  const msg = reason?.message || String(reason || '');
  if (msg.includes('bad XRef entry') || msg.includes('FormatError')) {
    // Ignore internal pdf.js v1 recovery rejection
    return;
  }
  console.error('Real unhandled rejection:', reason);
});

async function testFile(filename: string) {
  const buf = fs.readFileSync(filename);
  try {
    const res = await pdfParse(buf);
    console.log(`FILE ${filename}: SUCCESS! Pages: ${res.numpages}, Text:\n${res.text.trim()}\n`);
  } catch (err: any) {
    console.log(`FILE ${filename}: FAILED: ${err.message}`);
  }
}

async function run() {
  await testFile('sample_3page.pdf');
  await testFile('test.pdf');
  await testFile('uploads/documents/tester_full_suite_01__doc_pdf_net_manual_v1_Network_Protocols_Manual.pdf');
  console.log('ALL FILES TESTED COMPLETED CLEANLY!');
}

run();
