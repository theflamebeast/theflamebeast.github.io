// A lowercase Windows drive letter in the cwd (VS Code terminals often start in `c:\`) makes Vite
// load vitest's runner as two module instances, and every describe() then throws reading `config`.
// Upper-case it, then start vitest's CLI from that path; it reads its arguments from process.argv.
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

process.chdir(process.cwd().replace(/^[a-z]:/, (drive) => drive.toUpperCase()));
await import(pathToFileURL(join(process.cwd(), 'node_modules', 'vitest', 'vitest.mjs')).href);
