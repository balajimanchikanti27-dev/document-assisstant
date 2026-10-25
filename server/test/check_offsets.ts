import fs from 'fs';

const data = fs.readFileSync('sample_3page.pdf');

// Let's inspect object 1:
// offset 9
console.log('Bytes at offset 9:', repr(data.slice(9, 9 + 40)));

function repr(buf: Buffer) {
  return buf.toString('latin1');
}

// In make_pdf.py:
// offsets:
// 1: 9
// 2: 58
// 3: 127
// 4: 253
// 5: 379
// 6: 505
// 7: 575
// 8: 711
// 9: 838
for (let i = 1; i <= 9; i++) {
  const m = data.indexOf(`${i} 0 obj`);
  console.log(`Object ${i}: expected index ${m}`);
}
