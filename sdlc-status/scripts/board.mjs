// Emits native-agent requests only. No model launch, board mapping or board I/O.
import { readFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { project, templates } from './stages.mjs';

export function validateFinished(finished, state) {
  if (finished === undefined) return;
  if (!finished || Object.keys(finished).some(key => !['stage', 'outcome'].includes(key)) ||
      !templates.routes[state.progress?.route]?.stages.some(stage => stage.id === finished.stage) ||
      typeof finished.outcome !== 'string' || !finished.outcome.trim() || finished.outcome.length > 2000)
    throw Error('finished requires a current-route stage ID and recorded outcome');
}

export function boardUpdate(previous, state, finished) {
  if (!state.progress) return { events: [] };
  const { route, active, claimedComplete } = state.progress;
  const same = previous?.work === state.work && previous?.progress?.route === route;
  const stageChanged = !same || previous.progress.active !== active;
  const sameEvidence = same && previous.progress.evidenceRevision === state.progress.evidenceRevision &&
    previous.progress.sourceRevision === state.progress.sourceRevision;
  const finishes = sameEvidence ? { ...previous.boardDispositions?.finishes } : {};
  // Entering a stage starts another occurrence, even with the same eventual outcome.
  if (stageChanged) delete finishes[active];
  const event = (kind, stage, outcome = null) => ({ event: kind, issueUrl: state.work, route, stage, outcome });
  const events = [];
  const finish = (stage, outcome) => {
    if (finishes[stage] !== outcome) events.push(event('stage-finish', stage, outcome));
    finishes[stage] = outcome;
  };
  // A new completion claim is a recorded finish, with its actual projection
  // standing. Explicit outcomes (including disposition-only finishes) win.
  for (const stage of new Set(claimedComplete)) {
    if ((!same || !previous.progress.claimedComplete.includes(stage)) && stage !== finished?.stage) {
      const standing = project(state).stages.find(item => item.id === stage)?.status;
      const outcome = { ok: 'complete', '-': 'not-applicable', '!': 'held', E: 'exception', '?': 'unknown', '.': 'pending' }[standing];
      finish(stage, outcome);
    }
  }
  if (finished) finish(finished.stage, finished.outcome);
  // Atomic advancement finishes the outgoing stage before entering the next one.
  if (stageChanged) events.push(event('stage-change', active));
  return { events, dispositions: { finishes } };
}

export async function emitBoardRequests(deliveryRepository, events) {
  if (!events.length) return;
  try {
    if (typeof deliveryRepository !== 'string' || !isAbsolute(deliveryRepository))
      throw Error('explicit absolute delivery repository is missing; use --delivery-repo');
    const raw = await readFile(join(deliveryRepository, 'docs/agents/issue-tracker.md'), 'utf8');
    // One scalar in tracker frontmatter; prose/code examples are not configuration.
    const header = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
    const fields = header?.split(/\r?\n/).filter(line => /^board_skill\s*:/.test(line)) || [];
    if (!fields.length) return;
    if (fields.length !== 1) throw Error('duplicate board_skill configuration');
    const skill = fields[0].slice(fields[0].indexOf(':') + 1).trim();
    if (!skill) return;
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]*(?::[A-Za-z0-9][A-Za-z0-9_-]*)?$/.test(skill))
      throw Error('board_skill must be an unquoted native skill name, optionally plugin-qualified');
    console.log('SDLC board: native invocation required; accountable agent executes each request at the delivery repository. An unavailable skill is a scoped board gap; continue authorized work.');
    for (const input of events)
      console.log('SDLC_BOARD_DELEGATE ' + JSON.stringify({ skill, deliveryRepository, input }));
  } catch (error) {
    console.log('SDLC_BOARD_GAP ' + JSON.stringify({ deliveryRepository: deliveryRepository || null, reason: error.message, blocksWork: false }));
  }
}
