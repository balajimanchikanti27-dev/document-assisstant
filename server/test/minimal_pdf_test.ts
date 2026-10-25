import pdfParse from 'pdf-parse';

function generateValidPdf(textLines: string[]): Buffer {
  const chunks: Buffer[] = [];
  chunks.push(Buffer.from('%PDF-1.4\n', 'latin1'));

  const offsets: number[] = [0];

  function addObj(num: number, content: string | Buffer) {
    const currentLen = chunks.reduce((acc, c) => acc + c.length, 0);
    offsets[num] = currentLen;
    chunks.push(Buffer.from(`${num} 0 obj\n`, 'latin1'));
    if (typeof content === 'string') {
      chunks.push(Buffer.from(content, 'latin1'));
    } else {
      chunks.push(content);
    }
    chunks.push(Buffer.from('\nendobj\n', 'latin1'));
  }

  // 1: Catalog
  addObj(1, '<< /Type /Catalog /Pages 2 0 R >>');

  // 2: Pages
  const numPages = textLines.length;
  const kids = Array.from({ length: numPages }, (_, i) => `${3 + i} 0 R`).join(' ');
  addObj(2, `<< /Type /Pages /Kids [${kids}] /Count ${numPages} >>`);

  // Font: object 3 + numPages
  const fontObjNum = 3 + numPages;

  // 3..3+numPages-1: Pages
  for (let i = 0; i < numPages; i++) {
    const pageNum = 3 + i;
    const contentNum = 3 + numPages + 1 + i;
    addObj(
      pageNum,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontObjNum} 0 R >> >> /Contents ${contentNum} 0 R >>`
    );
  }

  // Font object
  addObj(fontObjNum, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  // Content stream objects
  for (let i = 0; i < numPages; i++) {
    const contentNum = 3 + numPages + 1 + i;
    const sanitized = textLines[i].replace(/[()\\]/g, '');
    const stream = `BT /F1 12 Tf 72 712 Td (${sanitized}) Tj ET`;
    const streamContent = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    addObj(contentNum, streamContent);
  }

  const totalObjs = 3 + numPages * 2;
  const xrefOffset = chunks.reduce((acc, c) => acc + c.length, 0);

  let xref = `xref\n0 ${totalObjs + 1}\n0000000000 65535 f\r\n`;
  for (let i = 1; i <= totalObjs; i++) {
    const offStr = String(offsets[i]).padStart(10, '0');
    xref += `${offStr} 00000 n\r\n`;
  }

  xref += `trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  chunks.push(Buffer.from(xref, 'latin1'));

  return Buffer.concat(chunks);
}

async function run() {
  const pdfBuffer = generateValidPdf([
    'Page 1: Architecture Overview and System Infrastructure',
    'Page 2: Core Protocols and Transport Handshake',
    'Page 3: BGP operates over TCP port 179 and maintains keepalive timer of 60 seconds',
  ]);

  console.log('Generated PDF bytes:', pdfBuffer.length);
  try {
    const res = await pdfParse(pdfBuffer);
    console.log('SUCCESS! Number of pages:', res.numpages);
    console.log('Extracted text:\n', res.text.trim());
  } catch (err: any) {
    console.error('FAILED:', err.message);
  }
}

run();
