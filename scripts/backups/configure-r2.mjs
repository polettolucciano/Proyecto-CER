import {writeFile, appendFile} from 'node:fs/promises';
import {r2Configuration} from './r2.mjs';

try {
  const storage = process.argv[2] === '--storage';
  const {config, remote} = r2Configuration(process.env, {storage});
  if (!process.env.RCLONE_CONFIG) throw new Error('Falta RCLONE_CONFIG (ruta temporal privada).');
  // wx impide sobrescribir archivos existentes o seguir enlaces simbólicos.
  await writeFile(process.env.RCLONE_CONFIG, config, {mode: 0o600, flag: 'wx'});
  if (process.env.GITHUB_ENV) await appendFile(process.env.GITHUB_ENV, `CER_BACKUP_REMOTE=${remote}\n`);
  console.log('Configuración privada de Cloudflare R2 preparada.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
