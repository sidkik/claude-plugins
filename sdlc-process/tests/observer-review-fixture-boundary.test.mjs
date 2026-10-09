import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {materialize} from './observer-decision-materialize.mjs';
test('every JSON admitted by the maintained fixture enumerator materializes', t => {
  const directory = path.join(import.meta.dirname, 'fixtures');
  const names = fs.readdirSync(directory).filter(name => name.endsWith('.json')).sort();
  for (const name of names) {
    const output = fs.mkdtempSync(path.join(os.tmpdir(), 'observer-review-fixture-'));
    t.after(() => fs.rmSync(output, {recursive: true, force: true}));
    assert.doesNotThrow(() => materialize(path.join(directory, name), output), name);
  }
});
