import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, stat, rm, writeFile, symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {driveConfiguration, assertDriveQuota} from '../scripts/backups/drive.mjs';

const token = {access_token: 'private-access', refresh_token: 'private-refresh', token_type: 'Bearer'};
const raw = `[cer-drive]\ntype = drive\nscope = drive.file\nclient_id = cer-test.apps.googleusercontent.com\nclient_secret = private-client-secret\ntoken = ${JSON.stringify(token)}\n`;
test('Drive limita el remote a archivos de la aplicación y conserva el refresh token', () => {
  const {remote, config} = driveConfiguration({RCLONE_CONFIG_DRIVE: raw});
  assert.equal(remote, 'cer-drive:Backups CER');
  assert.match(config, /scope = drive.file/);
  assert.match(config, /private-refresh/);
  assert.doesNotThrow(() => driveConfiguration({RCLONE_CONFIG_DRIVE: raw.replaceAll('\n', '\r\n')}));
});
test('rechaza permisos amplios, tokens incompletos, opciones peligrosas y destinos distintos', () => {
  for (const value of ['', raw.replace('drive.file', 'drive'), raw.replace('drive.file', 'drive.readonly'),
    raw.replace('cer-drive', 'otro'), raw.replace(JSON.stringify(token), '{}'),
    raw.replace(JSON.stringify(token), 'mal-json'), `${raw}scope = drive.file\n`,
    `${raw}[otro]\ntype = s3\n`, `${raw}token_url = https://otro\n`,
    `${raw}client_id = example\n`, raw.replace('private-refresh', ' '),
    raw.replace('client_id = cer-test.apps.googleusercontent.com\n', ''),
    raw.replace('cer-test.apps.googleusercontent.com', '202264815644.apps.googleusercontent.com'),
  ]) assert.throws(() => driveConfiguration({RCLONE_CONFIG_DRIVE: value}));
  assert.throws(() => driveConfiguration({RCLONE_CONFIG_DRIVE: raw, CER_BACKUP_REMOTE: 'cer-r2:bucket/Backups-CER'}));
});
test('Storage exige fuente independiente y no permite reemplazar el remote Drive', () => {
  const env = {RCLONE_CONFIG_DRIVE: raw, CER_STORAGE_REMOTE: 'cer-source:cer-evidence', RCLONE_CONFIG_STORAGE: '[cer-source]\ntype = s3\n'};
  assert.match(driveConfiguration(env, {storage: true}).config, /\[cer-source\]/);
  assert.throws(() => driveConfiguration({...env, RCLONE_CONFIG_STORAGE: `${env.RCLONE_CONFIG_STORAGE}[cer-drive]\ntype = drive\n`}, {storage: true}));
  assert.throws(() => driveConfiguration({...env, CER_STORAGE_REMOTE: 'cer-drive:Backups CER'}, {storage: true}));
});
test('espacio: avisa al 85%, suma otros servicios y no duplica la papelera', () => {
  assert.equal(assertDriveQuota({total: 1000, used: 800, trashed: 100, other: 40}), 84);
  assert.equal(assertDriveQuota({total: 1000, used: 0}), 0);
  assert.throws(() => assertDriveQuota({total: 1000, used: 800, other: 50}));
  assert.throws(() => assertDriveQuota({total: 1000, used: 1100}));
  for (const quota of [null, {}, {total: 0, used: 0}, {total: 100, used: -1}, {total: 100, used: 1, other: -1}, {total: '100', used: 1}]) assert.throws(() => assertDriveQuota(quota));
});
test('CLI crea archivo 0600, exporta solo ruta pública y protege archivos y enlaces existentes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'cer-drive-test-'));
  try {
    const config = join(dir, 'rclone.conf'), output = join(dir, 'github-env');
    const args = [resolve('scripts/backups/configure-drive.mjs')];
    const options = {env: {RCLONE_CONFIG_DRIVE: raw, RCLONE_CONFIG: config, GITHUB_ENV: output}, encoding: 'utf8'};
    const result = spawnSync(process.execPath, args, options);
    assert.equal(result.status, 0, result.stderr);
    assert.equal((await stat(config)).mode & 0o777, 0o600);
    assert.equal(await readFile(output, 'utf8'), 'CER_BACKUP_REMOTE=cer-drive:Backups CER\n');
    assert.ok(!(result.stdout + result.stderr + await readFile(output, 'utf8')).includes('private-'));
    assert.match(await readFile(config, 'utf8'), /private-refresh/);
    assert.equal(spawnSync(process.execPath, args, options).status, 1);
    const protectedFile = join(dir, 'protected'), link = join(dir, 'link');
    await writeFile(protectedFile, 'conservar'); await symlink(protectedFile, link);
    assert.equal(spawnSync(process.execPath, args, {...options, env: {...options.env, RCLONE_CONFIG: link}}).status, 1);
    assert.equal(await readFile(protectedFile, 'utf8'), 'conservar');
  } finally {await rm(dir, {recursive: true, force: true});}
});
