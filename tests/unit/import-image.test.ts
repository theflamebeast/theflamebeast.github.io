import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterAll, describe, expect, it } from 'vitest';

const dir = mkdtempSync(join(tmpdir(), 'import-image-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function run(...args: string[]) {
  try {
    return { code: 0, out: execFileSync('node', ['scripts/import-image.mjs', ...args], { encoding: 'utf8', stdio: 'pipe' }) };
  } catch (e) {
    const err = e as { status: number; stderr: string };
    return { code: err.status, out: err.stderr };
  }
}

describe('import-image', () => {
  it('refuses a forbidden source and writes nothing', async () => {
    const src = join(dir, 'Whisk', 'ai.png');
    mkdirSync(join(dir, 'Whisk'));
    await sharp({ create: { width: 10, height: 10, channels: 3, background: '#f00' } }).png().toFile(src);
    const dest = join(dir, 'out-refused.webp');
    const r = run(src, dest);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/Whisk/);
    expect(existsSync(dest)).toBe(false);
  });

  it('writes a webp no wider than --max from an allowed source', async () => {
    const src = join(dir, 'wide.png');
    await sharp({ create: { width: 3000, height: 1000, channels: 3, background: '#0af' } }).png().toFile(src);
    const dest = join(dir, 'out.webp');
    const r = run(src, dest, '--max', '1200');
    expect(r.code).toBe(0);
    const meta = await sharp(readFileSync(dest)).metadata();
    expect(meta).toMatchObject({ format: 'webp', width: 1200, height: 400 });
  });

  it('never upscales a source narrower than --max', async () => {
    const src = join(dir, 'small.png');
    await sharp({ create: { width: 800, height: 500, channels: 3, background: '#0af' } }).png().toFile(src);
    const dest = join(dir, 'small.webp');
    expect(run(src, dest).code).toBe(0);
    expect((await sharp(readFileSync(dest)).metadata()).width).toBe(800);
  });
});
