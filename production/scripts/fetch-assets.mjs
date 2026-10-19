import { createHash } from 'node:crypto';
import { linkSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const manifest = JSON.parse(readFileSync(resolve(root, 'content/media-assets.json'), 'utf8'));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const downloads = new Map();
for (const asset of manifest.files) {
  const path = resolve(root, asset.path);
  const rel = relative(root, path);
  if (rel.startsWith('..') || isAbsolute(rel) || !asset.path.startsWith('content/') && !asset.path.startsWith('examples/')) throw new Error(`Unsafe asset path: ${asset.path}`);
  try {
    const local = readFileSync(path);
    if (local.length === asset.bytes && digest(local) === asset.sha256) {
      console.log(`cached ${asset.path}`);
      continue;
    }
    // User-edited originals must never be silently replaced.
    throw new Error(`Local asset differs: ${asset.path}; move it aside before restoring the recorded version.`);
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!downloads.has(asset.sha256)) {
    const url = new URL(asset.url);
    if (url.protocol !== 'https:' || url.hostname !== 'github.com' || !url.pathname.startsWith('/eiler2005/Storygro/releases/download/')) throw new Error(`Unapproved asset origin: ${asset.url}`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${asset.path}: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length !== asset.bytes || digest(bytes) !== asset.sha256) throw new Error(`Checksum/size mismatch: ${asset.path}`);
    downloads.set(asset.sha256, bytes);
  }
  const bytes = downloads.get(asset.sha256);
  if (bytes.length !== asset.bytes) throw new Error(`Inconsistent manifest size: ${asset.path}`);
  mkdirSync(dirname(path), { recursive: true });
  const temp = path + `.download-${process.pid}`;
  // Same-directory hard link commits atomically and fails if a file appeared during download.
  try { writeFileSync(temp, bytes, { flag: 'wx' }); linkSync(temp, path); }
  finally { rmSync(temp, { force: true }); }
  console.log(`restored ${asset.path}`);
}
