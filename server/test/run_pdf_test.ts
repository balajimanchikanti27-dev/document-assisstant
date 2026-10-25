import fs from 'fs';
import pdfParse from 'pdf-parse';

// Let's inspect what pdfjs does by inspecting the objects in the buffer
const buf = fs.readFileSync('sample_3page.pdf');

async function run() {
  try {
    const data = await pdfParse(buf);
    console.log('Success!', data.numpages);
  } catch (err: any) {
    console.log('Error name:', err.name, 'message:', err.message);
  }
}

run();
