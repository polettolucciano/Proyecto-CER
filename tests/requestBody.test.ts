import {describe,it,expect} from 'vitest';
import {readBoundedJson} from '../supabase/functions/_shared/requestBody';

describe('límites de entrada del backend',()=>{
 it('acepta JSON UTF-8 y rechaza JSON o codificación inválida',async()=>{
  expect(await readBoundedJson(new Request('https://example.test',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"nombre":"Enfermería"}'}))).toEqual({nombre:'Enfermería'});
  for(const body of ['{',new Uint8Array([255])])await expect(readBoundedJson(new Request('https://example.test',{method:'POST',headers:{'Content-Type':'application/json'},body}))).rejects.toMatchObject({status:400});
 });
 it('cancela streams con longitud ausente o falsa cuando exceden el límite real',async()=>{
  for(const declared of [undefined,'1']){
   let cancelled=false;
   const body=new ReadableStream({pull(controller){controller.enqueue(new Uint8Array(11));},cancel(){cancelled=true;}});
   const request=new Request('https://example.test',{method:'POST',headers:{'Content-Type':'application/json',...(declared?{'Content-Length':declared}:{})},body,duplex:'half'} as RequestInit);
   await expect(readBoundedJson(request,10)).rejects.toMatchObject({status:413});expect(cancelled).toBe(true);
  }
 });
 it('rechaza Content-Length declarado excesivo o inválido y otros tipos',async()=>{
  for(const length of ['-1','NaN','9007199254740992'])await expect(readBoundedJson(new Request('https://example.test',{method:'POST',headers:{'Content-Type':'application/json','Content-Length':length},body:'{}'}))).rejects.toMatchObject({status:400});
  await expect(readBoundedJson(new Request('https://example.test',{method:'POST',headers:{'Content-Type':'application/json','Content-Length':'100'},body:'{}'}),10)).rejects.toMatchObject({status:413});
  await expect(readBoundedJson(new Request('https://example.test',{method:'POST',body:'{}'}))).rejects.toMatchObject({status:415});
 });
});
