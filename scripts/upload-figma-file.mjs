// Uploads the BANNER 70 .fig file to a private Vercel Blob store.
// Usage: BLOB_READ_WRITE_TOKEN=... npm run upload-figma -- './BANNER 70.fig'
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { put } from '@vercel/blob';

const filePath = process.argv[2];
const pathname = process.env.FIGMA_FILE_PATHNAME || 'BANNER 70.fig';

if (!filePath) {
  console.error('Usage: npm run upload-figma -- <path-to-.fig-file>');
  process.exit(1);
}
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('BLOB_READ_WRITE_TOKEN is not set. Run `vercel env pull .env.local` and load it, or export the token.');
  process.exit(1);
}

const { size } = await stat(filePath);
console.log(`Uploading ${filePath} (${(size / 1024 / 1024).toFixed(1)} MB) to private blob "${pathname}"...`);
const result = await put(pathname, createReadStream(filePath), {
  access: 'private',
  multipart: true,
  addRandomSuffix: false,
  allowOverwrite: true,
  contentType: 'application/octet-stream'
});
console.log(`Uploaded: ${result.pathname}`);
