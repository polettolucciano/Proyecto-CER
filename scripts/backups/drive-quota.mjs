import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {assertDriveQuota} from './drive.mjs';

try {
  let output;
  try {
    output = await promisify(execFile)('rclone', ['about', 'cer-drive:', '--json'], {timeout: 60000, maxBuffer: 1024 * 1024});
  } catch {throw new Error('No se pudo consultar el espacio disponible de Google Drive.');}
  let quota;
  try {quota = JSON.parse(output.stdout);} catch {throw new Error('Respuesta de espacio de Google Drive inválida.');}
  console.log(`Google Drive: ${assertDriveQuota(quota)}% utilizado.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
