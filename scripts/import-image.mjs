// Usage: node scripts/import-image.mjs <src> <dest.webp> [--max 2400]
// The only way images enter src/assets: it refuses sources the media rules forbid, and it keeps the
// repo small (sources are 5-6 MB PNGs) by resizing and re-encoding before anything is committed.
import { mkdirSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
import sharp from 'sharp';
import { isForbiddenSource } from './media-rules.mjs';

const [src, dest, ...rest] = process.argv.slice(2);
const maxFlag = rest.indexOf('--max');
const max = maxFlag >= 0 ? Number(rest[maxFlag + 1]) : 2400;

if (!src || !dest || !dest.endsWith('.webp') || !Number.isInteger(max) || max <= 0) {
  console.error('usage: node scripts/import-image.mjs <src> <dest.webp> [--max 2400]');
  process.exit(2);
}

const refused = isForbiddenSource(src);
if (refused) {
  console.error(`refused ${src}: ${refused}`);
  process.exit(1);
}

mkdirSync(dirname(dest), { recursive: true });
const info = await sharp(src).resize({ width: max, withoutEnlargement: true }).webp({ quality: 86 }).toFile(dest);
console.log(`${src} -> ${dest}: ${statSync(src).size} B -> ${info.size} B (${info.width}x${info.height})`);
