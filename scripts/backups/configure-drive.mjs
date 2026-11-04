import {writeFile, appendFile} from 'node:fs/promises';
import {driveConfiguration} from './drive.mjs';

try {
  if (process.argv.slice(2).some(arg => arg !== '--storage')) throw new Error('Opción desconocida.');
  const {config, remote} = driveConfiguration(process.env, {storage: process.argv.includes('--storage')});
  if (!process.env.RCLONE_CONFIG) throw new Error('Falta RCLONE_CONFIG (ruta temporal privada).');
  await writeFile(process.env.RCLONE_CONFIG, config, {mode: 0o600, flag: 'wx'});
  if (process.env.GITHUB_ENV) await appendFile(process.env.GITHUB_ENV, `CER_BACKUP_REMOTE=${remote}\n`);
  console.log('Configuración privada de Google Drive preparada.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
