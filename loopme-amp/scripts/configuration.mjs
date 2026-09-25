import { constants } from 'node:fs';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { parseJSONStrict } from './evidence.mjs';

const SKILL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAX_BYTES = 1024 * 1024;
const HELP_TIMEOUT_MS = 10_000;
// Built-in modes are not listed as plugin agent modes, so they are accepted directly.
const BUILTIN_MODES = new Set(['low', 'medium', 'high', 'ultra', 'smart', 'deep', 'rush']);
const SWITCH_TRIGGERS = new Set([
  'startup_failure', 'prompt_delivery_failure', 'process_exit',
  'provider_or_model_error', 'wait_failure_without_observed_progress',
  'missing_terminal_marker_after_recovery',
]);
const NO_SWITCH_TRIGGERS = new Set([
  'approval_or_user_input_blocked', 'semantic_terminal_marker',
  'implementation_or_test_failure', 'outer_review_reject', 'context_expansion_request',
]);

function mapping(value, where, required, optional = []) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)
      || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new Error(`${where} must be a mapping`);
  }
  const allowed = new Set([...required, ...optional]);
  const unknown = Object.keys(value).filter(key => !allowed.has(key));
  const missing = required.filter(key => !Object.hasOwn(value, key));
  if (unknown.length) throw new Error(`${where} has unknown fields: ${unknown.join(', ')}`);
  if (missing.length) throw new Error(`${where} is missing fields: ${missing.join(', ')}`);
  return value;
}

function string(value, where, nonempty = true) {
  if (typeof value !== 'string' || value.includes('\0')) {
    throw new Error(`${where} must be a NUL-free string`);
  }
  if (nonempty && !value.trim()) throw new Error(`${where} must not be empty`);
  return value;
}

function integer(value, where, minimum) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`${where} must be a safe integer >= ${minimum}`);
  }
}

function boolean(value, where) {
  if (typeof value !== 'boolean') throw new Error(`${where} must be a boolean`);
}

function triggers(value, where, allowed) {
  if (!Array.isArray(value)) throw new Error(`${where} must be an array`);
  const seen = new Set();
  for (const item of value) {
    string(item, where);
    if (!allowed.has(item)) throw new Error(`${where} has unknown trigger: ${item}`);
    if (seen.has(item)) throw new Error(`${where} has duplicate trigger: ${item}`);
    seen.add(item);
  }
  return seen;
}

async function regularFile(filePath, where) {
  const resolved = await fs.realpath(filePath);
  if (!(await fs.stat(resolved)).isFile()) {
    throw new Error(`${where} must be a readable regular file: ${resolved}`);
  }
  const file = await fs.open(resolved, 'r');
  try {
    await file.read(Buffer.alloc(1), 0, 1, 0);
  } finally {
    await file.close();
  }
  return resolved;
}

async function loadConfig(configPath) {
  const resolved = await regularFile(configPath ?? path.join(SKILL_ROOT, 'config.json'), 'config');
  const file = await fs.open(resolved, 'r');
  const buffer = Buffer.alloc(MAX_BYTES + 1);
  let size = 0;
  try {
    while (size < buffer.length) {
      const { bytesRead } = await file.read(buffer, size, buffer.length - size, null);
      if (!bytesRead) break;
      size += bytesRead;
    }
  } finally {
    await file.close();
  }
  if (size > MAX_BYTES) throw new Error('configuration exceeds 1 MiB');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, size));
  const config = parseJSONStrict(text);
  mapping(config, 'config', ['version', 'runtime', 'goal', 'limits', 'fallback']);
  if (config.version !== 1) throw new Error('config.version must be integer 1');
  if (config.runtime !== 'amp') throw new Error('config.runtime must be "amp"');
  const goal = mapping(config.goal, 'goal', ['modes', 'executor', 'worktree']);
  if (!Array.isArray(goal.modes) || !goal.modes.length) {
    throw new Error('goal.modes must be a nonempty array');
  }
  const seenModes = new Set();
  for (const [index, mode] of goal.modes.entries()) {
    string(mode, `goal.modes[${index}]`);
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(mode)) {
      throw new Error(`goal.modes[${index}] is not a valid mode key: ${mode}`);
    }
    const key = mode.toLowerCase();
    if (seenModes.has(key)) throw new Error(`goal.modes has duplicate mode: ${mode}`);
    seenModes.add(key);
  }
  string(goal.executor, 'goal.executor');
  if (!/^(local|orb|runner:[A-Za-z0-9][A-Za-z0-9._-]*)$/.test(goal.executor)) {
    throw new Error('goal.executor must be local, orb, or runner:<id>');
  }
  boolean(goal.worktree, 'goal.worktree');
  if (goal.worktree && !goal.executor.startsWith('runner:')) {
    throw new Error('goal.worktree requires goal.executor runner:<id>');
  }
  const brief = await regularFile(path.join(SKILL_ROOT, 'references', 'goal-brief.md'), 'goal brief');
  mapping(config.limits, 'limits', ['max_goal_attempts', 'max_review_rounds']);
  for (const [key, value] of Object.entries(config.limits)) integer(value, `limits.${key}`, 1);
  const fallback = mapping(config.fallback, 'fallback', [
    'strategy', 'recovery_prompts', 'switch_on', 'do_not_switch_on',
  ]);
  if (fallback.strategy !== 'ordered') throw new Error('fallback.strategy must be ordered');
  integer(fallback.recovery_prompts, 'fallback.recovery_prompts', 0);
  const switchOn = triggers(fallback.switch_on, 'fallback.switch_on', SWITCH_TRIGGERS);
  const noSwitch = triggers(fallback.do_not_switch_on, 'fallback.do_not_switch_on', NO_SWITCH_TRIGGERS);
  if ([...switchOn].some(trigger => noSwitch.has(trigger))) {
    throw new Error('fallback.switch_on and fallback.do_not_switch_on must be disjoint');
  }
  config.goal.brief = brief;
  return { configPath: resolved, config };
}

async function resolveExecutable(command, where) {
  string(command, `${where} executable`);
  const explicit = path.isAbsolute(command) || command.includes('/') || (process.platform === 'win32' && command.includes('\\'));
  const extensions = process.platform === 'win32'
    ? ['', ...(process.env.PATHEXT ?? '.EXE;.CMD;.BAT;.COM').split(';')]
    : [''];
  const candidates = explicit ? [path.resolve(command)] : (process.env.PATH ?? '').split(path.delimiter)
    .flatMap(dir => extensions.map(extension => path.resolve(dir || '.', command + extension)));
  for (const candidate of candidates) {
    try {
      if (!(await fs.stat(candidate)).isFile()) continue;
      await fs.access(candidate, constants.X_OK);
      return await fs.realpath(candidate);
    } catch (error) {
      if (!['ENOENT', 'ENOTDIR', 'EACCES'].includes(error.code)) throw error;
    }
  }
  throw new Error(`${where} executable not found or not executable: ${command}`);
}

function run(executable, args, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: false });
    const chunks = [];
    let bytes = 0;
    let settled = false;
    const fail = error => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill('SIGKILL');
      child.stdout.destroy();
      child.stderr.destroy();
      reject(error);
    };
    const timer = setTimeout(() => fail(new Error(`${label} exceeded 10 seconds`)), HELP_TIMEOUT_MS);
    const receive = chunk => {
      if (settled) return;
      bytes += chunk.length;
      if (bytes > MAX_BYTES) {
        fail(new Error(`${label} exceeds 1 MiB`));
      } else {
        chunks.push(chunk);
      }
    };
    child.stdout.on('data', receive);
    child.stderr.on('data', receive);
    child.stdout.on('error', fail);
    child.stderr.on('error', fail);
    child.on('error', fail);
    child.on('close', (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (signal || code !== 0) {
        reject(new Error(`${label} failed: ${signal ?? `exit ${code}`}`));
      } else {
        resolve(Buffer.concat(chunks, bytes));
      }
    });
  });
}

async function ampInfo(amp) {
  const executable = await resolveExecutable(amp, 'amp');
  const bytes = await run(executable, ['plugins', 'list'], 'amp plugins list');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const modes = [];
  for (const match of text.matchAll(/^\s*agent mode:\s*(\S+)\s*$/gm)) modes.push(match[1]);
  return { executable, modes, plugin_modes: modes.length };
}

export async function checkConfig(configPath = undefined, { amp = 'amp' } = {}) {
  const loaded = await loadConfig(configPath);
  const info = await ampInfo(amp);
  const available = new Set(info.modes.map(mode => mode.toLowerCase()));
  for (const mode of loaded.config.goal.modes) {
    const key = mode.toLowerCase();
    if (!BUILTIN_MODES.has(key) && !available.has(key)) {
      throw new Error(`goal.modes: unsupported installed agent mode: ${mode}`);
    }
  }
  return {
    status: 'valid', config_path: loaded.configPath, skill_root: SKILL_ROOT,
    config: loaded.config, amp: info, builtin_modes: [...BUILTIN_MODES],
    model_provider_readiness: 'not_checked',
  };
}

export async function initialize(configPath = undefined, { amp = 'amp', root = undefined } = {}) {
  const result = await checkConfig(configPath, { amp });
  const parent = await fs.realpath(root ?? os.tmpdir());
  if (!(await fs.stat(parent)).isDirectory()) throw new Error(`run root must be an existing directory: ${parent}`);
  await fs.access(parent, constants.W_OK | constants.X_OK);
  const runId = `lma-${randomBytes(8).toString('hex')}`;
  const text = '# Frozen Task\n\n'
    + 'CONTRACT INCOMPLETE — fill the goal, acceptance criteria, constraints/required gates, non-goals, shared context, '
    + 'frozen decisions, unknowns, deliverables and the ownership/stop protocol before dispatch.\n\n'
    + `Run identity: ${runId}\nWorking directory: ${process.cwd()}\n`
    + `Helper script: ${path.join(SKILL_ROOT, 'scripts', 'loopme.mjs')}\n`
    + `Acceptance guide: ${path.join(SKILL_ROOT, 'references', 'acceptance.md')}\n`
    + `Goal brief: ${result.config.goal.brief}\n`
    + `Goal modes: ${result.config.goal.modes.join(' -> ')}\n`
    + `Goal executor: ${result.config.goal.executor}${result.config.goal.worktree ? ' (new worktree per Goal)' : ''}\n\n`
    + 'Use the guide before freezing. Every A item must use Given / When / Then, with Required proof recorded separately.\n'
    + 'Replace placeholders and add/remove A/G items and evidence rows to match the task. Use explicit none where applicable, not blanks.\n'
    + 'Do not freeze candidate plans or predicted file edits as mandates; technical constraints and write limits need explicit authority.\n'
    + 'Do not promote assumptions to facts or pending choices to frozen decisions.\n'
    + 'Goal may change methods in Execution and Verification, not acceptance meaning or minimum proof; Outer records contract changes.\n\n'
    + '## Goal and Scope\n\n'
    + 'Goal: <result this run must deliver, not implementation steps>\n'
    + 'In scope: <covered behaviors, objects and boundaries>\n'
    + 'Non-goals: <explicit exclusions; or none with reason>\n\n'
    + '## Shared Context and Unknowns\n\n'
    + 'Authoritative: <references to user requirements, approved constraints and decisions; do not duplicate them>\n'
    + 'Established: <verified facts with sources and applicable versions/conditions; or none identified>\n'
    + 'Uncertain: <known decision-relevant questions/assumptions, impact and resolution owner/authority; or none identified>\n'
    + 'Resolve scope/authority/risk decisions before dependent work; assign in-scope technical investigation to Goal.\n\n'
    + '## Frozen Decisions\n\n'
    + 'Decisions: <confirmed decisions with source/authority, rationale and scope; or explicitly none>\n\n'
    + '## Deliverables\n\n'
    + 'Deliverables: <artifact/result, required location or consumer entry if constrained, and A IDs; not a predicted edit list>\n\n'
    + '## Acceptance\n\n'
    + 'A1 — <task-specific, adjudicable outcome>\n'
    + 'Given: <preconditions, input and relevant state>\n'
    + 'When: <action, event or artifact review under those conditions>\n'
    + 'Then: <observable result with a clear pass/fail criterion>\n'
    + 'Required proof: <minimum boundary, decision rule, and evidence to retain>\n\n'
    + '## Constraints / Required Gates\n\n'
    + 'Constraints: <limits and authorized write scope, with sources; reference confirmed decisions rather than duplicating them>\n'
    + 'G1 — <applicable quality gate, scope and baseline; or explicitly none with reason>\n'
    + 'Gate success does not replace an acceptance outcome; classify engineering deliverables by what is checked, not the tool.\n\n'
    + '## Ownership and Stop Protocol\n\n'
    + 'Outer owns acceptance semantics, minimum proof requirements and the final PASS/REJECT decision; only Outer changes the contract.\n'
    + 'Goal owns methods and evidence and may implement or refactor fixtures and assertion code without weakening expectations,\n'
    + 'rejection conditions or the required proof boundary.\n'
    + 'End every handoff turn with exactly one marker: READY_FOR_OUTER_REVIEW, GOAL_BLOCKED: <question>, or GOAL_STALLED: <reason>.\n'
    + 'Update the Current Evidence rows before handing off; reserve ask_user_choice for authority only Outer cannot supply.\n\n'
    + '# Execution and Verification\n\n'
    + 'Goal owns methods; preserve frozen Given / When / Then, scope, constraints, decisions and minimum proof requirements.\n'
    + 'Execution slices: <U1...Un behavior-oriented end-to-end units mapped to A/G, each with done predicate/proof subset; or single-slice with reason>\n'
    + 'Active slice: <exactly one U#; later slices may be investigated but not bulk-implemented ahead of it>\n'
    + 'Engineering checkpoint: <invariant; state/data shape; current evidence/hypothesis; smallest justified next change; expected observable delta>\n'
    + 'Plan: <current approach, candidate steps/file edits and dependencies; revise within the frozen contract>\n'
    + 'Unknown resolution: <progress, evidence and new questions referencing the initial Uncertain context; or none>\n'
    + 'Before dispatch, fill task-specific proof obligations, counterexamples and expected results; '
    + 'reference required outcome invariants in Acceptance/Constraints rather than redefining them here.\n'
    + 'P1 -> A1: <method at the required boundary, expected result and relevant counterexample; '
    + 'Goal may refine commands without weakening proof>\n'
    + 'G1: <gate verification method and expected result>\n'
    + 'Preflight: pending; before READY record current A/G coverage, real-boundary proof, negative-case semantics, speculative/legacy state, and unresolved design assumptions.\n'
    + 'No execution or verification has occurred.\n\n'
    + '# Current Evidence\n\n'
    + 'Status: unverified. No commands, results, or acceptance evidence recorded.\n'
    + 'Keep one row per required A/G ID; record observed results, evidence references and tested boundary/source/build, '
    + 'including uncommitted changes.\n\n'
    + '| ID | Status | Evidence / observed result | Tested boundary / source / build |\n'
    + '| --- | --- | --- | --- |\n'
    + '| A1 | unverified | none | not tested |\n'
    + '| G1 | unverified | none | not tested |\n\n'
    + '# Outer Review\n\n'
    + `Not reviewed. Reviews: 0/${result.config.limits.max_review_rounds}. No acceptance decision.\n`;
  const runDir = await fs.mkdtemp(path.join(parent, 'loopme-amp-'));
  const taskPath = path.join(runDir, 'task.md');
  try {
    if (process.platform !== 'win32') await fs.chmod(runDir, 0o700);
    const file = await fs.open(taskPath, 'wx', 0o600);
    try {
      if (process.platform !== 'win32') await file.chmod(0o600);
      await file.writeFile(text, 'utf8');
    } finally {
      await file.close();
    }
  } catch (error) {
    await fs.rm(runDir, { recursive: true, force: true });
    throw error;
  }
  return {
    ...result, status: 'initialized', run_id: runId, run_dir: runDir,
    task_path: taskPath, dispatched: false,
  };
}
