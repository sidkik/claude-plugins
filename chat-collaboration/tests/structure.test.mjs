import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(pluginRoot, '..');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

function frontmatter(path) {
  const match = readFileSync(path, 'utf8').match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(match, `${path} starts with frontmatter`);
  const fields = {};
  let list = null;
  for (const line of match[1].split('\n')) {
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && list) {
      list.push(item[1].trim());
      continue;
    }
    const pair = line.match(/^([\w-]+):\s*(.*)$/);
    assert.ok(pair, `frontmatter line parses: ${line}`);
    list = pair[2] === '' ? [] : null;
    fields[pair[1]] = list ?? pair[2].trim();
  }
  return fields;
}

test('manifest names the plugin its directory holds', () => {
  const manifest = readJson(join(pluginRoot, '.claude-plugin', 'plugin.json'));
  assert.equal(manifest.name, 'chat-collaboration');
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.ok(manifest.description);
});

test('marketplace lists the plugin once at a resolvable source', () => {
  const { plugins } = readJson(join(repoRoot, '.claude-plugin', 'marketplace.json'));
  const names = plugins.map((plugin) => plugin.name);
  assert.equal(new Set(names).size, names.length, 'plugin names are unique');
  const entry = plugins.find((plugin) => plugin.name === 'chat-collaboration');
  assert.ok(entry, 'marketplace entry exists');
  assert.equal(entry.source, './chat-collaboration');
  assert.ok(existsSync(join(repoRoot, entry.source, '.claude-plugin', 'plugin.json')));
  const manifest = readJson(join(pluginRoot, '.claude-plugin', 'plugin.json'));
  assert.equal(entry.version, manifest.version);
});

test('listen skill is model-invoked and carries a description', () => {
  const fields = frontmatter(join(pluginRoot, 'skills', 'listen', 'SKILL.md'));
  assert.equal(fields.name, 'listen');
  assert.ok(fields.description);
  assert.notEqual(fields['disable-model-invocation'], 'true');
});

test('listener agent inherits the model and is limited to Skill, Read and StructuredOutput', () => {
  const fields = frontmatter(join(pluginRoot, 'agents', 'listener.md'));
  assert.equal(fields.name, 'listener');
  assert.ok(fields.description);
  assert.equal(fields.model, 'inherit');
  assert.deepEqual(fields.tools, ['Skill', 'Read', 'StructuredOutput']);
});

test('listener agent routes to the qualified skill', () => {
  const body = readFileSync(join(pluginRoot, 'agents', 'listener.md'), 'utf8');
  assert.ok(body.includes('chat-collaboration:listen'));
});
