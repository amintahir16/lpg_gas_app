import { copyFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(root, 'assets'), { recursive: true });
copyFileSync(join(root, 'public', 'images', 'logo.png'), join(root, 'assets', 'logo.png'));
console.log('Copied public/images/logo.png → assets/logo.png');
