export class HttpInputError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

// Count actual bytes even when Content-Length is absent or false. Reject before
// allocating/parsing an unbounded request, and cancel the remaining stream.
export async function readBoundedJson(request: Request, limit = 20000): Promise<unknown> {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new HttpInputError(415,'Usá una solicitud JSON.');
  const declared=request.headers.get('content-length');
  if (declared && (!/^\d+$/.test(declared) || !Number.isSafeInteger(Number(declared)))) throw new HttpInputError(400,'Longitud de solicitud inválida.');
  if (declared && Number(declared)>limit) { await request.body?.cancel(); throw new HttpInputError(413,'Solicitud demasiado grande.'); }
  const reader=request.body?.getReader();
  if (!reader) throw new HttpInputError(400,'La solicitud no contiene datos válidos.');
  const chunks: Uint8Array[]=[];
  let size=0;
  try {
    while (true) {
      const {done,value}=await reader.read();if(done)break;
      size+=value.byteLength;
      if(size>limit){await reader.cancel();throw new HttpInputError(413,'Solicitud demasiado grande.');}
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
  catch{throw new HttpInputError(400,'La solicitud no contiene datos válidos.');}
}
