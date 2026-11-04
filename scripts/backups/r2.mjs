// Configuración exclusivamente del servidor/runner; nunca importar desde src/.
export function r2Configuration(env, {storage = false} = {}) {
  const need = name => {
    const value = env[name];
    if (!value || /[\r\n\0]/.test(value) || value !== value.trim()) {
      throw new Error(`Falta o es inválida ${name}.`);
    }
    return value;
  };
  const account = need('CER_R2_ACCOUNT_ID');
  const bucket = need('CER_R2_BUCKET');
  const access = need('CER_R2_ACCESS_KEY_ID');
  const secret = need('CER_R2_SECRET_ACCESS_KEY');
  const prefix = env.CER_R2_PREFIX ?? 'Backups-CER';
  const jurisdiction = env.CER_R2_JURISDICTION || 'default';
  if (!/^[a-f0-9]{32}$/.test(account)) throw new Error('CER_R2_ACCOUNT_ID inválido.');
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)) throw new Error('CER_R2_BUCKET inválido.');
  if (!/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(prefix)) throw new Error('CER_R2_PREFIX inválido.');
  if (!['default', 'eu', 'fedramp'].includes(jurisdiction)) throw new Error('CER_R2_JURISDICTION inválida.');
  if (!/^[a-f0-9]{32}$/.test(access) || !/^[a-f0-9]{64}$/.test(secret)) throw new Error('Credenciales S3 de R2 inválidas.');
  const endpoint = `https://${account}${jurisdiction === 'default' ? '' : `.${jurisdiction}`}.r2.cloudflarestorage.com`;
  const remote = `cer-r2:${bucket}/${prefix}`;
  // Evita que una variable heredada siga enviando respaldos al destino anterior.
  if (env.CER_BACKUP_REMOTE && env.CER_BACKUP_REMOTE !== remote) throw new Error('CER_BACKUP_REMOTE no coincide con Cloudflare R2. Quitá la variable anterior.');
  let source = '';
  if (storage) {
    source = env.RCLONE_CONFIG_STORAGE;
    if (!source || source.includes('\0') || env.CER_STORAGE_REMOTE !== 'cer-source:cer-evidence') {
      throw new Error('Configurar RCLONE_CONFIG_STORAGE y CER_STORAGE_REMOTE=cer-source:cer-evidence.');
    }
    const sections = [...source.matchAll(/^\s*\[([^\]\r\n]+)\]/gm)].map(match => match[1]);
    if (sections.length !== 1 || sections[0] !== 'cer-source' || !/^\s*type\s*=\s*s3\s*$/m.test(source)) {
      throw new Error('RCLONE_CONFIG_STORAGE debe contener únicamente el remote S3 [cer-source].');
    }
  }
  const config = `[cer-r2]\ntype = s3\nprovider = Cloudflare\nenv_auth = false\naccess_key_id = ${access}\nsecret_access_key = ${secret}\nendpoint = ${endpoint}\nregion = auto\nacl = private\nno_check_bucket = true\n`;
  return {remote, config: source ? `${source}\n${config}` : config};
}
