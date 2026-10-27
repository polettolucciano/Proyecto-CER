import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const bytes=await readFile(new URL(import.meta.resolve('@imagemagick/magick-wasm/magick.wasm')));
const expected='54629cbcf06dd10db38b4d87fa6ab241b248c09c94f2d9689506e5f994ac5f0c';
if(createHash('sha256').update(bytes).digest('hex')!==expected)throw new Error('El motor de imágenes no coincide con la versión verificada.');
const directory=new URL('../supabase/functions/cer-evidence/wasm/',import.meta.url);
await mkdir(directory,{recursive:true});await writeFile(new URL('magick.wasm',directory),bytes);
console.log('Motor WASM verificado y preparado para empaquetado Docker.');
