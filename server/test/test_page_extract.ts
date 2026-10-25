import fs from 'fs';
import pdfParse from 'pdf-parse';

async function testPdfParse(filename: string) {
  try {
    const buf = fs.readFileSync(filename);
    const options = {
      version: 'v2.0.550',
      pagerender: (pageData: any) => {
        return pageData.getTextContent().then((textContent: any) => {
          let lastY: number | undefined;
          let text = '';
          for (const item of textContent.items) {
            if (lastY === item.transform[5] || lastY === undefined) {
              text += item.str;
            } else {
              text += '\n' + item.str;
            }
            lastY = item.transform[5];
          }
          return `---PAGE_START---${text}---PAGE_END---`;
        });
      },
    };

    const data = await pdfParse(buf, options);
    const rawText = data.text || '';
    const pageSplits = rawText.split('---PAGE_START---').filter(Boolean);
    console.log(`SUCCESS! File: ${filename} -> numPages: ${data.numpages}, pageSplits: ${pageSplits.length}`);
    pageSplits.forEach((p, idx) => {
      const cleaned = p.replace('---PAGE_END---', '').trim();
      console.log(`Page ${idx + 1}: ${cleaned}`);
    });
  } catch (err: any) {
    console.error(`FAILED! File: ${filename}:`, err.message);
  }
}

async function run() {
  await testPdfParse('sample_3page.pdf');
  await testPdfParse('test.pdf');
  await testPdfParse('uploads/documents/tester_full_suite_01__doc_pdf_net_manual_v1_Network_Protocols_Manual.pdf');
}

run();
