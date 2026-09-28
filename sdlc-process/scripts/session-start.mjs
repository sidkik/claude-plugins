#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entry = resolve(root, 'bundle/.claude/skills/sdlc-process/SKILL.md');
const adapter = resolve(root, 'SOURCE-ADAPTER.md');
let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); }
catch { /* Missing host input uses the actual process cwd, not guessed repository state. */ }
let location = resolve(typeof input.cwd === 'string' ? input.cwd : process.cwd());
let enabled = false;
while (true) {
  for (const name of ['AGENTS.md', 'CLAUDE.md', 'GROK.md']) {
    const instruction = join(location, name);
    if (existsSync(instruction) && readFileSync(instruction, 'utf8').includes('<!-- sidkik-sdlc:begin -->')) enabled = true;
  }
  const parent = dirname(location);
  if (enabled || parent === location) break;
  location = parent;
}
if (!existsSync(entry) || !existsSync(adapter)) {
  process.stderr.write('SDLC process installation is incomplete: run setup doctor/update.\n');
  process.exitCode = 1;
} else {
  const context = enabled
    ? `For governed work, first run node \"$HOME/.local/share/sidkik/setup/setup.mjs\" entry --repo . from the actual working directory. If entry fails, report its exact pending-update, drift or capability gap and hold dependent SDLC actions. After successful entry, read ${JSON.stringify(adapter)} and the current process and orchestrator source paths returned by that command before route selection or investigation. Follow the linked orchestrator dependency and applicable SDLC steps. Resolve work from the actual working repository; this plugin directory is only the instruction source. Load the available sdlc-status skill and update its real session state at the prescribed events. Report a missing dependency for its affected action. This instruction does not claim that any skill has already been loaded or any criterion passed.`
    : 'The SDLC process plugin is available. This working directory has no managed SDLC opt-in; follow its actual repository instructions. Installing this plugin alone does not assign Sidkik process policy to unrelated repositories.';
  process.stdout.write(JSON.stringify({hookSpecificOutput: {
    hookEventName: 'SessionStart', additionalContext: context
  }}) + '\n');
}
