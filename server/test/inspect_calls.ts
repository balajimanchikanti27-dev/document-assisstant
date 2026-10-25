import fs from 'fs';
import pdfParse from 'pdf-parse';

async function run() {
  const buf = fs.readFileSync('uploads/documents/tester_full_suite_01__doc_pdf_net_manual_v1_Network_Protocols_Manual.pdf');
  const options = {
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

  try {
    await pdfParse(buf, options);
  } catch (e: any) {
    console.log('Call 1 threw as expected, retrying with options...');
  }

  const res2 = await pdfParse(buf, options);
  const splits = res2.text.split('---PAGE_START---').filter(Boolean);
  console.log('Call 2 with options SUCCESS! Number of page splits:', splits.length);
  splits.forEach((s, idx) => {
    console.log(`Page ${idx + 1}:`, s.replace('---PAGE_END---', '').trim());
  });
}

run();
