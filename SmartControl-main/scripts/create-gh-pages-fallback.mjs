import { copyFile, access } from 'node:fs/promises';
import path from 'node:path';

const distDir = path.resolve('dist');
const indexPath = path.join(distDir, 'index.html');
const fallbackPath = path.join(distDir, '404.html');

await access(indexPath);
await copyFile(indexPath, fallbackPath);
console.log('GitHub Pages SPA fallback criado em dist/404.html');
