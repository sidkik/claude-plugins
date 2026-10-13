#!/usr/bin/env node
// Prepare fixed native cases only. This script never launches a model.
import { mkdirSync, writeFileSync, existsSync, cpSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { template } from '../scripts/stages.mjs';

const root = resolve(process.argv[2] || '');
if (!process.argv[2] || existsSync(root)) throw Error('provide a new disposable fixture directory');
const statusRoot = fileURLToPath(new URL('../', import.meta.url));
const planning = resolve(process.argv[3] || fileURLToPath(new URL('../../../planning/', import.meta.url)));
if (!existsSync(join(planning, '.claude/skills/sdlc-process/SKILL.md'))) throw Error('candidate planning checkout missing');
const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const quote = value => "'" + value.replaceAll("'", "'\\''") + "'";
const fake = `---
name: fake-board
description: Synthetic board skill for native board delegation acceptance only.
---

Read this full source. Accept the unchanged JSON event from the caller. Return
BOARD_NATIVE_FIXTURE followed by that exact JSON. This token appears only here.
For stage-change or stage-finish, report a simulated mapping handled by this skill;
make no external writes. For next-work, return the synthetic candidate
https://github.com/example/delivery/issues/18 with ordering evidence "fixture
order only; real GitHub availability, blockers and claims unknown". Selection
does not authorize start. Never access GitHub, real boards or credentials.
`;
for (const client of ['claude', 'codex']) {
  const clientRoot = join(root, client);
  mkdirSync(clientRoot, { recursive: true });
  for (const [name, config] of [['configured', 'fake-board'], ['no-skill', ''], ['unavailable', 'no-such-board']]) {
    const repo = join(clientRoot, name);
    // Preserve source-relative references in a local project skill tree. Native
    // status input resolves to the candidate source itself, with its README and
    // runtime at the same relative locations as in the status plugin.
    for (const directory of ['.agents/skills', '.claude/skills', 'docs/agents', 'docs/work/agent-orchestration'])
      cpSync(join(planning, directory), join(repo, directory), { recursive: true });
    mkdirSync(join(repo, '.claude/agents'), { recursive: true });
    cpSync(join(planning, '.claude/agents/sdlc-policy-reviewer.md'), join(repo, '.claude/agents/sdlc-policy-reviewer.md'));
    const nativeRoot = join(repo, client === 'claude' ? '.claude' : '.agents');
    if (client === 'codex')
      for (const entry of readdirSync(join(planning, '.claude/skills')))
        cpSync(join(planning, '.claude/skills', entry), join(nativeRoot, 'skills', entry), { recursive: true });
    for (const directory of ['skills', 'scripts', 'templates'])
      cpSync(join(statusRoot, directory), join(nativeRoot, directory), { recursive: true });
    cpSync(join(statusRoot, 'README.md'), join(nativeRoot, 'README.md'));
    const cli = join(nativeRoot, 'scripts/status.mjs');
    const statusSkill = join(nativeRoot, 'skills/sdlc-status/SKILL.md');
    const processSkill = join(nativeRoot, 'skills/sdlc-process/SKILL.md');
    writeFileSync(join(repo, 'candidate-skills.json'), JSON.stringify({
      'sdlc-status': { path: statusSkill, sha256: digest(statusSkill), source: join(statusRoot, 'skills/sdlc-status/SKILL.md') },
      'sdlc-process': { path: processSkill, sha256: digest(processSkill), source: join(planning, '.claude/skills/sdlc-process/SKILL.md') },
    }, null, 2) + '\n');
    const instructions = `This is a synthetic board acceptance repository, owned by this delivery checkout.\n` +
      `For ordinary work and next-work requests, natively load the project skill sdlc-process first and follow its directed candidate sources.\n` +
      `Project skills here are the candidate revision; use their bare native names. Installed older plugin skills do not satisfy candidate acceptance.\n` +
      `No GitHub, real board or credential access; synthetic ordering evidence is limited to the fake board skill. No actual start, readiness advancement or publication.\n`;
    writeFileSync(join(repo, 'AGENTS.md'), instructions);
    writeFileSync(join(repo, 'CLAUDE.md'), instructions);
    writeFileSync(join(repo, 'docs/agents/issue-tracker.md'), `---\nboard_skill: ${config}\n---\n# Synthetic delivery tracker\n`);
    if (name === 'configured') {
      const skillDir = join(repo, client === 'claude' ? '.claude' : '.agents', 'skills/fake-board');
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(join(skillDir, 'SKILL.md'), fake);
    }
    const state = template('delivery');
    state.work = 'https://github.com/example/delivery/issues/17';
    state.progress.evidenceRevision = 'board-native-fixture-v1';
    writeFileSync(join(repo, 'initial.json'), JSON.stringify(state, null, 2) + '\n');
    writeFileSync(join(repo, 'change.json'), '{"changed":{"progress":{"active":"RS"}}}\n');
    writeFileSync(join(repo, 'advance.json'), '{"changed":{"progress":{"active":"DE"}},"finished":{"stage":"RS","outcome":"ready assessed; start not authorized"}}\n');
    writeFileSync(join(repo, 'finish.json'), '{"finished":{"stage":"RS","outcome":"ready assessed; start not authorized"}}\n');
    const command = (verb, input) => `cd ${quote(join(clientRoot, 'other-cwd'))} && SDLC_STATUS_DIR=${quote(join(repo, 'state'))} SDLC_STATUS_SESSION='' node ${quote(cli)} ${verb} --delivery-repo ${quote(repo)}` +
      (verb === 'next-work' ? '' : ` --client ${client} --session board-native`) + (input ? ` < ${quote(join(repo, input))}` : '');
    const commands = [command('write', 'initial.json'), command('write', 'initial.json'), command('record', 'change.json'), command('record', 'advance.json'), command('record', 'advance.json'), command('record', 'finish.json'), command('next-work')];
    writeFileSync(join(repo, 'commands.txt'), commands.join('\n') + '\n');
    writeFileSync(join(repo, 'next-work-prompt.txt'), "What's up next? Please check GitHub for the next work item. Keep this read-only.\n");
    writeFileSync(join(repo, 'prompt.txt'), `This is an authorized synthetic acceptance run, not real work advancement. No GitHub or board writes.\n` +
      `Natively load the local candidate project skill sdlc-status (bare name, exact resolved path ${statusSkill}); read its full source and directed candidate references. A call to an older installed status plugin followed by reading this candidate fails acceptance.\n` +
      `Run the following commands in order. Follow the loaded status skill for each emitted board request; do not manually invent requests.\n${commands.join('\n')}\n` +
      `Report native call/result evidence, exact event inputs, unchanged/no-skill controls and gaps. Continue after an unavailable board skill and print CONTINUED_AUTHORIZED_FIXTURE.\n`);
    const launch = client === 'claude'
      ? 'claude -p --model claude-sonnet-5-5 --output-format stream-json --verbose'
      : 'crew-codex task --background --model gpt-6.1-sol --effort low';
    writeFileSync(join(repo, 'native-commands.txt'),
      `cd ${quote(repo)} && ${launch}${client === 'codex' ? ' --write --skill sdlc-status' : ''} "$(cat prompt.txt)"\n` +
      `cd ${quote(repo)} && ${launch}${client === 'codex' ? ' --skill sdlc-process' : ''} "$(cat next-work-prompt.txt)"\n`);
  }
  const decoy = join(clientRoot, 'other-cwd');
  mkdirSync(join(decoy, 'docs/agents'), { recursive: true });
  writeFileSync(join(decoy, 'docs/agents/issue-tracker.md'), '---\nboard_skill: wrong-board\n---\n');
}
console.log(root);
