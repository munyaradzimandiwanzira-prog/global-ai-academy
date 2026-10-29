/**
 * Responsive, metadata-free AVIF + WebP versions of the site photographs (design/photos → public/images).
 * Every output width is ≤ the source width, so nothing is ever upscaled (no pixelation); the <Photo>
 * component serves the smallest file that covers the slot on the visitor's screen.
 * Run: node scripts/build-images.mjs
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const SRC = 'design/photos';
const OUT = 'public/images';
mkdirSync(OUT, { recursive: true });

// name, source, widths, optional crop {left, top, width, height}
const PHOTOS = [
  ['victoria-falls', 'victoria-falls.jpg', [960, 1440, 1920]],
  ['great-zimbabwe-aerial', 'great-zimbabwe-aerial.webp', [600, 900, 1200]],
  // Portrait crop centred on the conical tower, for the tall sign-in panel.
  ['great-zimbabwe-tower', 'great-zimbabwe-tower.jpg', [450, 900], { left: 200, top: 0, width: 900, height: 1080 }],
  ['zimbabwe-bird', 'zimbabwe-bird.jpg', [248, 495]],
  ['classroom', 'classroom.jpg', [360, 715]],
  ['kids-zone', 'kids-zone.webp', [300, 600]],
];

for (const [name, file, widths, crop] of PHOTOS) {
  for (const w of widths) {
    const base = () => {
      let img = sharp(`${SRC}/${file}`).rotate(); // honour EXIF orientation, then all metadata is dropped
      if (crop) img = img.extract(crop);
      return img.resize({ width: w, withoutEnlargement: true });
    };
    await base().avif({ quality: 52, effort: 6 }).toFile(`${OUT}/${name}-${w}.avif`);
    await base().webp({ quality: 74, effort: 6 }).toFile(`${OUT}/${name}-${w}.webp`);
  }
  console.log(name, widths.join(', '));
}
