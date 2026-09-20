import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseJSONStrict, writeJSON } from './evidence.mjs';

const cli = fileURLToPath(new URL('./loopme.mjs', import.meta.url));
const configPath = fileURLToPath(new URL('../config.json', import.meta.url));

test('strict JSON preserves container scopes and rejects escaped duplicate keys', () => {
  const nested = {
    key: 'value with }, [, comma, and "quotes"',
    children: [{ key: 'one' }, { key: 'two', nested: { key: 'three' } }],
    empty: [{}, []],
  };
  assert.deepEqual(parseJSONStrict(JSON.stringify(nested)), nested);
  assert.throws(() => parseJSONStrict('{"outcome":"accepted","\\u006futcome":"rejected"}'));
  assert.throws(() => parseJSONStrict('{"items":[{"x":1,"x":2}]}'));
  assert.throws(() => parseJSONStrict('{"items":[1e400]}'));
  assert.throws(() => parseJSONStrict('{"x":1,}'));
});

async function workspace(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'loopme-script-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const task = path.join(dir, 'task.md');
  await fs.writeFile(task, '# Private test task\n');
  const invoke = (args, status = 0, env = {}) => {
    const result = spawnSync(process.execPath, [cli, ...args], {
      cwd: dir, env: { ...process.env, ...env }, encoding: 'utf8', timeout: 15_000,
    });
    assert.ifError(result.error);
    assert.equal(result.signal, null);
    assert.equal(result.status, status, result.stderr || result.stdout);
    return JSON.parse(result.stdout || result.stderr);
  };
  return { dir, task, invoke };
}

test('run preserves argv, full streams and failure status without overwriting evidence', async t => {
  const { dir, task, invoke } = await workspace(t);
  const input = path.join(dir, 'untracked input.txt');
  await fs.writeFile(input, 'before');
  const args = ['space argument', '中文', '; echo NOT_A_SHELL', ''];
  const command = [process.execPath, '-e',
    'console.log(JSON.stringify({argv:process.argv.slice(1),cwd:process.cwd()})); process.stderr.write("e".repeat(200000)); process.exitCode=23;',
    ...args];
  const options = ['run', '--task', task, '--name', 'capture', '--cwd', dir, '--fingerprint', input, '--'];
  const first = invoke([...options, ...command], 23);
  assert.deepEqual(JSON.parse(await fs.readFile(first.stdout_path, 'utf8')), { argv: args, cwd: dir });
  assert.equal(await fs.readFile(first.stderr_path, 'utf8'), 'e'.repeat(200000));
  const second = invoke([...options, ...command], 23);
  assert.notEqual(first.evidence_dir, second.evidence_dir);
  await assert.rejects(writeJSON(first.metadata_path, { replaced: true }), { code: 'EEXIST' });
  assert.equal(JSON.parse(await fs.readFile(first.metadata_path)).returncode, 23);
  const mutated = invoke([...options, process.execPath, '-e',
    'require("node:fs").writeFileSync(process.argv[1], "after")', input]);
  assert.equal(mutated.inputs_changed, true);
  const missing = invoke([...options, path.join(dir, 'missing-executable')], 125);
  assert.equal(missing.status, 'launch_error');
  invoke(['run', '--task', task, '--name', 'bad\n', '--', ...command], 2);
  if (process.platform !== 'win32') {
    const signaled = invoke([...options, process.execPath, '-e', 'process.kill(process.pid,"SIGTERM")'], 143);
    assert.equal(signaled.signal, 'SIGTERM');
  }
});

test('negative checker evidence requires the intended assertion, not just a failure', async t => {
  const { dir, task, invoke } = await workspace(t);
  const checker = path.join(dir, 'checker.cjs');
  await fs.writeFile(checker, `
const fs = require('node:fs');
const input = process.argv[2];
const fixture = JSON.parse(fs.readFileSync(input, 'utf8'));
if (fixture.mode === 'crash') throw new ReferenceError('failure before the assertion');
if (fixture.mode === 'malformed') { console.log('request contained accepted'); process.exit(1); }
if (fixture.mode === 'duplicate') { console.log('{"outcome":"accepted","outcome":"rejected","assertion":"wrong_id"}'); process.exit(1); }
if (fixture.mode === 'mutate') fs.appendFileSync(input, ' ');
const outcome = fixture.task_id === 'expected' ? {outcome:'accepted'} : {outcome:'rejected', assertion:fixture.mode === 'wrong-reason' ? 'other_error' : 'wrong_id'};
console.log(JSON.stringify(outcome));
process.exitCode = fixture.mode === 'wrong-exit' ? 0 : outcome.outcome === 'accepted' ? 0 : 1;
`);
  const modes = ['good', 'bad', 'crash', 'malformed', 'duplicate', 'mutate', 'wrong-reason', 'wrong-exit'];
  const cases = [];
  for (const mode of modes) {
    const fixture = `${mode}.json`;
    await fs.writeFile(path.join(dir, fixture), JSON.stringify({ task_id: mode === 'good' ? 'expected' : 'wrong', mode }));
    cases.push({ name: mode, fixture, expect: mode === 'good'
      ? { outcome: 'accepted' } : { outcome: 'rejected', assertion: 'wrong_id' } });
  }
  const manifest = path.join(dir, 'cases.json');
  const command = ['check', '--task', task, '--cases', manifest, '--', process.execPath, checker];
  await fs.writeFile(manifest, JSON.stringify({ version: 1, cases: cases.slice(0, 2) }));
  assert.equal(invoke(command).ok, true);
  await fs.writeFile(manifest, JSON.stringify({ version: 1, cases }));
  const result = invoke(command, 1);
  assert.deepEqual(result.cases.map(item => item.passed), [true, true, false, false, false, false, false, false]);
  assert.deepEqual(result.cases.slice(2).map(item => item.failure.category),
    ['malformed_protocol', 'malformed_protocol', 'malformed_protocol', 'invalid_setup', 'wrong_assertion', 'exit_mismatch']);
  assert.equal(JSON.parse(await fs.readFile(result.summary_path)).ok, false);
  // Invalid manifests must not launch even a side-effectful checker.
  const marker = path.join(dir, 'should-not-exist');
  await fs.writeFile(manifest, JSON.stringify({ version: 1, cases: [cases[0]] }));
  invoke(['check', '--task', task, '--cases', manifest, '--', process.execPath, '-e',
    `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'ran')`], 2);
  await assert.rejects(fs.stat(marker), { code: 'ENOENT' });
});

test('init rejects invalid prerequisites without creating a run, then creates private unique drafts', async t => {
  const { dir, invoke } = await workspace(t);
  const root = path.join(dir, 'runs');
  await fs.mkdir(root);
  // A native Node executable provides the read-only help protocol on every OS.
  await fs.writeFile(path.join(dir, 'agent'), 'console.log("kinds: omp"); process.exitCode=2;');
  const config = path.join(dir, 'config.json');
  const source = await fs.readFile(configPath, 'utf8');
  const invalidLimit = JSON.parse(source);
  invalidLimit.limits.max_goal_attempts = true;
  const invalidKind = JSON.parse(source);
  invalidKind.agents.goal.candidates[0].kind = 'nonexistent';
  const args = ['init', '--config', config, '--herdr', process.execPath, '--root', root];
  for (const invalid of ['{"version":1,' + source.trim().slice(1), JSON.stringify(invalidLimit), JSON.stringify(invalidKind)]) {
    await fs.writeFile(config, invalid);
    invoke(args, 2, { HERDR_ENV: '1' });
    assert.deepEqual(await fs.readdir(root), []);
  }
  await fs.writeFile(config, source);
  invoke(args, 2, { HERDR_ENV: '0' });
  assert.deepEqual(await fs.readdir(root), []);
  const first = invoke(args, 0, { HERDR_ENV: '1' });
  const second = invoke(args, 0, { HERDR_ENV: '1' });
  assert.notEqual(first.run_dir, second.run_dir);
  assert.notEqual(first.run_id, second.run_id);
  assert.deepEqual(await fs.readdir(first.run_dir), ['task.md']);
  assert.equal(first.model_provider_readiness, 'not_checked');
  if (process.platform !== 'win32') {
    assert.equal((await fs.stat(first.run_dir)).mode & 0o777, 0o700);
    assert.equal((await fs.stat(first.task_path)).mode & 0o777, 0o600);
  }
});

test('init scaffolds required Given-When-Then acceptance, gates and evidence without declaring readiness', async t => {
  const { dir, invoke } = await workspace(t);
  const root = path.join(dir, 'drafts with spaces');
  await fs.mkdir(root);
  await fs.writeFile(path.join(dir, 'agent'), 'console.log("kinds: omp"); process.exitCode=2;');
  const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
  config.limits.max_review_rounds = 7;
  const customConfig = path.join(dir, 'custom config.json');
  await fs.writeFile(customConfig, JSON.stringify(config));
  const result = invoke(['init', '--config', customConfig, '--herdr', process.execPath, '--root', root], 0, { HERDR_ENV: '1' });
  const draft = await fs.readFile(result.task_path, 'utf8');
  const sections = draft.split(/^# /m).slice(1);
  assert.deepEqual(sections.map(section => section.split('\n')[0]), [
    'Frozen Task', 'Execution and Verification', 'Current Evidence', 'Outer Review',
  ]);
  const [frozen, plan, evidence, review] = sections;
  assert.match(frozen, /CONTRACT INCOMPLETE/);
  assert.ok(frozen.includes(`Run identity: ${result.run_id}\n`));
  assert.ok(frozen.includes(`Working directory: ${dir}\n`));
  assert.match(frozen, /^## Acceptance$/m);
  assert.match(frozen, /^A1 — /m);
  const acceptance = frozen.split('## Acceptance\n')[1].split('## Constraints / Required Gates\n')[0];
  const fields = ['Given', 'When', 'Then', 'Required proof'];
  for (const field of fields) {
    assert.match(acceptance, new RegExp(`^${field}: <[^>]+>$`, 'm'), `missing acceptance field: ${field}`);
  }
  assert.deepEqual(acceptance.split('\n').filter(line => /^[A-Za-z ]+:/.test(line))
    .map(line => line.slice(0, line.indexOf(':'))), fields, 'acceptance fields must be ordered and unambiguous');
  assert.match(frozen, /^## Constraints \/ Required Gates$/m);
  assert.match(frozen, /^G1 — /m);
  assert.match(plan, /^P1 -> A1:/m);
  assert.match(plan, /^G1:/m);
  const rows = evidence.split('\n').filter(line => /^\| [AG]\d+ \|/.test(line))
    .map(line => line.split('|').slice(1, -1).map(cell => cell.trim()));
  assert.deepEqual(rows, [
    ['A1', 'unverified', 'none', 'not tested'],
    ['G1', 'unverified', 'none', 'not tested'],
  ]);
  for (const [label, relative] of [
    ['Acceptance guide', '../references/acceptance.md'],
    ['Helper script', './loopme.mjs'],
  ]) {
    const filename = fileURLToPath(new URL(relative, import.meta.url));
    assert.ok(frozen.includes(`${label}: ${filename}\n`));
    assert.equal((await fs.stat(filename)).isFile(), true);
  }
  assert.match(review, /Not reviewed\. Reviews: 0\/7\. No acceptance decision\./);
  assert.equal(result.dispatched, false);
  assert.deepEqual(await fs.readdir(result.run_dir), ['task.md']);
});
