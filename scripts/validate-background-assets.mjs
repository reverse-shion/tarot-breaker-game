import fs from 'node:fs';

const files = new Map([
  ['assets/maps/star-country-farthest-sky-background.webp', null],
  ['assets/maps/star-country-world-clouds.webp', null],
  ['assets/maps/star-country-gate-garden-star-sky.webp', null],
  ['assets/maps/star-country-world-islands.webp', { width: 1469, height: 1071 }],
  ['assets/maps/star-country-gate-garden-foreground.webp', { width: 1672, height: 941 }],
]);

for (const [file, expectedSize] of files) {
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
  if (expectedSize) {
    if (chunkType !== 'VP8L' || bytes[20] !== 0x2f) {
      throw new Error(`Expected a lossless WebP image with readable dimensions: ${file}`);
    }
    const sizeBits = bytes.readUInt32LE(21);
    const width = (sizeBits & 0x3fff) + 1;
    const height = ((sizeBits >>> 14) & 0x3fff) + 1;
    if (width !== expectedSize.width || height !== expectedSize.height) {
      throw new Error(
        `Unexpected artwork size ${width}x${height}; expected ${expectedSize.width}x${expectedSize.height}: ${file}`,
      );
    }
  }
  console.log(`${file}: ${bytes.length} bytes, ${chunkType.trim()} OK`);
}
