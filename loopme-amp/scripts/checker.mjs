import { open, readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { TextDecoder } from 'node:util';
import { capture, evidenceDirectory, parseJSONStrict, writeJSON } from './evidence.mjs';

const MAX_STDOUT_BYTES = 1024 * 1024;
const CASE_NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;

function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactly(value, fields) {
  return object(value) && Object.keys(value).length === fields.length
    && fields.every((field) => Object.hasOwn(value, field));
}

function assertion(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validPath(value) {
  return typeof value === 'string' && value.length > 0 && !value.includes('\0');
}

function expectation(value, name) {
  if (exactly(value, ['outcome']) && value.outcome === 'accepted') return value;
  if (exactly(value, ['outcome', 'assertion']) && value.outcome === 'rejected'
      && assertion(value.assertion)) return value;
  throw new Error(`case ${JSON.stringify(name)}: expect must be accepted, or rejected with a nonempty assertion`);
}

async function loadManifest(manifestPath) {
  const raw = await readFile(manifestPath);
  const value = parseJSONStrict(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(raw));
  if (!exactly(value, ['version', 'cases'])) {
    throw new Error('manifest must contain exactly version and cases');
  }
  if (value.version !== 1) throw new Error('manifest version must be 1');
  if (!Array.isArray(value.cases) || value.cases.length === 0) {
    throw new Error('manifest cases must be a nonempty array');
  }
  const names = new Set();
  const outcomes = new Set();
  const cases = [];
  for (const item of value.cases) {
    if (!exactly(item, ['name', 'fixture', 'expect'])) {
      throw new Error('each case must contain exactly name, fixture, and expect');
    }
    if (typeof item.name !== 'string' || CASE_NAME.exec(item.name)?.[0] !== item.name) {
      throw new Error('case name must match [A-Za-z0-9][A-Za-z0-9_.-]{0,63}');
    }
    if (names.has(item.name)) throw new Error(`duplicate case name: ${JSON.stringify(item.name)}`);
    names.add(item.name);
    if (!validPath(item.fixture)) {
      throw new Error(`case ${JSON.stringify(item.name)}: fixture must be a nonempty path string without NUL`);
    }
    const fixture = await realpath(path.resolve(path.dirname(manifestPath), item.fixture));
    if (!(await stat(fixture)).isFile()) {
      throw new Error(`case ${JSON.stringify(item.name)}: fixture is not a regular file: ${fixture}`);
    }
    const expect = expectation(item.expect, item.name);
    outcomes.add(expect.outcome);
    cases.push({ name: item.name, fixture, expect });
  }
  if (!outcomes.has('accepted') || !outcomes.has('rejected')) {
    throw new Error('manifest requires at least one accepted and one rejected case');
  }
  return cases;
}

async function readProtocol(stdoutPath) {
  const file = await open(stdoutPath, 'r');
  let raw;
  try {
    const size = (await file.stat()).size;
    if (size > MAX_STDOUT_BYTES) throw new Error('checker stdout exceeds 1 MiB');
    // One extra byte detects growth without ever reading an unbounded log.
    const buffer = Buffer.allocUnsafe(size + 1);
    let length = 0;
    while (length < buffer.length) {
      const { bytesRead } = await file.read(buffer, length, buffer.length - length, length);
      if (bytesRead === 0) break;
      length += bytesRead;
    }
    if (length > size) throw new Error('checker stdout changed after capture completed');
    raw = buffer.subarray(0, length);
  } finally {
    await file.close();
  }
  const value = parseJSONStrict(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(raw));
  if (!object(value)) throw new Error('checker stdout must be exactly one JSON object');
  let required;
  if (value.outcome === 'accepted') {
    required = ['outcome'];
  } else if (value.outcome === 'rejected') {
    required = ['outcome', 'assertion'];
    if (!assertion(value.assertion)) throw new Error('rejected outcome requires a nonempty assertion');
  } else if (value.outcome === 'invalid') {
    required = ['outcome', 'message'];
  } else {
    throw new Error('checker outcome must be accepted, rejected, or invalid');
  }
  const allowed = new Set([...required, 'message']);
  if (!required.every((field) => Object.hasOwn(value, field))
      || Object.keys(value).some((field) => !allowed.has(field))) {
    throw new Error('checker protocol has missing or unknown fields');
  }
  if (Object.hasOwn(value, 'message') && typeof value.message !== 'string') {
    throw new Error('checker message must be a string');
  }
  return value;
}

function failure(category, message) {
  return { category, message };
}

async function checkCase(item, command, task, cwd, manifestPath) {
  const result = {
    name: item.name,
    fixture: item.fixture,
    expect: item.expect,
    passed: false,
    evidence_dir: null,
    metadata_path: null,
  };
  let captured;
  try {
    captured = await capture([...command, item.fixture], {
      task,
      name: `check-${item.name}`,
      cwd,
      fingerprints: [item.fixture, manifestPath],
    });
  } catch (error) {
    result.failure = failure('launch_error', `evidence capture failed: ${error.message}`);
    return result;
  }
  for (const field of ['status', 'returncode', 'signal', 'inputs_changed', 'evidence_dir', 'stdout_path', 'stderr_path', 'metadata_path']) {
    result[field] = captured[field] ?? null;
  }
  if (captured.status !== 'completed') {
    result.failure = failure(
      captured.status === 'interrupted' ? 'interruption' : 'launch_error',
      `capture status: ${captured.status}`,
    );
    return result;
  }
  if (captured.inputs_changed) {
    result.failure = failure('invalid_setup', 'fixture or manifest changed during checker execution');
    return result;
  }
  if (captured.signal || (typeof captured.returncode === 'number' && captured.returncode < 0)) {
    result.failure = failure('invalid_setup', `checker terminated by signal ${captured.signal ?? -captured.returncode}`);
    return result;
  }
  let actual;
  try {
    actual = await readProtocol(captured.stdout_path);
  } catch (error) {
    result.failure = failure('malformed_protocol', error.message);
    return result;
  }
  result.actual = actual;
  if (actual.outcome === 'invalid') {
    result.failure = failure('invalid_setup', actual.message);
  } else if (captured.returncode !== (actual.outcome === 'accepted' ? 0 : 1)) {
    result.failure = failure('exit_mismatch', `${actual.outcome} outcome with exit code ${captured.returncode}`);
  } else if (actual.outcome !== item.expect.outcome) {
    result.failure = failure('wrong_outcome', `expected ${item.expect.outcome}, got ${actual.outcome}`);
  } else if (actual.outcome === 'rejected' && actual.assertion !== item.expect.assertion) {
    result.failure = failure('wrong_assertion', 'rejection assertion does not match expected assertion');
  } else {
    result.passed = true;
  }
  return result;
}

/**
 * Validate all cases before executing any checker; persist evidence, not acceptance.
 * Relative manifest/task/cwd paths use the caller cwd; fixtures use manifest parent.
 * Invalid invocation/manifest rejects before execution. Every valid case is run.
 */
export async function checkCases(manifestPath, command, { task, cwd } = {}) {
  if (!Array.isArray(command) || command.length === 0
      || !command.every((arg) => typeof arg === 'string' && !arg.includes('\0'))
      || command[0].length === 0) {
    throw new Error('checker command must be a nonempty argv array of strings without NUL');
  }
  if (!validPath(manifestPath) || !validPath(task) || (cwd !== undefined && !validPath(cwd))) {
    throw new Error('manifest, task, and optional cwd must be nonempty path strings without NUL');
  }
  const callerCwd = process.cwd();
  manifestPath = await realpath(path.resolve(callerCwd, manifestPath));
  task = await realpath(path.resolve(callerCwd, task));
  cwd = await realpath(path.resolve(callerCwd, cwd ?? callerCwd));
  if (!(await stat(manifestPath)).isFile()) throw new Error(`manifest is not a regular file: ${manifestPath}`);
  if (!(await stat(task)).isFile()) throw new Error(`task is not a regular file: ${task}`);
  if (!(await stat(cwd)).isDirectory()) throw new Error(`cwd is not a directory: ${cwd}`);
  const cases = await loadManifest(manifestPath);
  const summaryDir = await evidenceDirectory(task, 'check-suite');
  const summaryPath = path.join(summaryDir, 'summary.json');
  const results = [];
  for (const item of cases) results.push(await checkCase(item, command, task, cwd, manifestPath));
  const summary = {
    version: 1,
    ok: results.every((result) => result.passed),
    manifest_path: manifestPath,
    task_path: task,
    cwd,
    command,
    cases: results,
    summary_path: summaryPath,
  };
  await writeJSON(summaryPath, summary);
  return summary;
}
