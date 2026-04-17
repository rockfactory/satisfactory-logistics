import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const ROOT = resolve(import.meta.dirname, '..');
const SOURCE = resolve(ROOT, 'public/images/logo/logo-square-big.png');
const OUT_DIR = resolve(ROOT, 'public/icons');

// Maskable icons need ~20% safe-zone padding so the OS mask cannot clip the logo.
// We render the source inside an 80% centered box on a Satisfactory-orange background.
const MASKABLE_SAFE_ZONE = 0.8;
const BRAND_BG = { r: 250, g: 149, b: 73, alpha: 1 }; // #fa9549 (Mantine satisfactory-orange)

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const source = sharp(SOURCE);

  await source
    .clone()
    .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(resolve(OUT_DIR, 'icon-192.png'));

  await source
    .clone()
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(resolve(OUT_DIR, 'icon-512.png'));

  const maskableInner = Math.round(512 * MASKABLE_SAFE_ZONE);
  const innerBuffer = await source
    .clone()
    .resize(maskableInner, maskableInner, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: BRAND_BG,
    },
  })
    .composite([{ input: innerBuffer, gravity: 'center' }])
    .png()
    .toFile(resolve(OUT_DIR, 'icon-512-maskable.png'));

  // Apple touch icon (iOS add-to-homescreen). Opaque background, no safe zone padding.
  await sharp({
    create: {
      width: 180,
      height: 180,
      channels: 4,
      background: BRAND_BG,
    },
  })
    .composite([
      {
        input: await source
          .clone()
          .resize(168, 168, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer(),
        gravity: 'center',
      },
    ])
    .png()
    .toFile(resolve(OUT_DIR, 'apple-touch-icon.png'));

  console.log('PWA icons generated in', OUT_DIR);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
