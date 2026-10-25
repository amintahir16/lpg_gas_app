import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dest = join(root, 'assets', 'logo.png');
const preferred = join(root, 'public', 'images', 'logo.png');
const fallback = join(root, 'public', 'logo.png');

mkdirSync(join(root, 'assets'), { recursive: true });

if (existsSync(preferred)) {
  copyFileSync(preferred, dest);
  console.log(`Copied ${relative(root, preferred)} → assets/logo.png`);
} else if (existsSync(dest)) {
  console.log('Using existing assets/logo.png');
} else if (existsSync(fallback)) {
  copyFileSync(fallback, dest);
  console.log(`Copied ${relative(root, fallback)} → assets/logo.png`);
} else {
  throw new Error(
    'No logo.png found. Add public/logo.png or public/images/logo.png'
  );
}
