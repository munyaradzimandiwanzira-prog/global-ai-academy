import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

/**
 * Site photographs (built by scripts/build-images.mjs). Each is exported only at widths up to its
 * original size, and `sizes` tells the browser how wide the slot is, so it downloads the smallest
 * file that stays sharp — never an upscaled, pixelated one.
 */
export const PHOTOS = {
  'victoria-falls': { widths: [960, 1440, 1920], w: 1920, h: 1080, alt: 'Victoria Falls from the air: the Zambezi pours into the gorge under a rainbow, with the Victoria Falls Bridge beyond.' },
  'great-zimbabwe-aerial': { widths: [600, 900, 1200], w: 1200, h: 900, alt: 'The Great Enclosure at Great Zimbabwe seen from the hill: a ring of dry-stone wall in green grassland.' },
  'great-zimbabwe-tower': { widths: [450, 900], w: 900, h: 1080, alt: 'The conical tower inside the Great Enclosure, Great Zimbabwe, built of granite blocks without mortar.' },
  'zimbabwe-bird': { widths: [248, 495], w: 495, h: 619, alt: 'A soapstone Zimbabwe Bird carving from Great Zimbabwe, perched on a pillar decorated with chevrons.' },
  classroom: { widths: [360, 715], w: 715, h: 429, alt: 'Secondary school learners in maroon uniforms working at their desks; one smiles at the camera.' },
  'kids-zone': { widths: [300, 600], w: 600, h: 800, alt: 'Primary school children in blue hats and jerseys laughing together on their way to school.' },
} as const;

export type PhotoName = keyof typeof PHOTOS;

interface PhotoProps {
  name: PhotoName;
  /** CSS `sizes` for the slot, e.g. "(min-width: 1024px) 50vw, 100vw". */
  sizes: string;
  className?: string;
  imgClassName?: string;
  style?: CSSProperties;
  /** Decorative background plates pass alt="" so screen readers skip them. */
  alt?: string;
  /** The hero image loads first; everything else waits until it's near the screen. */
  priority?: boolean;
}

export function Photo({ name, sizes, className, imgClassName, style, alt, priority }: PhotoProps) {
  const p = PHOTOS[name];
  const set = (ext: 'avif' | 'webp') => p.widths.map((w) => `/images/${name}-${w}.${ext} ${w}w`).join(', ');
  return (
    <picture className={className} style={style}>
      <source type="image/avif" srcSet={set('avif')} sizes={sizes} />
      <img
        src={`/images/${name}-${p.widths[p.widths.length - 1]}.webp`}
        srcSet={set('webp')}
        sizes={sizes}
        width={p.w}
        height={p.h}
        alt={alt ?? p.alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        {...(priority ? { fetchpriority: 'high' } : {})}
        className={cn('h-full w-full object-cover', imgClassName)}
      />
    </picture>
  );
}
