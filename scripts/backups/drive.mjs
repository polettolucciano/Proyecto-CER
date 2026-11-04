// Solo servidor/runner. Los tokens OAuth nunca se envían a la aplicación web.
export function driveConfiguration(env, {storage = false} = {}) {
  const raw = env.RCLONE_CONFIG_DRIVE;
  if (!raw || raw.includes('\0')) throw new Error('Falta RCLONE_CONFIG_DRIVE.');
  const values = {};
  let section = false;
  const allowed = new Set(['type', 'scope', 'token', 'client_id', 'client_secret']);
  for (const line of raw.split(/\r?\n/).map(line => line.trim())) {
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    if (line === '[cer-drive]' && !section) {section = true; continue;}
    const match = /^([a-z_]+)\s*=\s*(.*)$/.exec(line);
    if (!section || !match || !allowed.has(match[1]) || Object.hasOwn(values, match[1])) {
      throw new Error('RCLONE_CONFIG_DRIVE debe contener solo [cer-drive] y opciones autorizadas.');
    }
    values[match[1]] = match[2];
  }
  if (values.type !== 'drive' || values.scope !== 'drive.file') throw new Error('Google Drive requiere type=drive y scope=drive.file.');
  let token;
  try {token = JSON.parse(values.token);} catch {throw new Error('Token OAuth de Drive inválido.');}
  if (!token || typeof token.refresh_token !== 'string' || !token.refresh_token.trim()) throw new Error('Drive requiere refresh_token para los backups automáticos.');
  if (!values.client_id || !values.client_secret || values.client_id === '202264815644.apps.googleusercontent.com') {
    throw new Error('Configurar client_id y client_secret propios de CER; el cliente compartido de rclone se retira en 2026.');
  }
  const remote = 'cer-drive:Backups CER';
  if (env.CER_BACKUP_REMOTE && env.CER_BACKUP_REMOTE !== remote) throw new Error('CER_BACKUP_REMOTE debe apuntar a cer-drive:Backups CER.');
  // Normalizar opciones impide inyectar otro remote o endpoints alternativos.
  let config = `[cer-drive]\n${Object.entries(values).map(([key, value]) => `${key} = ${value}`).join('\n')}\n`;
  if (storage) {
    const source = env.RCLONE_CONFIG_STORAGE;
    const sections = [...(source ?? '').matchAll(/^\s*\[([^\]\r\n]+)\]/gm)].map(match => match[1]);
    if (!source || source.includes('\0') || env.CER_STORAGE_REMOTE !== 'cer-source:cer-evidence' || sections.length !== 1 || sections[0] !== 'cer-source' || !/^\s*type\s*=\s*s3\s*$/m.test(source)) {
      throw new Error('Configurar únicamente el origen S3 [cer-source] y CER_STORAGE_REMOTE=cer-source:cer-evidence.');
    }
    config += `\n${source}\n`;
  }
  return {remote, config};
}

export function assertDriveQuota(quota) {
  const other = quota?.other ?? 0;
  if (!quota || !Number.isSafeInteger(quota.total) || quota.total <= 0 || !Number.isSafeInteger(quota.used) || quota.used < 0 || !Number.isSafeInteger(other) || other < 0 || !Number.isSafeInteger(quota.used + other)) {
    throw new Error('No se pudo comprobar el espacio de Google Drive.');
  }
  // Used ya incluye papelera; Other incluye Gmail/Fotos. No contar Trash dos veces.
  const used = quota.used + other;
  const percent = Math.ceil(100 * used / quota.total);
  if (used / quota.total >= 0.85) throw new Error(`Google Drive está al ${percent}% de capacidad. Revisar espacio sin contratar un plan automáticamente.`);
  return percent;
}
