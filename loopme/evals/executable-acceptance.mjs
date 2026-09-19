#!/usr/bin/env node
// Mechanism ablation, NOT an LLM/prompt evaluation or a production acceptance gate.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.resolve(here, '../scripts/loopme.mjs');
const cases = [
  { name: 'good-cli', acceptable: true },
  { name: 'good-reordered', acceptable: true, product: 'reverse' },
  { name: 'good-refactored', acceptable: true, checker: 'refactored' },
  { name: 'good-native-no-feature', acceptable: true, feature: false },
  { name: 'feature-only', acceptable: false, execution: 'none' },
  { name: 'skipped-scenario', acceptable: false, execution: 'skip' },
  { name: 'wrong-scenario-id', acceptable: false, execution: 'other' },
  { name: 'empty-assertion', acceptable: false, product: 'page', checker: 'noop' },
  { name: 'ignored-false', acceptable: false, product: 'page', checker: 'ignored-false' },
  { name: 'weakened-expectation', acceptable: false, product: 'page', expectation: 'page' },
  { name: 'helper-substitution', acceptable: false, product: 'page', boundary: 'helper' },
  { name: 'honest-regression', acceptable: false, product: 'page' },
  { name: 'skip-plus-noop', acceptable: false, product: 'page', execution: 'skip', checker: 'noop' },
];
// Fixed before scoring, independent of the implementation and candidate expectations.
const datasets = [['r1', 'r3', 'r5'], ['p02', 'p07', 'p11', 'p20']];
const guards = ['execution', 'frozen-expectation', 'checker-challenge', 'real-entry'];
const arms = [
  { name: 'exit-only-control', omit: guards },
  { name: 'full', omit: [] },
  ...guards.map(guard => ({ name: `minus-${guard}`, omit: [guard] })),
  { name: 'minus-expectation-and-challenge', omit: ['frozen-expectation', 'checker-challenge'] },
];

// Intentionally tiny, single-column CSV fixture; not a general CSV implementation.
const exporter = String.raw`
const fs = require('node:fs');
const csv = ids => 'id\n' + ids.join('\n') + '\n';
exports.helper = input => csv(input.ids);
if (require.main === module) {
  const input = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const ids = input.product === 'page' ? input.ids.slice(0, 2)
    : input.product === 'reverse' ? [...input.ids].reverse() : input.ids;
  process.stdout.write(csv(ids));
}
`;
const checker = String.raw`
const fs = require('node:fs');
const [expectedPath, mode, fixture] = process.argv.slice(2);
try {
  const expected = JSON.parse(fs.readFileSync(expectedPath, 'utf8')).ids;
  const lines = fs.readFileSync(fixture, 'utf8').trimEnd().split(/\r?\n/);
  if (lines.shift() !== 'id' || lines.some(id => !/^[a-zA-Z0-9]+$/.test(id))) throw new Error('invalid CSV fixture');
  const left = [...lines].sort();
  const right = [...expected].sort();
  const matches = mode === 'refactored'
    ? left.length === right.length && left.every((id, i) => id === right[i])
    : JSON.stringify(left) === JSON.stringify(right);
  let accepted;
  if (mode === 'noop') accepted = true;
  else if (mode === 'ignored-false') {
    // Models an adapter that ignores a boolean return; this is NOT Cucumber itself.
    const step = () => matches;
    step();
    accepted = true;
  } else accepted = matches;
  console.log(JSON.stringify(accepted ? {outcome:'accepted'} : {outcome:'rejected', assertion:'record_set'}));
  process.exitCode = accepted ? 0 : 1;
} catch (error) {
  console.log(JSON.stringify({outcome:'invalid', message:error.message}));
  process.exitCode = 2;
}
`;
const binding = String.raw`
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const dir = __dirname;
const config = JSON.parse(fs.readFileSync(path.join(dir, 'submission.json'), 'utf8'));
const recordsPath = path.join(dir, 'observations.json');
fs.writeFileSync(recordsPath, '[]\n');
if (config.execution !== 'none') test(config.execution === 'other' ? 'SMOKE' : 'A1', {
  skip: config.execution === 'skip',
}, () => {
  const entry = path.join(dir, 'export.cjs');
  const input = path.join(dir, 'input.json');
  const args = config.boundary === 'helper'
    ? ['-e', 'process.stdout.write(require(process.argv[1]).helper(JSON.parse(require("node:fs").readFileSync(process.argv[2],"utf8"))))', entry, input]
    : [entry, input];
  const product = spawnSync(process.execPath, args, {encoding:'utf8', timeout:5000});
  assert.ifError(product.error);
  assert.equal(product.signal, null);
  assert.equal(product.status, 0, product.stderr);
  const artifact = path.join(dir, 'actual.csv');
  fs.writeFileSync(artifact, product.stdout);
  const checkerArgs = [path.join(dir, 'checker.cjs'), path.join(dir, 'expected.json'), config.checker || 'exact', artifact];
  const checked = spawnSync(process.execPath, checkerArgs, {encoding:'utf8', timeout:5000});
  assert.ifError(checked.error);
  assert.equal(checked.signal, null);
  const outcome = JSON.parse(checked.stdout);
  fs.writeFileSync(recordsPath, JSON.stringify([{
    id: config.execution === 'other' ? 'SMOKE' : 'A1',
    command: [process.execPath, ...args], checker_command: [process.execPath, ...checkerArgs],
    artifact, checker_status: checked.status, outcome,
  }], null, 2));
  assert.equal(checked.status, 0, checked.stdout);
  assert.equal(outcome.outcome, 'accepted');
});
`;

async function json(filename, value) {
  await fs.writeFile(filename, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}
async function readJSON(filename) { return JSON.parse(await fs.readFile(filename, 'utf8')); }
const sorted = values => [...values].sort();
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
function invoke(args, cwd) {
  const child = spawnSync(process.execPath, [cli, ...args], {cwd, encoding:'utf8', timeout:15000});
  assert.ifError(child.error);
  assert.equal(child.signal, null);
  assert.ok([0, 1].includes(child.status), child.stderr || child.stdout);
  return { exit: child.status, result: JSON.parse(child.stdout) };
}

// This evaluator is handwritten from the guidance. It never reads a case's label/name.
// Omissions change only which evidence is considered; every arm gets identical runs.
function judge(observed, omitted) {
  const reasons = [];
  const enabled = guard => !omitted.includes(guard);
  if (observed.run.exit !== 0 || observed.run.result.status !== 'completed'
      || observed.run.result.inputs_changed) reasons.push('runner-not-successful');
  if (enabled('execution') && (observed.records.length !== 1
      || observed.records[0].id !== 'A1' || observed.records[0].checker_status !== 0
      || observed.records[0].outcome.outcome !== 'accepted')) reasons.push('required-scenario-not-passed');
  if (enabled('frozen-expectation') && !same(sorted(observed.expected.ids), sorted(observed.frozen.ids))) {
    reasons.push('expected-result-changed');
  }
  if (enabled('checker-challenge') && !observed.challenge.result.ok) reasons.push('checker-not-discriminating');
  if (enabled('real-entry') && !observed.records.some(record => same(record.command, observed.requiredCommand))) {
    reasons.push('required-entry-not-exercised');
  }
  return { admitted: reasons.length === 0, reasons };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1) throw new Error('Usage: node executable-acceptance.mjs [existing-output-parent]');
  const parent = await fs.realpath(args[0] ?? os.tmpdir());
  const root = await fs.mkdtemp(path.join(parent, 'loopme-ablation-'));
  if (process.platform !== 'win32') await fs.chmod(root, 0o700);
  // Store the corpus, labels and arms before execution; labels only enter final scoring.
  await json(path.join(root, 'design.json'), { datasets, cases, arms });
  const results = [];
  for (const [dataset, ids] of datasets.entries()) for (const item of cases) {
    const dir = path.join(root, `${dataset}-${item.name}`);
    await fs.mkdir(dir);
    const {name, acceptable, feature, ...submission} = item;
    await json(path.join(dir, 'submission.json'), submission);
    await json(path.join(dir, 'frozen.json'), {ids});
    await json(path.join(dir, 'expected.json'), {ids: item.expectation === 'page' ? ids.slice(0, 2) : ids});
    await json(path.join(dir, 'input.json'), {ids, product:item.product ?? 'correct'});
    await fs.writeFile(path.join(dir, 'task.md'), '# Frozen Task\nA1: export exactly ' + ids.join(', ') + ' through export.cjs.\n\n# Execution and Verification\nNative Node binding; exact records, no duplicates.\n\n# Current Evidence\nUnverified.\n\n# Outer Review\nNot reviewed.\n');
    for (const [file, text] of [['export.cjs', exporter], ['checker.cjs', checker], ['binding.test.cjs', binding]]) {
      await fs.writeFile(path.join(dir, file), text);
    }
    if (feature !== false) await fs.writeFile(path.join(dir, 'export.feature'),
      '@A1\nFeature: Export\n  Scenario: All filtered rows\n    Given filtered IDs ' + ids.join(', ') + '\n    When the real export entry runs\n    Then exactly those IDs occur once\n');
    const fingerprints = ['export.cjs', 'checker.cjs', 'binding.test.cjs', 'input.json', 'expected.json', 'submission.json', 'frozen.json'];
    const run = invoke(['run', '--task', 'task.md', '--name', 'binding',
      ...fingerprints.flatMap(file => ['--fingerprint', file]), '--',
      process.execPath, '--test', '--test-reporter=tap', 'binding.test.cjs'], dir);
    // Canonical good/missing/duplicate observations, never copied from the candidate oracle.
    const fixtures = [ids, ids.slice(0, -1), [...ids, ids[0]]];
    const names = ['good', 'missing', 'duplicate'];
    for (const [index, rows] of fixtures.entries()) await fs.writeFile(path.join(dir, names[index] + '.csv'), 'id\n' + rows.join('\n') + '\n');
    await json(path.join(dir, 'cases.json'), {version:1, cases:names.map((name, i) => ({name, fixture:name + '.csv',
      expect:i === 0 ? {outcome:'accepted'} : {outcome:'rejected', assertion:'record_set'}}))});
    const challenge = invoke(['check', '--task', 'task.md', '--cases', 'cases.json', '--',
      process.execPath, path.join(dir, 'checker.cjs'), path.join(dir, 'expected.json'), item.checker ?? 'exact'], dir);
    const observed = {run, challenge, records:await readJSON(path.join(dir, 'observations.json')),
      expected:await readJSON(path.join(dir, 'expected.json')), frozen:await readJSON(path.join(dir, 'frozen.json')),
      requiredCommand:[process.execPath, path.join(dir, 'export.cjs'), path.join(dir, 'input.json')]};
    await json(path.join(dir, 'observation.json'), observed);
    const decisions = Object.fromEntries(arms.map(arm => [arm.name, judge(observed, arm.omit)]));
    results.push({dataset, case:name, acceptable, observation:path.relative(root, path.join(dir, 'observation.json')), decisions});
  }
  const scores = arms.map(arm => ({
    arm:arm.name, omitted:arm.omit,
    false_accepts:results.filter(row => !row.acceptable && row.decisions[arm.name].admitted).map(row => `${row.dataset}/${row.case}`),
    false_rejects:results.filter(row => row.acceptable && !row.decisions[arm.name].admitted).map(row => `${row.dataset}/${row.case}`),
  }));
  const hashes = {};
  // Documentation hashes identify the revision; the evaluator does not interpret it.
  for (const file of ['../scripts/loopme.mjs', '../scripts/checker.mjs', '../scripts/evidence.mjs',
    '../SKILL.md', '../references/acceptance.md', '../references/goal-agent.md', 'executable-acceptance.mjs']) {
    hashes[file] = createHash('sha256').update(await fs.readFile(path.resolve(here, file))).digest('hex');
  }
  const report = {version:1, scope:'deterministic mechanism ablation; not agent behavior or old/new skill performance',
    runtime:{node:process.version, platform:process.platform, arch:process.arch}, source_sha256:hashes,
    corpus:{valid:results.filter(row => row.acceptable).length, invalid:results.filter(row => !row.acceptable).length},
    scores, results};
  await json(path.join(root, 'report.json'), report);
  // Save evidence before asserting. A broken evaluator cannot silently emit a success report.
  const full = scores.find(row => row.arm === 'full');
  assert.deepEqual(full.false_accepts, [], 'full policy admitted a known defect/proof gap');
  assert.deepEqual(full.false_rejects, [], 'full policy rejected a valid control');
  assert.ok(scores.find(row => row.arm === 'exit-only-control').false_accepts.length > 0,
    'weak control did not reproduce false success');
  console.log(JSON.stringify({report:path.join(root, 'report.json'), corpus:report.corpus,
    scores:scores.map(row => ({arm:row.arm, false_accepts:row.false_accepts.length, false_rejects:row.false_rejects.length}))}, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
