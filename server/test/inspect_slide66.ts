import { vectorStore } from '../src/vectorStore/memoryVectorStore.js';

const chunks = vectorStore.getChunksForDocument('guest_user', 'DOC_M2');
console.log('Total chunks for DOC_M2:', chunks.length);
const slide66 = chunks.find(c => c.slideNumber === 66);
if (slide66) {
  console.log('Slide 66 text:\n', slide66.text);
} else {
  console.log('Slide 66 not found');
}
