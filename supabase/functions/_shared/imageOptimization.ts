import { ImageMagick, initializeImageMagick, MagickFormat, MagickImageInfo, MagickReadSettings, ResourceLimits, FilterType } from '@imagemagick/magick-wasm';

export const MAX_INPUT_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 20_000_000;
export const MAX_IMAGE_EDGE = 2048;
export const WEBP_QUALITY = 82;
export const TRANSFORM_VERSION = 'webp-v1';

export async function initializeImageEngine(wasm: Uint8Array) {
  await initializeImageMagick(wasm);
  ResourceLimits.memory = 128n * 1024n * 1024n;
  ResourceLimits.maxMemoryRequest = 128n * 1024n * 1024n;
  ResourceLimits.disk = 0n;
  ResourceLimits.width = 12000n;
  ResourceLimits.height = 12000n;
  ResourceLimits.listLength = 8n;
  ResourceLimits.maxProfileSize = 1024n * 1024n;
}

export function optimizeImage(bytes: Uint8Array, mime: string) {
  if (!bytes.length || bytes.length > MAX_INPUT_BYTES) throw new Error('INVALID_IMAGE_SIZE');
  const formats: Record<string, MagickFormat> = { 'image/jpeg': MagickFormat.Jpeg, 'image/png': MagickFormat.Png, 'image/webp': MagickFormat.WebP };
  const format = formats[mime];
  if (!format) throw new Error('INVALID_IMAGE_TYPE');
  const signatureMatches = mime === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : mime === 'image/png' ? [137,80,78,71,13,10,26,10].every((value,index) => bytes[index] === value)
    : String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP';
  if (!signatureMatches) throw new Error('INVALID_IMAGE_CONTENT');
  // Se fuerza un decodificador raster permitido, sin interpretar SVG, PDF ni nombres de archivo.
  const info = MagickImageInfo.create(bytes);
  if (info.format !== format) throw new Error('INVALID_IMAGE_CONTENT');
  if (!info.width || !info.height || info.width * info.height > MAX_IMAGE_PIXELS) throw new Error('IMAGE_DIMENSIONS_TOO_LARGE');
  const settings = new MagickReadSettings({ format, frameCount: 1 });
  if (info.width > MAX_IMAGE_EDGE || info.height > MAX_IMAGE_EDGE) settings.setDefine(MagickFormat.Jpeg,'size',MAX_IMAGE_EDGE+'x'+MAX_IMAGE_EDGE);
  return ImageMagick.read(bytes, settings, image => {
    image.autoOrient();
    const ratio = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.width, image.height));
    if (ratio < 1) image.resize(Math.max(1, Math.round(image.width * ratio)), Math.max(1, Math.round(image.height * ratio)), FilterType.Triangle);
    image.strip();
    image.quality = WEBP_QUALITY;
    // Método rápido para respetar el presupuesto de CPU del runtime Edge.
    image.settings.setDefine(MagickFormat.WebP,'method',0);
    const width = image.width, height = image.height;
    return image.write(MagickFormat.WebP, data => {
      const output = Uint8Array.from(data);
      if (!output.length || output.length > MAX_INPUT_BYTES) throw new Error('IMAGE_OUTPUT_TOO_LARGE');
      return { bytes: output, width, height, originalBytes: bytes.length, storedBytes: output.length, mime: 'image/webp', version: TRANSFORM_VERSION };
    });
  });
}
