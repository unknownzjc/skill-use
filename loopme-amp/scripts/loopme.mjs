#!/usr/bin/env node
import path from 'node:path';
import { parseArgs } from 'node:util';

const help = `LoopMe mechanical helpers (Node.js >=22)

  node loopme.mjs check-config [--config FILE] [--amp EXECUTABLE]
  node loopme.mjs init [--config FILE] [--amp EXECUTABLE] [--root DIRECTORY]
  node loopme.mjs run --task FILE --name NAME [--cwd DIRECTORY]
      [--fingerprint FILE ...] -- EXECUTABLE [ARGS...]
  node loopme.mjs check --task FILE --cases FILE [--cwd DIRECTORY]
      -- CHECKER_EXECUTABLE [ARGS...]

No installation step or third-party dependencies. Tests: node --test <skill-directory>/scripts/loopme.test.mjs
check-config validates the configured Goal modes against the installed Amp agent modes.
init creates a fresh task draft, not an executable contract.
run records a finite foreground process; it does not judge acceptance or manage services.
Use independent argv after --; shell pipelines require explicit exit-status handling.
Fingerprints are explicit files relative to --cwd; untracked files are supported.
No environment values are saved. Do not put credentials in argv or captured output.

Cases JSON: {"version":1,"cases":[
  {"name":"good","fixture":"good.json","expect":{"outcome":"accepted"}},
  {"name":"wrong-id","fixture":"wrong.json","expect":{"outcome":"rejected","assertion":"task_id_mismatch"}}
]}
Fixture paths are relative to the manifest; all cases validate before execution.
The absolute fixture path is appended to checker argv. stdout must be one JSON object:
  exit 0: {"outcome":"accepted"}
  exit 1: {"outcome":"rejected","assertion":"task_id_mismatch"}
  exit 2: {"outcome":"invalid","message":"setup/parse failure"}
Optional message is diagnostic, never the negative-test oracle. Crashes, malformed
output, wrong assertion, signal termination or exit/outcome mismatch fail the case.
At least one accepted and one rejected case are required. check exits 0 only if all
cases match, 1 for failed checks, 2 for invalid invocation. It never declares product PASS.
run preserves child exit codes, maps signals to 128+signal, and uses 125 for launch errors.
Start records without result.json are incomplete; process exit is not process-tree proof.
`;

async function main() {
  const args = process.argv.slice(2);
  const action = args.shift();
  if (!action || action === '--help' || action === '-h') {
    console.log(help);
    return;
  }
  const definitions = {
    'check-config': { config: { type: 'string' }, amp: { type: 'string' } },
    init: { config: { type: 'string' }, amp: { type: 'string' }, root: { type: 'string' } },
    run: { task: { type: 'string' }, name: { type: 'string' }, cwd: { type: 'string' }, fingerprint: { type: 'string', multiple: true } },
    check: { task: { type: 'string' }, cases: { type: 'string' }, cwd: { type: 'string' } },
  };
  if (!Object.hasOwn(definitions, action)) throw new Error(`Unknown command: ${action}`);
  const separator = args.indexOf('--');
  const ownArgs = separator < 0 ? args : args.slice(0, separator);
  const command = separator < 0 ? [] : args.slice(separator + 1);
  const { values, positionals } = parseArgs({
    args: ownArgs,
    options: { ...definitions[action], help: { type: 'boolean', short: 'h' } },
    allowPositionals: true,
    strict: true,
  });
  if (values.help) { console.log(help); return; }
  if (positionals.length) throw new Error('Unexpected positional arguments; command argv must follow --');
  let result;
  if (action === 'init' || action === 'check-config') {
    if (separator >= 0) throw new Error(`${action} does not accept a child command`);
    const { checkConfig, initialize } = await import('./configuration.mjs');
    result = action === 'init'
      ? await initialize(values.config, { amp: values.amp, root: values.root })
      : await checkConfig(values.config, { amp: values.amp });
  } else {
    if (!values.task || !command.length) throw new Error(`${action} requires --task and a command after --`);
    if (action === 'run') {
      if (!values.name) throw new Error('run requires --name');
      const { capture, exitCode } = await import('./evidence.mjs');
      result = await capture(command, {
        task: path.resolve(values.task), name: values.name, cwd: values.cwd,
        fingerprints: values.fingerprint || [],
      });
      process.exitCode = exitCode(result);
    } else {
      if (!values.cases) throw new Error('check requires --cases');
      const { checkCases } = await import('./checker.mjs');
      result = await checkCases(path.resolve(values.cases), command, { task: path.resolve(values.task), cwd: values.cwd });
      process.exitCode = result.ok ? 0 : 1;
    }
  }
  console.log(JSON.stringify(result, null, 2));
}

main().catch(error => {
  console.error(JSON.stringify({ ok: false, error: error.message }));
  process.exitCode = 2;
});
