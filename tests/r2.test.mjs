import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, stat, rm, writeFile, symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {r2Configuration} from '../scripts/backups/r2.mjs';

const env = {
  CER_R2_ACCOUNT_ID: 'a'.repeat(32), CER_R2_BUCKET: 'cer-backups',
  CER_R2_ACCESS_KEY_ID: 'b'.repeat(32), CER_R2_SECRET_ACCESS_KEY: 'c'.repeat(64),
};
test('R2 usa HTTPS, región auto y permite tokens limitados al bucket', () => {
  const {remote, config} = r2Configuration(env);
  assert.equal(remote, 'cer-r2:cer-backups/Backups-CER');
  assert.match(config, /endpoint = https:\/\/a{32}\.r2\.cloudflarestorage\.com/);
  assert.match(config, /no_check_bucket = true/);
  assert.match(config, /region = auto/);
  assert.match(config, /env_auth = false/);
  for (const jurisdiction of ['eu', 'fedramp']) {
    assert.ok(r2Configuration({...env, CER_R2_JURISDICTION: jurisdiction}).config.includes(`.${jurisdiction}.r2.cloudflarestorage.com`));
  }
});
test('rechaza configuración incompleta, inyección INI, rutas ambiguas y destino Drive heredado', () => {
  for (const key of Object.keys(env)) assert.throws(() => r2Configuration({...env, [key]: ''}));
  for (const change of [
    {CER_R2_ACCOUNT_ID: 'https://otro'}, {CER_R2_BUCKET: '../otro'},
    {CER_R2_PREFIX: ''}, {CER_R2_PREFIX: '../otro'}, {CER_R2_PREFIX: '/otro'},
    {CER_R2_PREFIX: 'a//b'}, {CER_R2_PREFIX: 'a\n[otro]'},
    {CER_R2_SECRET_ACCESS_KEY: `${env.CER_R2_SECRET_ACCESS_KEY}\nendpoint = otro`},
    {CER_R2_JURISDICTION: 'otro'}, {CER_BACKUP_REMOTE: 'cer:Backups CER'},
  ]) {
    assert.throws(() => r2Configuration({...env, ...change}));
  }
  assert.doesNotThrow(() => r2Configuration({...env, CER_BACKUP_REMOTE: 'cer-r2:cer-backups/Backups-CER'}));
});
test('las fotos requieren un origen S3 separado que no puede sobrescribir el destino R2', () => {
  const storage = {...env, CER_STORAGE_REMOTE: 'cer-source:cer-evidence', RCLONE_CONFIG_STORAGE: '[cer-source]\ntype = s3\nprovider = Other\n'};
  assert.match(r2Configuration(storage, {storage: true}).config, /^\[cer-source\]/);
  for (const change of [
    {CER_STORAGE_REMOTE: 'cer-r2:cer-backups'}, {RCLONE_CONFIG_STORAGE: ''},
    {RCLONE_CONFIG_STORAGE: '[cer-source]\ntype = drive\n'},
    {RCLONE_CONFIG_STORAGE: `${storage.RCLONE_CONFIG_STORAGE}\n[cer-r2]\ntype = drive\n`},
  ]) assert.throws(() => r2Configuration({...storage, ...change}, {storage: true}));
});
test('el CLI crea configuración privada sin exponer claves y no sobrescribe archivos ni enlaces', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'cer-r2-test-'));
  try {
    const config = join(dir, 'rclone.conf'), output = join(dir, 'github-env');
    const args = [resolve('scripts/backups/configure-r2.mjs')];
    const options = {env: {...env, RCLONE_CONFIG: config, GITHUB_ENV: output}, encoding: 'utf8'};
    const result = spawnSync(process.execPath, args, options);
    assert.equal(result.status, 0, result.stderr);
    for (const secret of [env.CER_R2_ACCESS_KEY_ID, env.CER_R2_SECRET_ACCESS_KEY]) {
      assert.ok(!(result.stdout + result.stderr).includes(secret));
      assert.ok((await readFile(config, 'utf8')).includes(secret));
      assert.ok(!(await readFile(output, 'utf8')).includes(secret));
    }
    assert.equal((await stat(config)).mode & 0o777, 0o600);
    assert.equal(await readFile(output, 'utf8'), 'CER_BACKUP_REMOTE=cer-r2:cer-backups/Backups-CER\n');
    assert.equal(spawnSync(process.execPath, args, options).status, 1);
    const protectedFile = join(dir, 'protected'), link = join(dir, 'link.conf');
    await writeFile(protectedFile, 'conservar');
    await symlink(protectedFile, link);
    assert.equal(spawnSync(process.execPath, args, {...options, env: {...options.env, RCLONE_CONFIG: link}}).status, 1);
    assert.equal(await readFile(protectedFile, 'utf8'), 'conservar');
    const invalidPath = join(dir, 'invalid.conf');
    const invalid = spawnSync(process.execPath, args, {...options, env: {...options.env, RCLONE_CONFIG: invalidPath, CER_R2_ACCOUNT_ID: 'mal'}});
    assert.equal(invalid.status, 1);
    await assert.rejects(stat(invalidPath));
  } finally {
    await rm(dir, {recursive: true, force: true});
  }
});
