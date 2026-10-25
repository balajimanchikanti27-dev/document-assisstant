import fs from 'fs';
import path from 'path';

const workerPath = path.resolve('node_modules', 'pdf-parse', 'lib', 'pdf.js', 'v1.10.100', 'build', 'pdf.worker.js');
const orig = fs.readFileSync(workerPath, 'utf8');

const needle = "if (obj1 !== num || obj2 !== gen || !(0, _primitives.isCmd)(obj3)) {";
const replacement = `
console.log("STREAM DETAILS:", {
  bytesOffset: this.stream.bytes ? this.stream.bytes.byteOffset : undefined,
  bytesLength: this.stream.bytes ? this.stream.bytes.byteLength : undefined,
  streamStart: this.stream.start,
  streamLength: this.stream.length,
  subStreamStart: stream.start,
  subStreamLength: stream.length,
  subStreamPos: stream.pos,
  subStreamBytes: stream.bytes ? stream.bytes.byteOffset : undefined,
  peek20: stream.peekBytes(20) ? Buffer.from(stream.peekBytes(20)).toString('latin1') : ''
});
${needle}`;

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
