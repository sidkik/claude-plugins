#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

const CONFIG_PATH = 'docs/agents/pstack-docs.md';
const FENCE = '```json pstack-docs';
export const KINDS = ['research', 'spec', 'plan', 'decision', 'review', 'evidence', 'handoff'];
const ROLES = ['domain-contract', 'domain-docs', 'decision-records', 'architecture', 'tracker', 'runbooks', 'verification', 'evidence-retention', 'index'];
const SINGLE_ROLES = new Set(['domain-contract', 'evidence-retention']);
const STATES = {
  existing: {required: ['type', 'path'], optional: ['note']},
  destination: {required: ['type', 'path'], optional: ['note']},
  external: {required: ['repository', 'path'], optional: ['note']},
  unconfigured: {required: [], optional: ['note']},
};
const SLUG = '[a-z0-9]+(?:-[a-z0-9]+)*';
const SLUG_RE = new RegExp(`^${SLUG}$`);
const TOKENS = new Set(['work-key', 'topic', 'run-id']);
const REPOSITORY_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const POINTER_FILES = ['AGENTS.md', 'CLAUDE.md'];
const POINTER_MARKERS = [CONFIG_PATH, 'sidkik-pstack-documentation:work-artifacts'];
const PLAN_CHECK = 'node <installed PStack plugin root>/skills/poteto-mode/scripts/check-plan.mjs';

class UsageError extends Error {}

const describe = value => JSON.stringify(value);

function pathProblem(value, {tokens = false} = {}) {
  if (typeof value !== 'string' || value === '') return 'must be a non-empty repository-relative path';
  if (value.startsWith('/') || /^[A-Za-z]:/.test(value) || value.startsWith('~')) return 'must be relative to the repository root, not absolute';
  if (value.includes('\\') || value.includes('\0')) return 'must use forward slashes only';
  if (/[*?[\]{}!]/.test(value)) return 'must not contain glob characters; list exact paths';
  for (const segment of value.split('/')) {
    if (segment === '') return 'must not contain empty segments or a trailing slash';
    if (segment === '.' || segment === '..') return 'must not contain "." or ".." segments';
    const found = segment.match(/<[^>]*>/g) ?? [];
    if (!tokens && (found.length || /[<>]/.test(segment))) return 'must be an exact path without <tokens>';
    if (tokens) {
      for (const token of found) if (!TOKENS.has(token.slice(1, -1))) return `uses unknown token ${token}; allowed tokens are <work-key>, <topic> and <run-id>`;
      if (found.length > 1) return 'may contain at most one token per path segment';
      const literal = segment.replace(/<[^>]*>/g, '');
      if (/[<>]/.test(literal)) return 'contains an unbalanced < or >';
      if (!/^[A-Za-z0-9._-]*$/.test(literal)) return `segment ${segment} may use only letters, digits, ".", "_", "-" and tokens; templates are not regular expressions`;
    }
  }
  return null;
}

const inside = (root, candidate) => candidate === root || candidate.startsWith(root + path.sep);

function resolveWithinRoot(root, rel) {
  const segments = rel.split('/');
  let existing = root;
  let depth = 0;
  for (const segment of segments) {
    const next = path.join(existing, segment);
    try {
      fs.lstatSync(next);
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') break;
      return {state: 'unreadable', detail: error.code};
    }
    existing = next;
    depth++;
  }
  let real;
  try {
    real = fs.realpathSync(existing);
  } catch {
    return {state: 'broken-link', via: path.relative(root, existing)};
  }
  if (!inside(root, real)) return {state: 'escape', via: path.relative(root, existing) || '.'};
  const stat = fs.statSync(real);
  if (depth < segments.length) {
    return stat.isDirectory() ? {state: 'missing'} : {state: 'blocked', via: path.relative(root, existing)};
  }
  return {state: stat.isFile() ? 'file' : stat.isDirectory() ? 'directory' : 'other'};
}

const locationCode = found => (found.state === 'escape' || found.state === 'broken-link' ? 'symlink-escape' : 'invalid-path');

function locationProblem(found, rel) {
  switch (found.state) {
    case 'escape': return `resolves outside the repository through ${found.via}`;
    case 'broken-link': return `passes through a broken symbolic link at ${found.via}`;
    case 'blocked': return `cannot exist because ${found.via} is not a directory`;
    case 'unreadable': return `cannot be inspected (${found.detail})`;
    case 'other': return `${rel} is not a regular file or directory`;
    default: return null;
  }
}

export function extractContract(markdown) {
  const lines = markdown.split(/\r?\n/);
  const openings = [];
  lines.forEach((line, index) => {
    if (/^\s*(`{3,}|~{3,})\s*\S*\s*pstack-docs\b/.test(line)) openings.push(index);
  });
  if (openings.length === 0) throw new Error(`no ${FENCE} fence found`);
  if (openings.length > 1) throw new Error(`found ${openings.length} pstack-docs fences (lines ${openings.map(i => i + 1).join(', ')}); keep exactly one`);
  const start = openings[0];
  if (lines[start] !== FENCE) throw new Error(`line ${start + 1} must open the contract with exactly ${FENCE}`);
  const end = lines.findIndex((line, index) => index > start && line === '```');
  if (end < 0) throw new Error(`the fence opened on line ${start + 1} is not closed by a line containing only \`\`\``);
  const text = lines.slice(start + 1, end).join('\n');
  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new Error(`the contract is not valid JSON: ${error.message}`);
  }
  const duplicates = duplicateKeysInParsedJson(text);
  if (duplicates.length) throw new Error(`the contract repeats JSON keys: ${duplicates.join(', ')}`);
  return value;
}

// JSON.parse keeps the last duplicate silently, so scan the already valid text.
function duplicateKeysInParsedJson(text) {
  const duplicates = [];
  const stack = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const top = stack.at(-1);
    if (c === '"') {
      let j = i + 1;
      while (text[j] !== '"') j += text[j] === '\\' ? 2 : 1;
      if (top?.object && top.expectKey) {
        const key = JSON.parse(text.slice(i, j + 1));
        if (top.keys.has(key)) duplicates.push(key);
        top.keys.add(key);
        top.expectKey = false;
      }
      i = j;
    } else if (c === '{') stack.push({object: true, keys: new Set(), expectKey: true});
    else if (c === '[') stack.push({object: false});
    else if (c === '}' || c === ']') stack.pop();
    else if (c === ',' && top?.object) top.expectKey = true;
  }
  return duplicates;
}

const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const segmentPattern = segment => new RegExp(`^${segment.split(/(<[^>]+>)/).map(part => (/^<.+>$/.test(part) ? SLUG : escapeRegExp(part))).join('')}$`);
const fits = (segments, parts) => segments.length === parts.length && segments.every((segment, i) => segment.test(parts[i]));
const reachesBelow = (segments, parts) => parts.length < segments.length && parts.every((part, i) => segments[i].test(part));

function compileTemplate(template) {
  const segments = template.split('/');
  const workIndex = segments.indexOf('<work-key>');
  return {template, workIndex, prefix: segments.slice(0, workIndex).join('/'), tailTemplate: segments.slice(workIndex + 1).join('/'), segments: segments.map(segmentPattern)};
}

function witness(template) {
  return template.replace(/<work-key>/g, 'w').replace(/<topic>/g, 't').replace(/<run-id>/g, 'r').split('/');
}

function placementsFor(rules, works) {
  const placements = [];
  for (const rule of rules) {
    placements.push({rule, segments: rule.segments});
    const tail = rule.segments.slice(rule.workIndex + 1);
    for (const [work, dir] of works) placements.push({rule, work, dir, segments: [...dir.split('/').map(part => new RegExp(`^${escapeRegExp(part)}$`)), ...tail]});
  }
  return placements;
}

// A default placement whose work key is bound elsewhere is that work's displaced location, not a destination.
function placementWork(placement, parts) {
  const work = placement.work ?? parts[placement.rule.workIndex];
  const dir = placement.dir ?? parts.slice(0, placement.rule.workIndex + 1).join('/');
  return {work, dir};
}
const displaced = (works, {work, dir}) => works.has(work) && works.get(work) !== dir;

const placementLabel = placement => (placement.work ? `works.${placement.work} ${placement.dir}/${placement.rule.tailTemplate}` : `${placement.rule.where} ${placement.rule.template}`);

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const has = (object, key) => Object.hasOwn(object, key);

function parseContract(value) {
  const errors = [];
  const fail = (code, subject, message) => errors.push({level: 'error', code, subject, message});
  const fields = (object, where, required, optional = []) => {
    if (!isObject(object)) {
      fail('invalid-contract', where, 'must be a JSON object');
      return false;
    }
    for (const key of Object.keys(object)) {
      if (!required.includes(key) && !optional.includes(key)) fail('invalid-contract', `${where}.${key}`, `is not a recognised field; allowed: ${[...required, ...optional].join(', ')}`);
    }
    for (const key of required) if (!has(object, key)) fail('invalid-contract', `${where}.${key}`, 'is required');
    return true;
  };
  const string = (object, key, where) => {
    if (has(object, key) && (typeof object[key] !== 'string' || object[key].trim() === '')) fail('invalid-contract', `${where}.${key}`, 'must be a non-empty string');
  };
  if (!fields(value, 'contract', ['version', 'repository', 'workRoot'], ['resources', 'destinations', 'multiphasePlan', 'works', 'external', 'canonical'])) return {errors};
  if (has(value, 'version') && value.version !== 1) fail('invalid-contract', 'contract.version', `must be 1, got ${describe(value.version)}`);
  if (has(value, 'repository') && (typeof value.repository !== 'string' || !REPOSITORY_RE.test(value.repository))) fail('invalid-contract', 'contract.repository', 'must be an owner/name repository identity');
  else if (value.repository === 'owner/name') fail('invalid-contract', 'contract.repository', 'is still the seed placeholder; record this repository\'s identity');
  const repository = value.repository;
  let workRoot;
  if (has(value, 'workRoot')) {
    const problem = pathProblem(value.workRoot);
    if (problem) fail('invalid-path', 'contract.workRoot', problem);
    else workRoot = value.workRoot;
  }

  const resources = [];
  if (has(value, 'resources') && !Array.isArray(value.resources)) fail('invalid-contract', 'contract.resources', 'must be an array');
  (Array.isArray(value.resources) ? value.resources : []).forEach((resource, index) => {
    const where = `resources[${index}]`;
    if (!isObject(resource)) return fail('invalid-contract', where, 'must be a JSON object');
    if (!ROLES.includes(resource.role)) return fail('invalid-contract', `${where}.role`, `must be one of ${ROLES.join(', ')}; got ${describe(resource.role)}`);
    if (typeof resource.state !== 'string' || !has(STATES, resource.state)) return fail('invalid-contract', `${where}.state`, `must be one of ${Object.keys(STATES).join(', ')}; got ${describe(resource.state)}`);
    const shape = STATES[resource.state];
    const before = errors.length;
    fields(resource, where, ['role', 'state', ...shape.required], shape.optional);
    string(resource, 'note', where);
    if (has(resource, 'type') && !['file', 'directory'].includes(resource.type)) fail('invalid-contract', `${where}.type`, 'must be "file" or "directory"');
    if (has(resource, 'repository') && (typeof resource.repository !== 'string' || !REPOSITORY_RE.test(resource.repository))) fail('invalid-contract', `${where}.repository`, 'must be an owner/name repository identity');
    if (has(resource, 'path')) {
      const problem = pathProblem(resource.path);
      if (problem) fail('invalid-path', `${where}.path`, problem);
    }
    if (errors.length === before) resources.push({...resource, where});
  });

  const rules = [];
  const addRule = (kind, template, where, multiphase) => {
    const problem = pathProblem(template, {tokens: true});
    if (problem) return fail('invalid-path', where, problem);
    const segments = template.split('/');
    const count = token => template.split(`<${token}>`).length - 1;
    if (count('work-key') !== 1 || !segments.includes('<work-key>')) return fail('invalid-contract', where, 'must contain <work-key> exactly once, as a whole path segment naming the work directory');
    if (segments.slice(0, segments.indexOf('<work-key>')).some(segment => segment.includes('<'))) return fail('invalid-contract', where, 'may use only literal segments before <work-key>');
    if (count('topic') + count('run-id') !== 1) return fail('invalid-contract', where, 'must contain exactly one <topic> or <run-id>');
    if (!template.endsWith('.md')) return fail('invalid-contract', where, 'must name a Markdown file ending in .md');
    rules.push({kind, multiphase, where, ...compileTemplate(template)});
  };
  if (has(value, 'destinations') && !isObject(value.destinations)) fail('invalid-contract', 'contract.destinations', 'must be an object keyed by artifact kind');
  const overrides = isObject(value.destinations) ? value.destinations : {};
  for (const key of Object.keys(overrides)) if (!KINDS.includes(key)) fail('invalid-contract', `destinations.${key}`, `is not an artifact kind; kinds are ${KINDS.join(', ')}`);
  for (const kind of KINDS) {
    if (has(overrides, kind)) addRule(kind, overrides[kind], `destinations.${kind}`, false);
    else if (workRoot) addRule(kind, `${workRoot}/<work-key>/${kind === 'evidence' ? '<run-id>' : '<topic>'}.${kind}.md`, `default ${kind} destination`, false);
  }
  if (has(value, 'multiphasePlan')) addRule('plan', value.multiphasePlan, 'multiphasePlan', true);

  const works = new Map();
  if (has(value, 'works') && !isObject(value.works)) fail('invalid-contract', 'contract.works', 'must be an object mapping each work key to its directory');
  for (const [work, dir] of Object.entries(isObject(value.works) ? value.works : {})) {
    const where = `works.${work}`;
    const problem = pathProblem(dir);
    if (!SLUG_RE.test(work)) fail('invalid-contract', where, 'must be one work key of lowercase letters, digits and hyphens');
    else if (problem) fail('invalid-path', where, problem);
    else works.set(work, dir);
  }
  const bindings = [...works];
  for (const [i, [work, dir]] of bindings.entries()) {
    for (const [other, otherDir] of bindings.slice(i + 1)) {
      if (otherDir === dir) fail('duplicate-authority', `works.${other}`, `uses ${dir}, already bound to ${work}; each work has its own directory`);
      else if (otherDir.startsWith(`${dir}/`) || dir.startsWith(`${otherDir}/`)) fail('ambiguous-rule', `works.${other}`, `${otherDir} and works.${work} ${dir} are nested; work directories must not contain each other`);
    }
    const parts = dir.split('/');
    const claimed = rules.find(rule => parts.length === rule.workIndex + 1 && parts.at(-1) !== work && fits(rule.segments.slice(0, parts.length), parts));
    if (claimed) fail('ambiguous-rule', `works.${work}`, `${dir} is already the ${claimed.where} directory of work ${parts.at(-1)}; bind ${work} to a directory that names no other work`);
  }

  for (const [i, a] of rules.entries()) {
    for (const b of rules.slice(i + 1)) {
      if (fits(a.segments, witness(b.template)) || fits(b.segments, witness(a.template))) {
        fail('ambiguous-rule', a.where, `${a.template} and ${b.where} ${b.template} can match the same file; make one destination distinct`);
      } else if (works.size && (fits(a.segments.slice(a.workIndex + 1), witness(b.tailTemplate)) || fits(b.segments.slice(b.workIndex + 1), witness(a.tailTemplate)))) {
        fail('ambiguous-rule', a.where, `${a.tailTemplate} and ${b.where} ${b.tailTemplate} can name the same file in a directory bound in works; make the file names distinct`);
      }
    }
  }

  const placements = placementsFor(rules, works);
  for (const resource of resources.filter(r => r.state === 'existing' || r.state === 'destination')) {
    const parts = resource.path.split('/');
    const file = resource.type === 'file';
    const hit = placements.find(placement => (file ? fits(placement.segments, parts) : reachesBelow(placement.segments, parts)) && !displaced(works, placementWork(placement, parts)));
    if (hit) {
      fail('ambiguous-rule', resource.where, file
        ? `${resource.path} is itself a ${hit.rule.kind} destination under ${placementLabel(hit)}; a resource file cannot also be a work record`
        : `${resource.path} can contain ${hit.rule.kind} records under ${placementLabel(hit)}; a resource directory must not contain work-artifact destinations`);
    }
  }

  const external = [];
  if (has(value, 'external') && !Array.isArray(value.external)) fail('invalid-contract', 'contract.external', 'must be an array');
  (Array.isArray(value.external) ? value.external : []).forEach((scope, index) => {
    const where = `external[${index}]`;
    const before = errors.length;
    if (!fields(scope, where, ['work', 'kinds', 'repository', 'path', 'reason'])) return;
    if (typeof scope.work !== 'string' || !SLUG_RE.test(scope.work)) fail('invalid-contract', `${where}.work`, 'must be one work key of lowercase letters, digits and hyphens');
    if (!Array.isArray(scope.kinds) || scope.kinds.length === 0) fail('invalid-contract', `${where}.kinds`, 'must be a non-empty array of artifact kinds');
    else {
      for (const kind of scope.kinds) if (!KINDS.includes(kind)) fail('invalid-contract', `${where}.kinds`, `contains ${describe(kind)}; kinds are ${KINDS.join(', ')}`);
      if (new Set(scope.kinds).size !== scope.kinds.length) fail('invalid-contract', `${where}.kinds`, 'repeats a kind');
    }
    if (typeof scope.repository !== 'string' || !REPOSITORY_RE.test(scope.repository)) fail('invalid-contract', `${where}.repository`, 'must be an owner/name repository identity');
    else if (scope.repository === repository) fail('invalid-contract', `${where}.repository`, 'names this repository; external scopes are for other owners');
    const problem = pathProblem(scope.path);
    if (problem) fail('invalid-path', `${where}.path`, problem);
    string(scope, 'reason', where);
    if (errors.length === before) external.push({...scope, where});
  });

  const canonical = [];
  if (has(value, 'canonical') && !Array.isArray(value.canonical)) fail('invalid-contract', 'contract.canonical', 'must be an array');
  (Array.isArray(value.canonical) ? value.canonical : []).forEach((record, index) => {
    const where = `canonical[${index}]`;
    const before = errors.length;
    if (!fields(record, where, ['work', 'kind', 'owner', 'path', 'reason'], ['multiphase'])) return;
    if (typeof record.work !== 'string' || !SLUG_RE.test(record.work)) fail('invalid-contract', `${where}.work`, 'must be one work key of lowercase letters, digits and hyphens');
    if (!KINDS.includes(record.kind)) fail('invalid-contract', `${where}.kind`, `must be one of ${KINDS.join(', ')}; got ${describe(record.kind)}`);
    if (typeof record.owner !== 'string' || !REPOSITORY_RE.test(record.owner)) fail('invalid-contract', `${where}.owner`, 'must be an owner/name repository identity');
    const problem = pathProblem(record.path);
    if (problem) fail('invalid-path', `${where}.path`, problem);
    string(record, 'reason', where);
    if (has(record, 'multiphase') && typeof record.multiphase !== 'boolean') fail('invalid-contract', `${where}.multiphase`, 'must be true or false');
    if (record.multiphase && record.kind !== 'plan') fail('invalid-contract', `${where}.multiphase`, 'applies only to plan records');
    if (errors.length === before) canonical.push({...record, where, local: record.owner === repository});
  });

  const seenPaths = new Map();
  for (const resource of resources.filter(r => has(r, 'path'))) {
    const key = `${resource.repository ?? repository}:${resource.path}`;
    if (seenPaths.has(key)) fail('duplicate-authority', resource.where, `repeats ${resource.path} from ${seenPaths.get(key)}`);
    else seenPaths.set(key, resource.where);
  }
  for (const role of SINGLE_ROLES) {
    const declared = resources.filter(r => r.role === role);
    if (declared.length > 1) fail('duplicate-authority', declared[1].where, `declares a second ${role}; keep one (${declared[0].where} already does)`);
  }
  const scopes = new Map();
  for (const scope of external) {
    for (const kind of scope.kinds) {
      const key = `${scope.work}/${kind}`;
      if (scopes.has(key)) fail('ambiguous-ownership', scope.where, `${kind} records for ${scope.work} are already scoped to ${scopes.get(key).repository} by ${scopes.get(key).where}`);
      else scopes.set(key, scope);
    }
  }
  const canonicalPaths = new Map();
  for (const record of canonical) {
    const earlier = canonicalPaths.get(record.path);
    if (earlier?.owner === record.owner) fail('duplicate-authority', record.where, `repeats ${record.owner}:${record.path} from ${earlier.where}`);
    else if (earlier) fail('ambiguous-ownership', record.where, `${record.path} is also declared canonical for ${earlier.owner} in ${earlier.where}; this checker identifies records only by their path in this repository, so one path cannot name records of two owners. Keep the entry for the actual owner.`);
    else canonicalPaths.set(record.path, record);
    const scope = scopes.get(`${record.work}/${record.kind}`);
    if (scope && scope.repository !== record.owner) {
      fail(record.local ? 'duplicate-authority' : 'ambiguous-ownership', record.where, `${scope.where} assigns ${record.kind} records for ${record.work} to ${scope.repository}; ${record.owner} cannot also own one`);
    }
  }

  if (errors.length) return {errors};
  return {errors, contract: {repository, workRoot, resources, rules, works, placements, external, canonical, scopes}};
}

function pointers(root) {
  const found = [];
  for (const name of POINTER_FILES) {
    const where = resolveWithinRoot(root, name);
    if (where.state !== 'file') continue;
    const text = fs.readFileSync(path.join(root, name), 'utf8');
    if (POINTER_MARKERS.some(marker => text.includes(marker))) found.push(name);
  }
  return found;
}

function expectation(contract, rel) {
  const base = path.posix.basename(rel);
  const kind = KINDS.find(k => base.endsWith(`.${k}.md`));
  const rules = contract.rules.filter(rule => !kind || rule.kind === kind);
  const list = rules.map(rule => `${rule.template}${rule.multiphase ? ' (multi-phase plan)' : ''}`).join(' or ');
  const tokens = 'tokens are lowercase letters, digits and single hyphens';
  const bound = contract.works.size ? ` A work listed in works uses its bound directory in place of the directory ending at <work-key>.` : '';
  return kind
    ? `Expected a ${kind} at ${list} (${tokens}), or a canonical record listed in ${CONFIG_PATH}.${bound}`
    : `The filename names no artifact kind. Destinations are: ${list} (${tokens}). Legacy names need an exact canonical entry in ${CONFIG_PATH}.${bound}`;
}

function matchArtifact(contract, rel) {
  const parts = rel.split('/');
  const matches = [];
  for (const placement of contract.placements) {
    if (!fits(placement.segments, parts)) continue;
    const {rule} = placement;
    const {work, dir} = placementWork(placement, parts);
    if (!matches.some(m => m.rule === rule && m.work === work)) matches.push({rule, work, dir});
  }
  const misplaced = matches.filter(m => displaced(contract.works, m));
  return {placed: matches.filter(m => !misplaced.includes(m)), misplaced};
}

function checkArtifact(root, contract, rel, report) {
  const add = (level, code, message) => report.findings.push({level, code, subject: rel, message});
  const problem = pathProblem(rel);
  if (problem) return add('error', 'invalid-path', `${problem}. Pass the file relative to --repo ${root}.`);
  const found = resolveWithinRoot(root, rel);
  const where = locationProblem(found, rel);
  if (where) return add('error', locationCode(found), where);
  if (found.state === 'missing') return add('error', 'missing-artifact', `does not exist under ${root}; only existing files are checked. ${expectation(contract, rel)}`);
  if (found.state === 'directory') return add('error', 'not-a-file', 'is a directory; pass each artifact file. Directories never satisfy a canonical or destination rule.');

  const exact = contract.canonical.find(record => record.path === rel);
  if (exact?.local) {
    add('ok', 'canonical', `canonical ${exact.kind} for ${exact.work} (${exact.reason})`);
    if (exact.multiphase) add('pending', 'plan-content', `multi-phase plan content is not validated here; run ${PLAN_CHECK} ${path.join(root, rel)}`);
    return;
  }
  if (exact) return add('error', 'wrong-owner', `is the path of the canonical ${exact.kind} for ${exact.work} owned by ${exact.owner}; link to ${exact.owner}:${rel} instead of keeping a local copy.`);

  const resource = contract.resources.find(r => (r.state === 'existing' || r.state === 'destination') && (r.path === rel || (r.type === 'directory' && rel.startsWith(`${r.path}/`))));
  if (resource) return add('ok', 'resource', `belongs to the ${resource.role} resource ${resource.path}; its own conventions apply, not work-artifact naming`);

  const {placed, misplaced} = matchArtifact(contract, rel);
  if (placed.length > 1) return add('error', 'ambiguous-rule', `matches ${placed.map(m => `${m.rule.kind} for ${m.work} in ${m.dir}`).join(' and ')}; make the destinations or works distinct in ${CONFIG_PATH}.`);
  if (placed.length === 0 && misplaced.length) {
    const [{rule, work}] = misplaced;
    return add('error', 'wrong-location', `${work} is bound to ${contract.works.get(work)} in works; write its ${rule.kind} records there as ${rule.tailTemplate}, not in a second directory.`);
  }
  if (placed.length === 0) return add('error', 'unmatched-artifact', `is not a configured location. ${expectation(contract, rel)}`);

  const [{rule, work, dir}] = placed;
  const scope = contract.scopes.get(`${work}/${rule.kind}`);
  if (scope) return add('error', 'wrong-owner', `${rule.kind} records for ${work} are owned by ${scope.repository} at ${scope.path} (${scope.reason}). Write there and link to it; do not keep a second authority here.`);
  add('ok', 'destination', `${rule.kind} for ${work} in ${dir} (${rule.template})`);
  if (rule.multiphase) add('pending', 'plan-content', `multi-phase plan content is not validated here; run ${PLAN_CHECK} ${path.join(root, rel)}`);
}

function checkDeclaredPaths(root, contract, report) {
  const add = (level, code, subject, message) => report.findings.push({level, code, subject, message});
  const workRoot = resolveWithinRoot(root, contract.workRoot);
  const workProblem = locationProblem(workRoot, contract.workRoot);
  if (workProblem) add('error', locationCode(workRoot), 'workRoot', workProblem);
  else if (workRoot.state === 'file') add('error', 'wrong-type', 'workRoot', `${contract.workRoot} is a file; the work root is a directory`);
  else if (workRoot.state === 'missing') add('note', 'future', 'workRoot', `${contract.workRoot} does not exist yet; it is created with the first record`);

  for (const rule of contract.rules) {
    if (!rule.prefix || rule.prefix === contract.workRoot) continue;
    const found = resolveWithinRoot(root, rule.prefix);
    const problem = locationProblem(found, rule.prefix);
    if (problem) add('error', locationCode(found), rule.where, problem);
    else if (found.state === 'file') add('error', 'wrong-type', rule.where, `${rule.prefix} is a file; ${rule.template} needs a directory there`);
  }

  for (const [work, dir] of contract.works) {
    const subject = `works.${work}`;
    const found = resolveWithinRoot(root, dir);
    const problem = locationProblem(found, dir);
    if (problem) add('error', locationCode(found), subject, problem);
    else if (found.state === 'file') add('error', 'wrong-type', subject, `${dir} is a file; a work directory is a directory`);
    else if (found.state === 'missing') add('note', 'future', subject, `${dir} does not exist yet; it is created with the work's first record`);
    else add('ok', 'work', subject, dir);
  }

  for (const resource of contract.resources) {
    const subject = `${resource.where} ${resource.role}`;
    if (resource.state === 'unconfigured') {
      add('gap', 'unconfigured', subject, resource.note ?? 'not configured');
      continue;
    }
    if (resource.state === 'external') {
      add('unverified', 'external', subject, `${resource.repository}:${resource.path} is owned outside this repository; existence UNVERIFIED`);
      continue;
    }
    const found = resolveWithinRoot(root, resource.path);
    const problem = locationProblem(found, resource.path);
    if (problem) add('error', locationCode(found), subject, problem);
    else if (found.state === 'missing') {
      if (resource.state === 'existing') add('error', 'missing-resource', subject, `${resource.path} is declared existing but was not found. Restore it, correct the path, or mark it unconfigured in ${CONFIG_PATH}.`);
      else add('note', 'future', subject, `${resource.path} does not exist yet`);
    } else if (found.state !== resource.type) add('error', 'wrong-type', subject, `${resource.path} is a ${found.state}, declared ${resource.type}`);
    else add('ok', resource.state, subject, resource.path);
  }
  if (!contract.resources.some(r => r.role === 'domain-contract')) {
    add('gap', 'unconfigured', 'domain-contract', 'no domain contract is configured; repository domain documentation remains as found');
  }

  for (const scope of contract.external) {
    add('unverified', 'external', scope.where, `${scope.kinds.join(', ')} for ${scope.work} owned by ${scope.repository}:${scope.path}; existence UNVERIFIED`);
  }
  for (const record of contract.canonical) {
    if (!record.local) {
      add('unverified', 'external', record.where, `canonical ${record.kind} for ${record.work} at ${record.owner}:${record.path}; existence UNVERIFIED`);
      continue;
    }
    const found = resolveWithinRoot(root, record.path);
    const problem = locationProblem(found, record.path);
    if (problem) add('error', locationCode(found), record.where, problem);
    else if (found.state === 'missing') add('error', 'missing-canonical', record.where, `${record.path} does not exist. Canonical entries name existing files; restore it or remove the entry.`);
    else if (found.state === 'directory') add('error', 'not-a-file', record.where, `${record.path} is a directory. Canonical entries name exact files; list each file.`);
  }
}

export function checkRepository({repo, artifacts: supplied = []}) {
  const artifacts = [...new Set(supplied)];
  if (typeof repo !== 'string' || !path.isAbsolute(repo)) throw new UsageError('--repo must be the absolute path of the consuming repository root');
  let root;
  try {
    root = fs.realpathSync(repo);
  } catch {
    throw new UsageError(`--repo ${repo} does not exist`);
  }
  if (!fs.statSync(root).isDirectory()) throw new UsageError(`--repo ${repo} is not a directory`);

  const report = {root, status: 'passed', config: null, findings: []};
  const add = (level, code, subject, message) => report.findings.push({level, code, subject, message});
  const config = resolveWithinRoot(root, CONFIG_PATH);
  const configProblem = locationProblem(config, CONFIG_PATH);
  const pointedFrom = pointers(root);
  if (configProblem) add('error', locationCode(config), CONFIG_PATH, configProblem);
  else if (config.state !== 'file') {
    if (pointedFrom.length) {
      add('error', 'config-required', CONFIG_PATH, `is missing but ${pointedFrom.join(' and ')} point to it. Run sidkik-pstack-documentation:setup-documentation, or remove the stale pointer.`);
      if (artifacts.length) add('note', 'not-checked', 'artifacts', 'supplied artifacts were not checked because the configuration the pointer names is missing');
    } else if (artifacts.length) {
      add('error', 'config-required', CONFIG_PATH, `is missing, so the ${artifacts.length} supplied artifact(s) cannot be validated. Without a configuration, run the checker without artifacts and report the records as not validated; configure the repository with sidkik-pstack-documentation:setup-documentation only when asked to.`);
    } else {
      report.status = 'unconfigured';
      add('gap', 'unconfigured', CONFIG_PATH, 'absent and no instruction pointer names it; nothing was validated. Records written under the work-artifacts fallback are not validated.');
      return report;
    }
  } else {
    report.config = CONFIG_PATH;
    let value;
    try {
      value = extractContract(fs.readFileSync(path.join(root, CONFIG_PATH), 'utf8'));
    } catch (error) {
      add('error', 'invalid-contract', CONFIG_PATH, error.message);
      if (artifacts.length) add('note', 'not-checked', 'artifacts', 'supplied artifacts were not checked because the contract is invalid');
    }
    if (value !== undefined) {
      const {errors, contract} = parseContract(value);
      report.findings.push(...errors.map(e => ({...e, subject: `${CONFIG_PATH} ${e.subject}`})));
      if (!contract && artifacts.length) add('note', 'not-checked', 'artifacts', 'supplied artifacts were not checked because the contract is invalid');
      if (contract) {
        report.repository = contract.repository;
        if (!pointedFrom.length) add('gap', 'pointer-missing', CONFIG_PATH, `no root AGENTS.md or CLAUDE.md names it; agents may not find it`);
        checkDeclaredPaths(root, contract, report);
        for (const rel of artifacts) checkArtifact(root, contract, rel, report);
      }
    }
  }
  if (report.findings.some(f => f.level === 'error')) report.status = 'failed';
  return report;
}

function format(report) {
  const lines = [`pstack-docs: ${report.root}${report.repository ? ` (${report.repository})` : ''}`];
  for (const f of report.findings) lines.push(`${f.level.toUpperCase()} ${f.code} ${f.subject}: ${f.message}`);
  const count = level => report.findings.filter(f => f.level === level).length;
  const pending = count('pending');
  const summary = {
    unconfigured: 'result: UNCONFIGURED (not validated)',
    failed: `result: FAILED (${count('error')} error${count('error') === 1 ? '' : 's'})`,
    passed: `result: PASSED${pending ? ` with ${pending} plan content check${pending === 1 ? '' : 's'} PENDING` : ''}${count('unverified') ? `; ${count('unverified')} external reference${count('unverified') === 1 ? '' : 's'} UNVERIFIED` : ''}`,
  }[report.status];
  lines.push(summary);
  return lines.join('\n');
}

const USAGE = `Usage: node check-artifacts.mjs --repo <absolute repository root> [artifact ...]
Artifacts are existing files relative to the repository root.`;

function main(argv) {
  let repo;
  const artifacts = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      console.log(USAGE);
      return 0;
    }
    if (arg === '--') {
      artifacts.push(...argv.slice(i + 1));
      break;
    }
    if (arg === '--repo') repo = argv[++i];
    else if (arg.startsWith('--repo=')) repo = arg.slice('--repo='.length);
    else if (arg.startsWith('-')) {
      console.error(`unknown option ${arg}\n${USAGE}`);
      return 2;
    } else artifacts.push(arg);
  }
  if (!repo) {
    console.error(`--repo is required\n${USAGE}`);
    return 2;
  }
  try {
    const report = checkRepository({repo, artifacts});
    console.log(format(report));
    return report.status === 'failed' ? 1 : 0;
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(`${error.message}\n${USAGE}`);
      return 2;
    }
    throw error;
  }
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
