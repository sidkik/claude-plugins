import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveOwner } from '../sdlc-process/scripts/observer-live.mjs';

const sid = '627631fd-9a38-4516-88af-44787f3268e8';
function stat(pid, ppid, ticks) {
  const fields = ['S', String(ppid)];
  while (fields.length < 19) fields.push('0');
  fields.push(ticks);
  return `${pid} (proc) ${fields.join(' ')}\n`;
}
test('discovery rejects PID reuse between argv identity read and incarnation read', () => {
  let reused = false;
  const proc = {
    stat: pid => pid === '100' ? stat('100', 300, '1') :
      pid === '300' ? stat('300', 1, reused ? '4' : '3') : null,
    cmdline: pid => {
      if (pid !== '300') return [];
      // /proc read captured the old Claude argv. It exits and this PID is
      // reused before the resolver reads stat for this ancestor.
      reused = true;
      return ['claude', '--session-id', sid];
    },
    nativeSession: () => null,
    pidDomain: () => 'linux:fixture:pid:[1]',
  };
  assert.throws(() => {
    const result = resolveOwner({ sessionId: sid, startPid: '100', proc });
    console.log('Unexpected adopted owner:', JSON.stringify(result));
    return result;
  },
    /incarnation|No ancestor|identity/);
});
