import fs from 'node:fs';

const files = [
  'assets/maps/star-country-farthest-sky-background.webp',
  'assets/maps/star-country-world-clouds.webp',
  'assets/maps/star-country-gate-garden-star-sky.webp',
];

for (const file of files) {
  const bytes = fs.readFileSync(file);
  if (bytes.length < 20) throw new Error(`WebP is too short: ${file}`);
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error(`Invalid WebP RIFF header: ${file}`);
  }
  const riffLength = bytes.readUInt32LE(4) + 8;
  if (riffLength !== bytes.length) {
    throw new Error(`WebP RIFF length mismatch ${riffLength} != ${bytes.length}: ${file}`);
  }
  const chunkLength = bytes.readUInt32LE(16);
  const expectedSingleChunkLength = 20 + chunkLength + (chunkLength & 1);
  const chunkType = bytes.toString('ascii', 12, 16);
  if ((chunkType === 'VP8 ' || chunkType === 'VP8L') && expectedSingleChunkLength !== bytes.length) {
    throw new Error(`WebP chunk length mismatch ${expectedSingleChunkLength} != ${bytes.length}: ${file}`);
  }
  console.log(`${file}: ${bytes.length} bytes, ${chunkType.trim()} OK`);
}
