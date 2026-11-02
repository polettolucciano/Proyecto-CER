import {posix} from 'node:path';

export function validateStorageInventory(expected,actual) {
 if(!Array.isArray(expected) || !Array.isArray(actual))throw new Error('Inventario inválido.');
 const entries=new Map();
 for(const item of expected){
  if(!item || typeof item.path!=='string' || !item.path || item.path.length>1024 || item.path.startsWith('/') || item.path.includes('\\') || /[\x00-\x1f\x7f]/.test(item.path) || posix.normalize(item.path)!==item.path || item.path.split('/').some(part=>!part || part==='..' || part==='.') || entries.has(item.path) || !Number.isSafeInteger(item.size) || item.size<0 || !/^[a-f0-9]{64}$/.test(item.sha256))throw new Error('Inventario inválido.');
  entries.set(item.path,item);
 }
 if(actual.length!==entries.size)throw new Error('Hay archivos ausentes o no declarados en el inventario.');
 for(const item of actual){const expectedItem=entries.get(item.path);if(!expectedItem || expectedItem.sha256!==item.sha256 || expectedItem.size!==item.size)throw new Error('La evidencia no coincide con su inventario.');entries.delete(item.path);}
 if(entries.size)throw new Error('Faltan archivos del inventario.');
}
