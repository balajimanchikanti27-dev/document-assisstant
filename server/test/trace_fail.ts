import fs from 'fs';
import path from 'path';

const workerPath = path.resolve('node_modules', 'pdf-parse', 'lib', 'pdf.js', 'v1.10.100', 'build', 'pdf.worker.js');
const orig = fs.readFileSync(workerPath, 'utf8');

const needle = "if (obj1 !== num || obj2 !== gen || !(0, _primitives.isCmd)(obj3)) {";
const replacement = `
if (obj1 !== num || obj2 !== gen || !(0, _primitives.isCmd)(obj3)) {
  console.log("FAILING ON:", { num, gen, obj1, obj2, obj3, offset: xrefEntry.offset, streamPos: stream.pos });
  throw new _util.FormatError('bad XRef entry');
}
`;

fs.writeFileSync(workerPath, orig.replace(needle, replacement), 'utf8');

import pdfParse from 'pdf-parse';

async function run() {
  try {
    const buf = fs.readFileSync('sample_3page.pdf');
    await pdfParse(buf);
  } catch (e: any) {
    console.log('Error caught:', e.message);
  } finally {
    fs.writeFileSync(workerPath, orig, 'utf8');
  }
}

run();
