// A projection of native records, never a second session archive.
const UUID = /^[0-9a-f-]{16,}$/i;
const ID = /^[A-Za-z][A-Za-z0-9-]{0,47}$/;
const enums = {
  validity: ['valid', 'stale', 'incorrect', 'duplicate', 'unknown'],
  materiality: ['behavior', 'evidence', 'presentation', 'unknown'],
  timeliness: ['before-action', 'late', 'already-resolved', 'unknown'],
  attribution: ['observer', 'human', 'other-review', 'shared', 'unknown'],
};
const dispositionMarkers = value => value.split('\n').flatMap(line => { const m = /^Observer ([A-Za-z][A-Za-z0-9-]{0,47}): (accepted|partial|disputed|already-resolved|unresolved) — (.+)$/.exec(line); return m ? [{id:m[1], disposition:m[2], reason:m[3]}] : []; });
const dispositions = ['accepted', 'partial', 'disputed', 'already-resolved', 'unresolved'];
const text = (r) => Array.isArray(r.message?.content)
  ? r.message.content.filter(x => x?.type === 'text' && typeof x.text === 'string').map(x => x.text).join('\n') : '';
const main = (r, sid) => r?.sessionId === sid && !r.isSidechain && !r.agentId;
const nativeAssistant = (r) => r.type === 'assistant' && !r.origin;
const nonempty = x => typeof x === 'string' && x.trim().length > 0;
const time = x => Date.parse(x);
export function markers(value, name) {
  if (typeof value !== 'string') return [];
  return value.split('\n').flatMap(line => {
    // Native models sometimes copy the inline-code presentation from the protocol.
    // Accept exactly one balanced wrapper, still only at the trusted call sites.
    if (line.startsWith('`') && line.endsWith('`') && !line.startsWith('``') && !line.endsWith('``')) line = line.slice(1, -1);
    if (!line.startsWith(name + ' ') || line.length > 8192) return [];
    try {
      const value = JSON.parse(line.slice(name.length + 1));
      return value && typeof value === 'object' && !Array.isArray(value) ? [value] : [];
    } catch { return []; }
  });
}
export function observerRecords(records, sessionId, taskId) {
  const seen = new Set();
  return records.filter(r => {
    if (!r || r.sessionId !== sessionId || r.agentId !== taskId || r.isSidechain !== true || !UUID.test(r.uuid || '') || seen.has(r.uuid)) return false;
    seen.add(r.uuid);
    return true;
  });
}
export function buildLedger(records, reports, observers, sessionId) {
  const own = records.filter(r => main(r, sessionId));
  const byId = new Map(), repeated = new Set();
  own.forEach((r, index) => {
    if (!UUID.test(r.uuid || '')) return;
    if (byId.has(r.uuid)) repeated.add(r.uuid);
    else byId.set(r.uuid, {r, index});
  });
  // Duplicate native UUIDs are usually resumed copies. Conflicting identities are not evidence.
  for (const id of repeated) {
    const matches = own.filter(r => r.uuid === id);
    if (matches.some(r => JSON.stringify(r) !== JSON.stringify(matches[0]))) byId.delete(id);
  }
  const entries = reports.map(report => {
    const original = byId.get(report.uuid), found = markers(original?.r.message?.content, 'SDLC_FINDING');
    const f = found.length === 1 && ID.test(found[0].id || '') ? found[0] : null;
    const refs = Array.isArray(f?.evidenceRefs) ? f.evidenceRefs : [];
    const supported = f && nonempty(f.rule) && nonempty(f.correction) && refs.length > 0 && refs.every(id => byId.has(id) && byId.get(id).index < original.index);
    return {
      reportUuid: report.uuid, observerTaskId: report.observerTaskId,
      id: f?.id || null, key: f ? `${report.observerTaskId}/${f.id}` : report.uuid,
      stage: 'raised', disposition: 'unresolved', validity: 'unknown', materiality: 'unknown', timeliness: 'unknown', attribution: 'unknown',
      rule: supported ? f.rule.slice(0, 1200) : null, correction: supported ? f.correction.slice(0, 1200) : null,
      evidenceRefs: supported ? [...new Set(refs)] : [],
      protocol: !f ? 'legacy' : supported ? 'tracked' : 'unsupported-finding-evidence',
      events: [], actionRefs: [], verificationRefs: [], disruption: null,
      latencySeconds: null,
      assurance: 'Observer-attributed assessment with validated record links; not independent or authenticated proof.',
    };
  });
  const unique = id => entries.filter(x => x.id === id).length === 1;
  const refsValid = (refs, start, at, assistantOnly = false) => Array.isArray(refs) && refs.length > 0 && refs.every(id => {
    const item = byId.get(id);
    return item && item.index > start && time(item.r.timestamp) <= at &&
      (assistantOnly ? nativeAssistant(item.r) : nativeAssistant(item.r) || (item.r.type === 'user' && (!item.r.origin || item.r.origin.kind === 'human')));
  });
  for (const item of entries) {
    if (item.id && !unique(item.id)) item.protocol = 'ambiguous-finding-id';
    if (!item.id || !unique(item.id) || item.protocol !== 'tracked') continue;
    const report = byId.get(item.reportUuid);
    for (const r of own.slice(report.index + 1)) {
      if (!nativeAssistant(r)) continue;
      for (const d of dispositionMarkers(text(r))) {
        if (d.id !== item.id || !dispositions.includes(d.disposition) || !nonempty(d.reason)) continue;
        item.disposition = d.disposition;
        item.stage = 'assessed';
        item.events.push({kind: 'disposition', source: 'main', recordUuid: r.uuid, timestamp: r.timestamp, disposition: d.disposition, rationale: d.reason.slice(0, 1200)});
      }
    }
    const source = observers.find(x => x.taskId === item.observerTaskId);
    for (const r of source?.records || []) {
      if (!nativeAssistant(r) || r.attributionAgent !== 'sidkik-sdlc-observer') continue;
      for (const a of markers(text(r), 'SDLC_ASSESSMENT')) {
        if (a.id !== item.id || a.reportUuid !== item.reportUuid || !nonempty(a.rationale) || !Number.isFinite(time(r.timestamp)) || time(r.timestamp) < time(report.r.timestamp)) continue;
        // A judgment must cite actual post-delivery MAIN evidence, not its own assertion.
        if (!refsValid(a.refs, report.index, time(r.timestamp))) continue;
        const event = {kind: 'assessment', source: 'observer', recordUuid: r.uuid, timestamp: r.timestamp, rationale: a.rationale.slice(0, 1200), refs: [...new Set(a.refs)]};
        for (const [key, values] of Object.entries(enums)) {
          if (values.includes(a[key])) event[key] = a[key];
        }
        if (dispositions.includes(a.disposition) && refsValid([a.dispositionRef], report.index, time(r.timestamp), true)) { event.disposition = a.disposition; event.dispositionRef = a.dispositionRef; }
        const actions = refsValid(a.actionRefs, report.index, time(r.timestamp), true) ? [...new Set(a.actionRefs)] : [];
        // Disposition-only messages cannot be actions. Acknowledgment alone never turns green.
        const effective = actions.filter(id => {
          const record = byId.get(id).r;
          return !dispositionMarkers(text(record)).length &&
            Array.isArray(record.message?.content) && record.message.content.some(x => x?.type === 'tool_use');
        });
        const lastAction = effective.length ? Math.max(...effective.map(id => byId.get(id).index)) : Infinity;
        let verification = [];
        if (refsValid(a.verificationRefs, lastAction, time(r.timestamp))) {
          // Require a successful real tool result with a matching post-action call.
          verification = a.verificationRefs.filter(id => {
            const v = byId.get(id);
            return v.r.type === 'user' && Array.isArray(v.r.message?.content) && v.r.message.content.some(result => result?.type === 'tool_result' && result.is_error !== true && typeof result.tool_use_id === 'string' && own.slice(lastAction, v.index).some(call => nativeAssistant(call) && call.message?.content?.some?.(part => part?.type === 'tool_use' && part.id === result.tool_use_id)));
          });
        }
        if (effective.length) event.actionRefs = effective;
        if (verification.length && a.resolution === 'corrected' && refsValid(a.resolutionRefs, lastAction, time(r.timestamp))) {
          event.resolutionRefs = [...new Set(a.resolutionRefs)];
          event.verificationRefs = [...new Set(verification)];
        }
        if (Array.isArray(a.disruption)) {
          const allowed = ['unnecessary-pause', 'repeated-read', 'extra-review', 'human-intervention'];
          item.disruption = a.disruption.filter(d => allowed.includes(d?.kind) && refsValid(d.refs, report.index, time(r.timestamp))).map(d => ({kind: d.kind, refs: [...new Set(d.refs)]}));
          event.disruption = item.disruption;
        }
        if (item.stage === 'raised') item.stage = 'assessed';
        item.events.push(event);
      }
    }
    item.events.sort((a, b) => time(a.timestamp) - time(b.timestamp));
    // Replay the lifecycle chronologically. Reopening invalidates old evidence;
    // a subsequent acknowledgment cannot resurrect it.
    item.stage = 'raised'; item.disposition = 'unresolved'; item.validity = 'unknown';
    item.actionRefs = []; item.verificationRefs = []; item.latencySeconds = null;
    let invalidatedAt = -Infinity;
    for (const event of item.events) {
      if (event.disposition) item.disposition = event.disposition;
      for (const key of Object.keys(enums)) if (event[key]) item[key] = event[key];
      if (item.stage === 'raised') item.stage = 'assessed';
      const reopening = event.disposition && ['disputed', 'already-resolved', 'unresolved'].includes(event.disposition);
      const invalid = event.validity && event.validity !== 'valid';
      if (reopening || invalid) {
        invalidatedAt = Math.max(invalidatedAt, time(event.timestamp));
        item.stage = 'assessed'; item.actionRefs = []; item.verificationRefs = []; item.latencySeconds = null;
      }
      const actions = (event.actionRefs || []).filter(id => time(byId.get(id).r.timestamp) > invalidatedAt);
      if (actions.length && actions.length === event.actionRefs.length) {
        item.actionRefs = actions; item.verificationRefs = []; item.latencySeconds = null; item.stage = 'acted';
        if (event.verificationRefs?.length && item.validity === 'valid' && ['accepted', 'partial'].includes(item.disposition)) {
          item.verificationRefs = event.verificationRefs; item.stage = 'verified';
          const end = Math.max(...[...event.verificationRefs, ...(event.resolutionRefs || [])].map(id => time(byId.get(id).r.timestamp))), start = time(report.r.timestamp);
          item.latencySeconds = Number.isFinite(end - start) && end >= start ? (end - start) / 1000 : null;
        }
      }
    }

  }
  const misses = [];
  for (const source of observers) for (const r of source.records) {
    if (!nativeAssistant(r) || r.attributionAgent !== 'sidkik-sdlc-observer') continue;
    for (const m of markers(text(r), 'SDLC_MISS')) {
      if (!ID.test(m.id || '') || !nonempty(m.rule) || !nonempty(m.rationale) || !Array.isArray(m.evidenceRefs) || !m.evidenceRefs.length || !Array.isArray(m.caughtRefs) || !m.caughtRefs.length) continue;
      const earlier = m.evidenceRefs.map(id => byId.get(id)), caught = m.caughtRefs.map(id => byId.get(id));
      if ([...earlier, ...caught].some(x => !x || !Number.isFinite(time(x.r.timestamp)) || time(x.r.timestamp) > time(r.timestamp))) continue;
      if (!caught.every(x => x.r.type === 'user' && (x.r.origin?.kind === 'human' || (x.r.origin?.kind === 'peer' && x.r.origin.handback === true)))) continue;
      if (Math.max(...earlier.map(x => x.index)) >= Math.min(...caught.map(x => x.index))) continue;
      const key = `${source.taskId}/${m.id}`;
      if (misses.some(x => x.key === key)) continue;
      misses.push({key, rule: m.rule.slice(0, 1200), rationale: m.rationale.slice(0, 1200), evidenceRefs: m.evidenceRefs, caughtRefs: m.caughtRefs, recordUuid: r.uuid, timestamp: r.timestamp, assurance: 'Observer-attributed possible miss; not an exhaustive audit.'});
    }
  }
  const verified = entries.filter(x => x.stage === 'verified');
  const messages = new Map();
  for (const source of observers) for (const r of source.records) {
    if (nativeAssistant(r) && typeof r.message?.id === 'string') messages.set(`${source.taskId}/${r.message.id}`, r.message.usage || null);
  }
  const usageFields = ['input_tokens', 'output_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens'];
  const usage = Object.fromEntries(usageFields.map(key => [key, messages.size && [...messages.values()].every(x => Number.isFinite(x?.[key]) && x[key] >= 0) ? [...messages.values()].reduce((sum, x) => sum + x[key], 0) : null]));
  const refs = new Set(entries.flatMap(x => [...x.evidenceRefs, ...x.actionRefs, ...x.verificationRefs, ...x.events.flatMap(e => [...(e.refs || []), ...(e.kind === 'disposition' ? [e.recordUuid] : []), ...(e.dispositionRef ? [e.dispositionRef] : []), ...(e.actionRefs || []), ...(e.verificationRefs || []), ...(e.resolutionRefs || []), ...(e.disruption || []).flatMap(d => d.refs)])]).concat(misses.flatMap(x => [...x.evidenceRefs, ...x.caughtRefs])));
  const evidence = [...refs].flatMap(id => {
    const r = byId.get(id)?.r;
    if (!r) return [];
    const excerpt = value => typeof value === 'string' ? value.slice(0, 1200) : Array.isArray(value) ? value.filter(x => x?.type === 'text' && typeof x.text === 'string').map(x => x.text).join('\n').slice(0, 1200) : '';
    const parts = Array.isArray(r.message?.content) ? r.message.content.flatMap(x => x?.type === 'text' && typeof x.text === 'string' ? [{kind: 'text', text: x.text.slice(0, 1200)}] : x?.type === 'tool_use' ? [{kind: 'tool', name: x.name, toolUseId: x.id}] : x?.type === 'tool_result' ? [{kind: 'tool-result', toolUseId: x.tool_use_id, status: x.is_error ? 'error' : 'success', text: excerpt(x.content)}] : []) : typeof r.message?.content === 'string' && r.type === 'user' && (!r.origin || r.origin.kind === 'human' || (r.origin.kind === 'peer' && r.origin.handback === true)) ? [{kind: 'text', text: r.message.content.slice(0, 1200)}] : [];
    return [{uuid: id, timestamp: r.timestamp, parts}];
  });
  return {
    findings: entries, misses, evidence,
    summary: {delivered: entries.length, verified: verified.length, usefulCorrections: verified.filter(x => ['behavior', 'evidence'].includes(x.materiality) && ['observer', 'shared'].includes(x.attribution)).length, materialCorrections: verified.filter(x => x.materiality === 'behavior' && ['observer', 'shared'].includes(x.attribution)).length, unresolved: entries.filter(x => x.stage !== 'verified' && !['stale', 'incorrect', 'duplicate'].includes(x.validity) && !['disputed', 'already-resolved'].includes(x.disposition)).length, disputedOrRedundant: entries.filter(x => ['stale', 'incorrect', 'duplicate'].includes(x.validity) || ['disputed', 'already-resolved'].includes(x.disposition)).length, possibleMisses: misses.length || null, missesCoverage: 'Opportunistic attributed findings only; no exhaustive miss audit.', disruptionEvents: entries.some(x => x.events.some(e => Object.hasOwn(e, 'disruption'))) ? entries.reduce((sum, x) => sum + (x.disruption || []).length, 0) : null},
    usage: {...usage, recordedMessages: messages.size, monetaryCost: null, qualification: 'Recorded observer usage, deduplicated by native message ID; missing fields and monetary cost remain unknown. Not total session cost.'},
  };
}
