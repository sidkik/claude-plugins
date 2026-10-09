#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const NAMES = ['sdlc-process', 'sdlc-status', 'grok-crew', 'codex-crew'];
const CLIENTS = ['claude', 'codex', 'grok'];
const BEGIN = '<!-- sidkik-sdlc:begin -->';
const END = '<!-- sidkik-sdlc:end -->';
const here = path.dirname(fileURLToPath(import.meta.url));
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
export const shellQuote = value => "'" + value.replaceAll("'", "'\\''") + "'";
function commandWords(command) {
  if (typeof command !== 'string') return null;
  const atom = String.raw`(?:"([^"\\\`$]*)"|'([^']*)'|([^\s"'|&;<>\`$()\\]+))`;
  const match = command.match(new RegExp(`^[ \\t]*${atom}[ \\t]+${atom}[ \\t]+${atom}[ \\t]*$`));
  return match ? [match[1] ?? match[2] ?? match[3], match[4] ?? match[5] ?? match[6], match[7] ?? match[8] ?? match[9]] : null;
}
function isManagedSdlcWrapper(command, root) {
  const words = commandWords(command);
  if (!words || words.length !== 3 || path.basename(words[0]) !== 'node' || words[2] !== 'claude') return false;
  const script = path.resolve(words[1]).replaceAll('\\', '/');
  return ['setup','native-setup'].some(folder => script === path.resolve(root,folder,'status.mjs').replaceAll('\\', '/'));
}
export function isDirectSdlcStatus(command, root) {
  const words = commandWords(command);
  if (!words || words.length !== 3 || path.basename(words[0]) !== 'node' || words[2] !== 'claude') return false;
  const script = path.resolve(words[1]).replaceAll('\\', '/');
  return isManagedSdlcWrapper(command, root) || /\/sdlc-status(?:\/[^/]+)*\/scripts\/status\.mjs$/.test(script);
}
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const read = file => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
export function put(file, value) {
  if (read(file) === value) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = file + `.setup-${process.pid}`;
  fs.writeFileSync(temporary, value, { mode: 0o600 });
  fs.renameSync(temporary, file);
}
function walk(root, relative = '') {
  return fs.readdirSync(path.join(root, relative), { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name)).flatMap(item => {
    const name = path.join(relative, item.name);
    if (item.isSymbolicLink()) throw new Error(`Refusing package symlink: ${path.join(root, name)}`);
    if (item.isDirectory()) return walk(root, name);
    return [name];
  });
}
function treeHash(root) {
  return hash(walk(root).map(name => `${name}\0${hash(fs.readFileSync(path.join(root, name)))}`).join('\n'));
}
export function entryBlock() {
  return `${BEGIN}\n## Required Sidkik SDLC entry\n\nBefore new work, continuation or review, run:\n\n\`\`\`sh\nnode "$HOME/.local/share/sidkik/setup/setup.mjs" entry --repo .\n\`\`\`\n\nRead the returned SDLC skill source and its required orchestrator dependency before choosing an action. Apply its route and completion criteria. If entry fails, report the exact capability gap and pause dependent work. This explicitly enabled bundle is authoritative for shared SDLC process, orchestrator, policy review and work-artifacts; it supersedes repository-local distributed snapshots of those shared instructions. Repository engineering instructions remain applicable.\n${END}`;
}
export function mergeEntry(original) {
  const start = original.indexOf(BEGIN), end = original.indexOf(END);
  if ((start < 0) !== (end < 0) || (start >= 0 && end < start) || original.indexOf(BEGIN, start + 1) >= 0) throw new Error('Malformed or duplicate Sidkik entry block; repair it before setup');
  if (start >= 0) return original.slice(0, start) + entryBlock() + original.slice(end + END.length);
  return original + (original.endsWith('\n') || !original ? '\n' : '\n\n') + entryBlock() + '\n';
}
export function run(command, args, { dryRun = false, capture = false, cwd } = {}) {
  if (dryRun) { console.log(`[dry-run] ${[command,...args].map(shellQuote).join(' ')}`); return ''; }
  const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout:120000, cwd });
  if (result.error || result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed: ${result.error?.message || result.stderr?.trim() || `exit ${result.status}`}`);
  if (!capture && result.stdout?.trim()) console.log(result.stdout.trim());
  return result.stdout;
}
const PLATFORMS = ['linux', 'darwin'];
export function assertPlatform(platform = process.platform) {
  if (!PLATFORMS.includes(platform)) throw new Error(`This setup supports Linux/WSL and macOS; ${platform} is not qualified.`);
}
// codex-crew's crew-codex (installed for Claude) uses mapfile, `timeout N tail --pid`, `patch --suffix` and `readlink -f`.
const CREW_CAPABILITIES = {
  bash: ['bash 4+', ['-c','echo "${BASH_VERSINFO[0]}.${BASH_VERSINFO[1]}"'], out => parseInt(out, 10) >= 4],
  timeout: ['GNU coreutils timeout', ['--version'], () => true],
  tail: ['GNU coreutils tail (--pid)', ['--version'], out => out.includes('GNU coreutils')],
  patch: ['GNU patch (--suffix)', ['--version'], out => out.includes('GNU patch')],
  readlink: ['readlink -f', ['-f','/'], () => true],
};
export const CREW_TOOLS = Object.keys(CREW_CAPABILITIES);
const BREW_REMEDIATION = '. On macOS: brew install bash coreutils gpatch, then put "$(brew --prefix)/bin", "$(brew --prefix)/opt/coreutils/libexec/gnubin" and "$(brew --prefix)/opt/gpatch/libexec/gnubin" ahead of /usr/bin and /bin on PATH, including the PATH GUI-launched clients see';
export function crewCapability(name, { platform = process.platform, env = process.env, cwd } = {}) {
  const [capability, args, accept] = CREW_CAPABILITIES[name];
  const result = spawnSync(name, args, { encoding: 'utf8', timeout: 15000, env, cwd });
  const stdout = result.stdout || '';
  if (!result.error && result.status === 0 && accept(stdout)) return;
  const found = result.error ? (result.error.code === 'ENOENT' ? 'none on PATH' : result.error.message) : name === 'bash' && result.status === 0 ? stdout.trim() || 'unknown version' : `${stdout}${result.stderr || ''}`.trim().split('\n')[0] || `exit ${result.status}`;
  throw new Error(`${capability} required by codex-crew (found ${found})${platform === 'darwin' ? BREW_REMEDIATION : ''}`);
}
function parse(argv) {
  const options = { command: argv.shift() || 'help', clients: ['claude'], dryRun: false, source: path.resolve(here, '../..') };
  while (argv.length) {
    const flag = argv.shift();
    if (flag === '--dry-run') options.dryRun = true;
    else if (['--clients','--source','--repo'].includes(flag)) {
      const value = argv.shift();
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
      if (flag === '--clients') options.clients = [...new Set(value.split(','))];
      else options[flag.slice(2)] = path.resolve(value);
    } else throw new Error(`Unknown option ${flag}`);
  }
  if (options.clients.some(c => !CLIENTS.includes(c))) throw new Error('Clients must be claude,codex,grok');
  return options;
}
const clientFiles = clients => [...new Set(clients.flatMap(c => c === 'claude' ? ['CLAUDE.md'] : c === 'grok' ? ['GROK.md','AGENTS.md'] : ['AGENTS.md']))];
function repoConflicts(repo, bundle) {
  const dir = path.join(bundle, '.claude/skills');
  const conflicts = [];
  if (!fs.existsSync(dir)) throw new Error(`Missing bundled skills: ${dir}`);
  for (const name of fs.readdirSync(dir)) {
    for (const family of ['.claude', '.codex']) {
      const local = path.join(repo, family, 'skills', name, 'SKILL.md');
      const bundled = path.join(dir, name, 'SKILL.md');
      if (fs.existsSync(local) && fs.existsSync(bundled) && hash(read(local)) !== hash(read(bundled))) conflicts.push(local);
    }
  }
  if (conflicts.length) console.error(`NOTICE: stale repo-local shared SDLC snapshots are superseded by the opted-in managed bundle: ${conflicts.join(', ')}. Repository-specific engineering remains applicable.`);
}
export function required(client) { return client === 'claude' ? [...NAMES, 'codex'] : client === 'codex' ? NAMES.slice(0,3) : NAMES.slice(0,2); }
export function claudePlugins(command, marketplace, dryRun, native = false) {
  const markets = JSON.parse(run('claude', ['plugin','marketplace','list','--json'], { capture: true, cwd:os.homedir() }));
  for (const [name, source] of [['sidkik-plugins', marketplace], ['openai-codex','openai/codex-plugin-cc']]) {
    const existing = markets.find(m => m.name === name);
    if (!existing) run('claude', ['plugin','marketplace','add',source], { dryRun, cwd:os.homedir() });
    else if (!native && name === 'sidkik-plugins' && path.resolve(existing.path || existing.installLocation) !== marketplace) throw new Error(`Marketplace sidkik-plugins already points to ${existing.path || existing.installLocation}; remove/re-register it explicitly to ${marketplace} before setup.`);
    else if (command === 'update') run('claude', ['plugin','marketplace','update',name], { dryRun, cwd:os.homedir() });
  }
  const installed = JSON.parse(run('claude',['plugin','list','--json'], { capture: true, cwd:os.homedir() }));
  for (const name of required('claude')) {
    const id = `${name}@${name === 'codex' ? 'openai-codex' : 'sidkik-plugins'}`;
    const current = installed.find(p => p.id === id && p.scope === 'user');
    if (!current || command === 'update') run('claude',['plugin', current ? 'update' : 'install',id,'--scope','user','--json'], { dryRun, cwd:os.homedir() });
    const actual = dryRun ? current : JSON.parse(run('claude',['plugin','list','--json'],{capture:true,cwd:os.homedir()})).find(p => p.id === id && p.scope === 'user');
    if (!actual?.enabled) run('claude',['plugin','enable',id,'--scope','user','--json'], { dryRun, cwd:os.homedir() });
  }
}
export function codexPlugins(command, marketplace, dryRun, native = false) {
  const { marketplaces = [] } = JSON.parse(run('codex',['plugin','marketplace','list','--json'], { capture: true }));
  const existing = marketplaces.find(m => m.name === 'sidkik-plugins');
  if (!existing) run('codex',['plugin','marketplace','add',marketplace,'--json'], { dryRun });
  else if (!native && path.resolve(existing.root) !== marketplace) throw new Error(`Codex marketplace sidkik-plugins points to another checkout: ${existing.root}`);
  const { installed = [] } = JSON.parse(run('codex',['plugin','list','--json'], { capture: true }));
  for (const name of required('codex')) {
    const id = `${name}@sidkik-plugins`;
    if (command === 'update' || !installed.some(p => p.pluginId === id && p.enabled)) run('codex',['plugin','add',id,'--json'], { dryRun });
  }
}
function grokPlugins(command, marketplace, dryRun) {
  const installed = JSON.parse(run('grok',['plugin','list','--json'], { capture: true }));
  for (const name of required('grok')) {
    const current = installed.find(p => p.name === name);
    if (current && path.resolve(current.source || '') !== path.join(marketplace,name)) throw new Error(`Grok ${name} has another source: ${current.source}; explicitly migrate it first.`);
    if (!current) run('grok',['plugin','install',path.join(marketplace,name),'--trust'], { dryRun });
    else if (command === 'update') run('grok',['plugin','update',name], { dryRun });
    run('grok',['plugin','enable',name], { dryRun });
  }
}
export function configureClaude(root, dryRun, runtimeFolder = 'setup') {
  const config = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'settings.json');
  const settings = fs.existsSync(config) ? json(config) : {};
  if (!settings || Array.isArray(settings) || typeof settings !== 'object') throw new Error('Claude settings must be a JSON object');
  if (settings.env !== undefined && (!settings.env || Array.isArray(settings.env) || typeof settings.env !== 'object')) throw new Error('Claude settings.env must be an object');
  settings.env = {...(settings.env || {}), CLAUDE_CODE_EXPERIMENTAL_OBSERVER_AGENTS:'1'};
  const command = `node ${shellQuote(path.join(root,runtimeFolder,'status.mjs'))} claude`;
  const previousFile = path.join(root,'previous-status.json');
  let previous = fs.existsSync(previousFile) ? json(previousFile) : {};
  if (!dryRun && isDirectSdlcStatus(previous.claude?.command, root)) {
    previous = {...previous, claude:null};
    put(previousFile, JSON.stringify(previous,null,2)+'\n');
  }
  if (settings.statusLine?.command !== command) {
    if (settings.statusLine && settings.statusLine.type !== 'command') throw new Error('Unsupported existing Claude statusLine type; retain it and resolve composition explicitly');
    if (!dryRun && !isManagedSdlcWrapper(settings.statusLine?.command, root)) {
      const predecessor = isDirectSdlcStatus(settings.statusLine?.command, root) ? null : settings.statusLine || null;
      put(previousFile, JSON.stringify({...previous, claude:predecessor},null,2)+'\n');
    }
    settings.statusLine = { type:'command', command, refreshInterval:30 };
  }
  if (!dryRun) put(config, JSON.stringify(settings,null,2)+'\n');
}
export function configureGrok(root, dryRun, runtimeFolder = 'setup') {
  const config = path.join(process.env.GROK_HOME || path.join(os.homedir(),'.grok'), 'config.toml');
  let original = read(config);
  const marker = '# sidkik-sdlc status';
  if (/^\[ui\.status_line\]/m.test(original) && !original.includes(marker)) {
    const section = original.match(/^\[ui\.status_line\]\s*\n([\s\S]*?)(?=^\[|(?![\s\S]))/m);
    if (!section) throw new Error('Cannot parse existing Grok status line; preserve it and compose manually');
    const type = section[1].match(/^type\s*=\s*["']command["']\s*$/m);
    const command = section[1].match(/^command\s*=\s*("(?:[^"\\]|\\.)*"|'[^'\n]*')\s*$/m);
    if (!type || !command) throw new Error('Existing Grok status line uses unsupported TOML syntax; retain it and compose manually');
    const value = command[1].startsWith('"') ? JSON.parse(command[1]) : command[1].slice(1,-1);
    if (!dryRun) { const file = path.join(root,'previous-status.json'); const saved = fs.existsSync(file) ? json(file) : {}; put(file,JSON.stringify({...saved,grok:{type:'command',command:value}},null,2)+'\n'); }
    original = original.replace(section[0], '');
  }
  const command = `node ${shellQuote(path.join(root,runtimeFolder,'status.mjs'))} grok`;
  const block = `${marker}\n[ui.status_line]\ntype = "command"\ncommand = ${JSON.stringify(command)}\nrefresh_interval = 30\n# end sidkik-sdlc status`;
  const next = original.includes(marker) ? original.replace(/# sidkik-sdlc status\n[\s\S]*?# end sidkik-sdlc status/, block) : original + '\n' + block + '\n';
  if (!dryRun) put(config,next);
}
function verifyReceipt(root, receipt) {
  if (fs.existsSync(path.join(root,'setup-pending.json'))) throw new Error('A setup/update did not finish; rerun update from the trusted checkout before SDLC work');
  if (treeHash(path.join(root,'marketplace')) !== receipt.packageHash) throw new Error('Managed plugin files drifted; run update from the trusted checkout');
  if (treeHash(path.join(root,'setup')) !== receipt.runtimeHash) throw new Error('Managed setup/status runtime drifted; run update from the trusted checkout');
}
function verifyConfiguration(root, clients) {
  if (clients.includes('claude')) {
    const config = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(),'.claude'),'settings.json');
    if (json(config).statusLine?.command !== `node ${shellQuote(path.join(root,'setup/status.mjs'))} claude`) throw new Error('Claude status line is missing or drifted; rerun install');
  }
  if (clients.includes('grok')) {
    const config = path.join(process.env.GROK_HOME || path.join(os.homedir(),'.grok'),'config.toml');
    const command = `command = ${JSON.stringify(`node ${shellQuote(path.join(root,'setup/status.mjs'))} grok`)}`;
    if (!read(config).includes(command)) throw new Error('Grok status line is missing or drifted; rerun install');
  }
}
function verifyPayload(source, installed) {
  if (!installed || !fs.existsSync(installed)) throw new Error(`Cannot verify native plugin cache: ${installed || 'path unavailable'}`);
  const expectedFiles = walk(source);
  const actualFiles = walk(installed);
  const extra = actualFiles.filter(file => !expectedFiles.includes(file));
  if (extra.length) throw new Error(`Unexpected native plugin payload files: ${extra.join(', ')}. Cleanly reinstall the named plugin before proceeding.`);
  for (const file of expectedFiles) {
    const target = path.join(installed,file);
    if (!fs.existsSync(target) || hash(fs.readFileSync(target)) !== hash(fs.readFileSync(path.join(source,file)))) throw new Error(`Native plugin cache differs from release: ${target}. Publish a bumped plugin version and run update; metadata alone is insufficient.`);
  }
}
function verifyPlugins(clients, source, cwd = source) {
  for (const client of clients) {
    const result = JSON.parse(run(client,['plugin','list','--json'], { capture: true, cwd }));
    const list = client === 'codex' ? result.installed : result;
    for (const name of required(client)) {
      const found = list.find(p => (p.name === name || p.id === `${name}@${name === 'codex' ? 'openai-codex' : 'sidkik-plugins'}` || p.pluginId === `${name}@sidkik-plugins`) && (client !== 'claude' || p.scope === 'user'));
      if (!found || found.enabled === false || found.status === 'disabled') throw new Error(`${client}: required plugin ${name} missing or disabled in ${cwd}; resolve the explicit repository/client settings conflict before continuing`);
      if (name !== 'codex') {
        const expected = json(path.join(source,name,client === 'codex' ? '.codex-plugin/plugin.json' : '.claude-plugin/plugin.json')).version;
        if (found.version !== expected) throw new Error(`${client}: ${name} version ${found.version}, expected ${expected}`);
        const installed = client === 'claude' ? found.installPath : client === 'grok' ? found.path : path.join(process.env.CODEX_HOME || path.join(os.homedir(),'.codex'),'plugins/cache/sidkik-plugins',name,found.version);
        verifyPayload(path.join(source,name), installed);
      }
    }
  }
}
export function main(argv = process.argv.slice(2)) {
  const options = parse([...argv]);
  const root = path.join(os.homedir(), '.local/share/sidkik');
  const receiptFile = path.join(root,'setup-receipt.json');
  const marketplace = path.join(root,'marketplace');
  if (options.command === 'help' || options.command === '--help') { console.log('node tools/setup/setup.mjs install|update|doctor [--clients claude,codex,grok] [--repo PATH] [--source PATH] [--dry-run]\nentry --repo PATH prints required skill locations for an enabled repository. Fixed install root: $HOME/.local/share/sidkik.'); return; }
  if (options.command === 'entry') {
    const receipt = json(receiptFile);
    const requested = fs.realpathSync(options.repo || process.cwd());
    const repo = receipt.repositories.filter(r => requested === r || requested.startsWith(r + path.sep)).sort((a,b) => b.length-a.length)[0];
    if (!repo) throw new Error('Repository is not enabled; run setup install --repo PATH first.');
    verifyReceipt(root, receipt);
    repoConflicts(repo, path.join(marketplace,'sdlc-process/bundle'));
    console.log(`Required process: ${path.join(marketplace,'sdlc-process/bundle/.claude/skills/sdlc-process/SKILL.md')}\nRequired orchestrator: ${path.join(marketplace,'sdlc-process/bundle/.claude/skills/orchestrator/SKILL.md')}\nStatus skill: ${path.join(marketplace,'sdlc-status/skills/sdlc-status/SKILL.md')}\nGrok delegation skill: ${path.join(marketplace,'grok-crew/skills/grok-crew-runtime/SKILL.md')}`);
    return;
  }
  if (!['install','update','doctor'].includes(options.command)) throw new Error(`Unknown command ${options.command}`);
  if (Number(process.versions.node.split('.')[0]) < 18) throw new Error('Node.js 18 or newer is required');
  const previous = fs.existsSync(receiptFile) ? json(receiptFile) : null;
  assertPlatform();
  if (['doctor','update'].includes(options.command) && previous && !argv.includes('--clients')) options.clients = previous.clients;
  // Claude installs codex-crew, whose runtime needs python3 and the GNU-capable CREW_TOOLS.
  const dependencies = new Set(['git','gh',...options.clients, ...(options.clients.includes('claude') ? ['codex','grok','python3',...CREW_TOOLS] : options.clients.includes('codex') ? ['grok'] : [])]);
  for (const dependency of dependencies) CREW_TOOLS.includes(dependency) ? crewCapability(dependency) : run(dependency,['--version'], { capture:true });
  if (options.command === 'doctor') {
    if (!previous) throw new Error('No setup receipt; run install first');
    verifyReceipt(root, previous);
    verifyConfiguration(root, options.clients);
    verifyPlugins(options.clients,marketplace);
    for (const repo of options.repo ? [fs.realpathSync(options.repo)] : previous.repositories) {
      repoConflicts(repo,path.join(marketplace,'sdlc-process/bundle'));
      verifyPlugins((previous.repositoryClients?.[repo] || previous.clients).filter(c => options.clients.includes(c)),marketplace,repo);
      for (const file of clientFiles((previous.repositoryClients?.[repo] || previous.clients).filter(c => options.clients.includes(c)))) if (!read(path.join(repo,file)).includes(entryBlock())) throw new Error(`Missing/drifted repository entry: ${path.join(repo,file)}`);
    }
    if (options.clients.includes('claude')) {
      let auth;
      try { auth = JSON.parse(run('claude',['auth','status','--json'], { capture:true })); }
      catch (error) { throw new Error(`Claude authentication could not be verified; run claude auth login. ${error.message}`); }
      if (!auth.loggedIn) throw new Error('Claude is not authenticated; run claude auth login');
    }
    try { run('gh',['auth','status'], { capture:true }); } catch (error) { throw new Error(`GitHub authentication could not be verified; run gh auth login. ${error.message}`); }
    if (options.clients.includes('codex') || options.clients.includes('claude')) {
      try { run('codex',['login','status'], { capture:true }); } catch (error) { throw new Error(`Codex authentication could not be verified; run codex login. ${error.message}`); }
    }
    console.log('PASS: installed versions, managed files and repository entries match. Grok authentication requires grok login; doctor does not read credentials or claim a live model call. Restart clients after updates.');
    return;
  }
  const source = !argv.includes('--source') && here === path.join(root,'setup') && previous?.source ? previous.source : options.source;
  const sourceRuntime = path.join(source,'tools/setup/setup.mjs');
  if (here === path.join(root,'setup') && sourceRuntime !== path.join(here,'setup.mjs')) {
    if (!fs.existsSync(sourceRuntime)) throw new Error(`Release checkout unavailable: ${sourceRuntime}; pass --source with its current location`);
    const result = spawnSync(process.execPath,[sourceRuntime,...argv,'--source',source],{stdio:'inherit'});
    if (result.error || result.status !== 0) throw new Error(`Release setup failed: ${result.error?.message || `exit ${result.status}`}`);
    return;
  }
  for (const file of ['setup.mjs','status.mjs']) if (!fs.existsSync(path.join(source,'tools/setup',file))) throw new Error(`Missing release setup runtime: ${file}`);
  for (const name of NAMES) {
    const file = path.join(source,name,'.claude-plugin/plugin.json');
    if (!fs.existsSync(file)) throw new Error(`Missing release plugin ${file}`);
    walk(path.join(source,name));
  }
  if (!fs.existsSync(path.join(source,'sdlc-process/bundle/source-manifest.json'))) throw new Error('Missing bundled source manifest; build the process bundle first');
  const repo = options.repo ? fs.realpathSync(options.repo) : null;
  const repositories = [...new Set([...(options.command === 'update' ? previous?.repositories || [] : []),...(repo ? [repo] : [])])];
  const repositoryClients = {...previous?.repositoryClients,...(repo ? {[repo]:[...new Set([...(previous?.repositoryClients?.[repo] || []),...options.clients])].sort()} : {})};
  for (const target of repositories) {
    if (!fs.existsSync(target)) throw new Error(`Enabled repository is unavailable: ${target}; restore its checkout before updating its managed entry`);
    repoConflicts(target,path.join(source,'sdlc-process/bundle'));
    for (const file of clientFiles(repositoryClients[target] || previous?.clients || options.clients)) mergeEntry(read(path.join(target,file)));
  }
  if (!options.dryRun) {
    fs.mkdirSync(root,{recursive:true});
    for (const client of options.clients) {
      const directory = client === 'claude' ? process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(),'.claude') : client === 'codex' ? process.env.CODEX_HOME || path.join(os.homedir(),'.codex') : process.env.GROK_HOME || path.join(os.homedir(),'.grok');
      fs.mkdirSync(directory,{recursive:true});
    }
    put(path.join(root,'setup-pending.json'), JSON.stringify({operation:options.command}));
    const staging = path.join(root, `marketplace-staging-${process.pid}`);
    fs.mkdirSync(staging,{recursive:true});
    try {
      for (const name of NAMES) fs.cpSync(path.join(source,name),path.join(staging,name),{recursive:true});
      for (const file of ['.claude-plugin/marketplace.json','.agents/plugins/marketplace.json']) {
        const target = path.join(staging,file); fs.mkdirSync(path.dirname(target),{recursive:true}); fs.copyFileSync(path.join(source,file),target);
      }
      fs.rmSync(marketplace,{recursive:true,force:true}); fs.renameSync(staging,marketplace);
    } finally { fs.rmSync(staging,{recursive:true,force:true}); }
    fs.mkdirSync(path.join(root,'setup'),{recursive:true});
    for (const file of ['setup.mjs','status.mjs']) if (path.join(source,'tools/setup',file) !== path.join(root,'setup',file)) fs.copyFileSync(path.join(source,'tools/setup',file),path.join(root,'setup',file));
  } else console.log(`[dry-run] Stage release plugins and runtime into ${root}; merge selected repo entry files and status configuration.`);
  for (const client of options.clients) ({claude:claudePlugins,codex:codexPlugins,grok:grokPlugins})[client](options.command,marketplace,options.dryRun);
  if (options.clients.includes('claude')) configureClaude(root,options.dryRun);
  if (options.clients.includes('grok')) configureGrok(root,options.dryRun);
  if (!options.dryRun) {
    verifyPlugins(options.clients,marketplace);
    for (const target of repositories) verifyPlugins(repositoryClients[target] || previous?.clients || options.clients,marketplace,target);
    for (const target of repositories) for (const file of clientFiles(repositoryClients[target] || previous?.clients || options.clients)) put(path.join(target,file),mergeEntry(read(path.join(target,file))));
    put(receiptFile,JSON.stringify({schema:1,source,clients:[...new Set([...(previous?.clients||[]),...options.clients])].sort(),repositories:[...new Set([...(previous?.repositories||[]),...(repo?[repo]:[])])].sort(),packageHash:treeHash(marketplace),runtimeHash:treeHash(path.join(root,'setup')),repositoryClients},null,2)+'\n');
    fs.rmSync(path.join(root,'setup-pending.json'),{force:true});
    console.log('Setup complete. Restart selected clients. Run doctor; log in with each CLI on this machine. No credentials or conversation history were copied.');
  }
}
function invokedDirectly() {
  try { return Boolean(process.argv[1]) && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url)); } catch { return false; }
}
if (invokedDirectly()) {
  try { main(); } catch (error) { console.error(`Setup failed: ${error.message}`); process.exitCode = 1; }
}
