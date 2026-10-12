import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

test('a present null registry cannot fall back to explicit session argv', {skip:process.platform !== 'linux'}, t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'standards-null-registry-'));
  t.after(() => fs.rmSync(dir,{recursive:true,force:true}));
  const runtime = new URL('../sdlc-process/scripts/observer-live.mjs', import.meta.url).href;
  const sid = '627631fd-9a38-4516-88af-44787f3268e8';
  const child = `import assert from 'node:assert/strict'; import {resolveOwner} from ${JSON.stringify(runtime)}; assert.throws(() => resolveOwner({sessionId:${JSON.stringify(sid)}}), /identity|No ancestor/);`;
  const parent = `
    const fs = require('node:fs'), path = require('node:path');
    fs.mkdirSync(path.join(process.env.CLAUDE_CONFIG_DIR, 'sessions'));
    fs.writeFileSync(path.join(process.env.CLAUDE_CONFIG_DIR, 'sessions', process.pid + '.json'), 'null');
    const r = require('node:child_process').spawnSync(process.execPath, ['--input-type=module', '-e', ${JSON.stringify(child)}], {encoding:'utf8'});
    process.stderr.write(r.stderr); process.exit(r.status);
  `;
  const result = spawnSync(process.execPath, ['-e', parent, '--', '--resume', sid], {
    argv0:'claude', env:{...process.env,CLAUDE_CONFIG_DIR:dir}, encoding:'utf8', timeout:5000,
  });
  assert.equal(result.status,0,result.stderr);
});
