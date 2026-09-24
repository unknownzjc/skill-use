import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { constants, createReadStream } from 'node:fs';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export function parseJSONStrict(text) {
  const value = JSON.parse(text);
  // JSON.parse validates the grammar but silently overwrites duplicate keys.
  // Scan only strings and container boundaries in the already-valid input.
  const containers = [];
  for (const [token] of text.matchAll(/"(?:\\[\s\S]|[^"\\])*"|[{}\[\],]/g)) {
    if (token === '{') {
      containers.push({ keys: new Set(), expectingKey: true });
    } else if (token === '[') {
      containers.push(null);
    } else if (token === '}' || token === ']') {
      containers.pop();
    } else {
      const object = containers.at(-1);
      if (token === ',') {
        if (object) object.expectingKey = true;
      } else if (object?.expectingKey) {
        const key = JSON.parse(token);
        if (object.keys.has(key)) throw new Error(`Duplicate JSON key: ${JSON.stringify(key)}`);
        object.keys.add(key);
        object.expectingKey = false;
      }
    }
  }
  function finite(item) {
    if (typeof item === 'number' && !Number.isFinite(item)) {
      throw new Error('Non-finite JSON numbers are not supported');
    }
    if (item && typeof item === 'object') Object.values(item).forEach(finite);
  }
  finite(value);
  return value;
}

export async function writeJSON(filename, value) {
  // Evidence records are immutable. A truncated/invalid JSON file is not completion.
  await fs.writeFile(filename, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
}

export async function evidenceDirectory(task, name) {
  if (typeof name !== 'string' || /^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/.exec(name)?.[0] !== name) {
    throw new Error('Evidence name must be 1–80 letters, digits, dots, underscores or hyphens, starting with a letter/digit');
  }
  const taskPath = await fs.realpath(task);
  if (!(await fs.stat(taskPath)).isFile()) throw new Error('Task path must be a regular file');
  const root = path.join(path.dirname(taskPath), 'evidence');
  try {
    await fs.mkdir(root, { mode: 0o700 });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
  const info = await fs.lstat(root);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('Evidence root must be a real directory, not a symlink');
  const directory = await fs.mkdtemp(path.join(root, `${name}-`));
  if (process.platform !== 'win32') await fs.chmod(directory, 0o700);
  return directory;
}

async function fingerprint(filename) {
  const info = await fs.stat(filename);
  if (!info.isFile()) throw new Error(`Fingerprint input is not a regular file: ${filename}`);
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return { path: filename, bytes: info.size, sha256: hash.digest('hex') };
}

async function resolveExecutable(executable, cwd) {
  const explicit = path.isAbsolute(executable) || executable.includes('/') || executable.includes('\\');
  const names = process.platform === 'win32' && !path.extname(executable)
    ? ['', ...(process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD').split(';')].map(ext => executable + ext)
    : [executable];
  const roots = explicit ? [cwd] : (process.env.PATH || '').split(path.delimiter).map(root => path.resolve(cwd, root || '.'));
  for (const root of roots) {
    for (const name of names) {
      const candidate = path.resolve(root, name);
      try {
        await fs.access(candidate, process.platform === 'win32' ? constants.F_OK : constants.X_OK);
        if ((await fs.stat(candidate)).isFile()) return candidate;
      } catch { /* Try the next PATH entry; spawn reports launch failure. */ }
    }
  }
  return null;
}

// Captures one finite foreground command, not a service or process-tree lifecycle.
export async function capture(command, { task, name, cwd = process.cwd(), fingerprints = [] } = {}) {
  if (!Array.isArray(command) || !command.length || command.some(arg => typeof arg !== 'string' || arg.includes('\0')) || !command[0]) {
    throw new Error('Command must be a nonempty argv array of NUL-free strings');
  }
  cwd = await fs.realpath(cwd);
  if (!(await fs.stat(cwd)).isDirectory()) throw new Error('cwd must be a directory');
  if (!Array.isArray(fingerprints)) throw new Error('fingerprints must be an array of file paths');
  const inputs = [...new Set(fingerprints.map(filename => path.resolve(cwd, filename)))];
  const before = await Promise.all(inputs.map(fingerprint));
  const executable = await resolveExecutable(command[0], cwd);
  const directory = await evidenceDirectory(task, name);
  const stdoutPath = path.join(directory, 'stdout.log');
  const stderrPath = path.join(directory, 'stderr.log');
  const metadataPath = path.join(directory, 'result.json');
  const started = {
    version: 1,
    task_path: await fs.realpath(task),
    name,
    command,
    cwd,
    resolved_executable: executable,
    platform: { os: process.platform, arch: process.arch, release: os.release() },
    runner: { executable: process.execPath, node: process.version },
    started_at: new Date().toISOString(),
    fingerprints_before: before,
    evidence_dir: directory,
    stdout_path: stdoutPath,
    stderr_path: stderrPath,
    metadata_path: metadataPath,
  };
  // A start record without result.json means incomplete evidence, not a live-state claim.
  await writeJSON(path.join(directory, 'started.json'), started);
  const stdout = await fs.open(stdoutPath, 'wx', 0o600);
  let stderr;
  let returncode = null;
  let signal = null;
  let pid = null;
  let launchError = null;
  let interrupted = null;
  let forward;
  try {
    stderr = await fs.open(stderrPath, 'wx', 0o600);
    const child = spawn(executable || command[0], command.slice(1), {
      cwd,
      env: process.env,
      shell: false,
      stdio: ['ignore', stdout.fd, stderr.fd],
    });
    pid = child.pid ?? null;
    forward = received => {
      interrupted = received;
      // Forward to this child only. No PID scans, tree-kill, timeout or success inference.
      try { child.kill(received); } catch { /* close/error remains authoritative. */ }
    };
    process.on('SIGINT', onInterrupt);
    process.on('SIGTERM', onTerminate);
    await new Promise(resolve => {
      child.once('error', error => { launchError = { code: error.code ?? null, message: error.message }; });
      child.once('close', (code, received) => { returncode = code; signal = received; resolve(); });
    });
  } catch (error) {
    launchError = { code: error.code ?? null, message: error.message };
  } finally {
    process.off('SIGINT', onInterrupt);
    process.off('SIGTERM', onTerminate);
    await stdout.close();
    if (stderr) await stderr.close();
  }
  function onInterrupt() { forward?.('SIGINT'); }
  function onTerminate() { forward?.('SIGTERM'); }
  const after = await Promise.all(inputs.map(async filename => {
    try { return await fingerprint(filename); }
    catch (error) { return { path: filename, error: error.message }; }
  }));
  const result = {
    ...started,
    ended_at: new Date().toISOString(),
    status: launchError ? 'launch_error' : interrupted ? 'interrupted' : 'completed',
    pid,
    returncode,
    signal,
    interrupted_by: interrupted,
    launch_error: launchError,
    fingerprints_after: after,
    inputs_changed: before.some((input, index) => input.sha256 !== after[index].sha256),
  };
  await writeJSON(metadataPath, result);
  return result;
}

export function exitCode(result) {
  if (result.status === 'launch_error') return 125;
  const signal = result.interrupted_by || result.signal;
  if (signal) return 128 + (os.constants.signals[signal] || 1);
  return result.returncode ?? 125;
}
