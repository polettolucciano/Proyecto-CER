import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ImageMagick, MagickColors, MagickFormat, MagickImageInfo, Orientation } from '@imagemagick/magick-wasm';
import { initializeImageEngine, optimizeImage, MAX_INPUT_BYTES } from '../supabase/functions/_shared/imageOptimization';

beforeAll(async () => initializeImageEngine(readFileSync(new URL(import.meta.resolve('@imagemagick/magick-wasm/magick.wasm')))));
const sample = (width:number,height:number,format=MagickFormat.Jpeg) => ImageMagick.read(MagickColors.SteelBlue,width,height,image => image.write(format,data=>Uint8Array.from(data)));

describe('optimización de evidencia en backend', () => {
  it('reduce una foto grande y conserva proporciones en WebP', () => {
    const source=sample(3200,2400);
    const result=optimizeImage(source,'image/jpeg');
    expect(result.width).toBe(2048);expect(result.height).toBe(1536);
    expect(result.storedBytes).toBeLessThan(source.length);
    expect(MagickImageInfo.create(result.bytes).format).toBe(MagickFormat.WebP);
    console.info('Compresión de fixture:',{original:source.length,optimizada:result.storedBytes});
  });
  it('no agranda imágenes pequeñas ni conserva perfiles EXIF', () => {
    const source=ImageMagick.read(MagickColors.White,400,200,image=>{
      image.setProfile('exif',new Uint8Array([69,120,105,102,0,0,73,73,42,0,8,0,0,0,0,0,0,0,0,0]));
      return image.write(MagickFormat.Jpeg,data=>Uint8Array.from(data));
    });
    const result=optimizeImage(source,'image/jpeg');
    expect([result.width,result.height]).toEqual([400,200]);
    ImageMagick.read(result.bytes,image=>expect(image.profileNames).not.toContain('exif'));
  });
  it('rechaza contenido falso, tipos no permitidos y archivos grandes', () => {
    expect(()=>optimizeImage(new TextEncoder().encode('<svg/>'),'image/jpeg')).toThrow('INVALID_IMAGE_CONTENT');
    expect(()=>optimizeImage(sample(20,20),'image/png')).toThrow('INVALID_IMAGE_CONTENT');
    expect(()=>optimizeImage(sample(20,20),'image/svg+xml')).toThrow('INVALID_IMAGE_TYPE');
    expect(()=>optimizeImage(new Uint8Array(MAX_INPUT_BYTES+1),'image/jpeg')).toThrow('INVALID_IMAGE_SIZE');
  });
  it('conserva orientación visual y elimina etiquetas al reencodificar', () => {
    const source=ImageMagick.read(MagickColors.White,400,200,image=>{
      image.setProfile('exif',new Uint8Array([69,120,105,102,0,0,73,73,42,0,8,0,0,0,1,0,18,1,3,0,1,0,0,0,6,0,0,0,0,0,0,0]));
      image.orientation=Orientation.RightTop;
      return image.write(MagickFormat.Jpeg,data=>Uint8Array.from(data));
    });
    const result=optimizeImage(source,'image/jpeg');
    expect([result.width,result.height]).toEqual([200,400]);
    ImageMagick.read(result.bytes,image=>expect(image.profileNames).not.toContain('exif'));
  });
});
