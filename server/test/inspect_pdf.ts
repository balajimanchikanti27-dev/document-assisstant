import fs from 'fs';

const data = fs.readFileSync('sample_3page.pdf');
console.log('Total file length:', data.length);

const xrefIdx = data.indexOf('xref');
console.log('xref starts at index:', xrefIdx);
const xrefStr = data.slice(xrefIdx).toString('latin1');
console.log('xref content:\n' + xrefStr);

const lines = xrefStr.split(/\r?\n/);
let currentObj = 0;
for (let i = 2; i < lines.length; i++) {
  const line = lines[i];
  if (line.startsWith('trailer') || !line.trim()) break;
  const parts = line.trim().split(' ');
  const offset = parseInt(parts[0], 10);
  const gen = parseInt(parts[1], 10);
  const type = parts[2];
  currentObj++;
  console.log(`Obj ${currentObj}: offset ${offset}, actual bytes at offset:`, JSON.stringify(data.slice(offset, offset + 25).toString('latin1')));
}
