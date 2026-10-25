import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dest = join(root, 'assets', 'logo.png');
const webp = join(root, 'public', 'images', 'logo.webp');
const pngPreferred = join(root, 'public', 'images', 'logo.png');
const pngFallback = join(root, 'public', 'logo.png');
const ICON_SIZE = 1024;
const ICON_BG = { r: 241, g: 245, b: 249, alpha: 1 }; // #f1f5f9

mkdirSync(join(root, 'assets'), { recursive: true });

async function writeSquarePng(sourcePath) {
  const fitted = await sharp(sourcePath)
    .resize(Math.round(ICON_SIZE * 0.82), Math.round(ICON_SIZE * 0.82), {
      fit: 'inside',
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: ICON_SIZE,
      height: ICON_SIZE,
      channels: 4,
      background: ICON_BG,
    },
  })
    .composite([{ input: fitted, gravity: 'centre' }])
    .png()
    .toFile(dest);

  console.log(`Wrote ${relative(root, sourcePath)} → assets/logo.png (${ICON_SIZE}×${ICON_SIZE})`);
}

if (existsSync(webp)) {
  await writeSquarePng(webp);
} else if (existsSync(pngPreferred)) {
  await writeSquarePng(pngPreferred);
} else if (existsSync(pngFallback)) {
  copyFileSync(pngFallback, dest);
  console.log(`Copied ${relative(root, pngFallback)} → assets/logo.png`);
} else if (existsSync(dest)) {
  console.log('Using existing assets/logo.png');
} else {
  throw new Error(
    'No app logo found. Add public/images/logo.webp (or logo.png)'
  );
}
