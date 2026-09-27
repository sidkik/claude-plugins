// Maintained templates define the denominator. Results remain reported assertions.
import { readFileSync } from "node:fs";
export const templates = JSON.parse(readFileSync(new URL("../templates/routes.json", import.meta.url), "utf8"));
const present = x => typeof x === "string" && x.trim().length > 0 && x.length <= 2000;
const statuses = ["pending", "unknown", "passed", "failed", "na", "exception"];
const reserved = ["required", "criteria", "stages"];
export function template(route) {
  const spec = templates.routes[route];
  if (!spec) throw Error("unknown route; use triage, feature, delivery or research");
  return {
    work: "https://github.com/OWNER/REPO/issues/1", phase: spec.stages[0].label,
    skills: [], checks: [], next: "Establish the owning work and source revisions",
    human: { status: "none", detail: "Continuing authorized intake" },
    progress: {
      template: `${templates.id}@${templates.version}`, route,
      sourceRevision: templates.source.sha256, evidenceRevision: "REPLACE_WITH_CURRENT_WORK_REVISION",
      active: spec.stages[0].id, claimedComplete: [], activities: [], additions: [],
      results: Object.fromEntries(spec.stages.flatMap(s => s.criteria.map(c => [c.id, { status: "unknown" }]))),
    },
  };
}
function routeStages(p) {
  const spec = templates.routes[p.route];
  return spec?.stages.map(stage => ({...stage, criteria: [...stage.criteria, ...(p.additions || []).filter(x => x.stage === stage.id)]}));
}
export function retainRequirements(payload, previous) {
  if (!previous?.progress || previous.work !== payload.work) return;
  if (!payload.progress) throw Error("tracked work cannot downgrade to legacy; initialize its current template");
  const p = payload.progress, old = previous.progress;
  if (p.route !== old.route) {
    const r = p.routeChange;
    if (!r || !present(r.actor) || !present(r.reference) || r.revision !== p.evidenceRevision || r.assessment?.result !== "passed" || !present(r.assessment.actor) || r.assessment.actor === r.actor || !present(r.assessment.reference) || r.assessment.revision !== p.evidenceRevision) throw Error("route reset requires an applicable independent routeChange assessment");
    return;
  }
  const supplied = p.additions || [];
  if (!Array.isArray(supplied)) throw Error("invalid additional criteria");
  for (const prior of old.additions || []) {
    const replacement = supplied.find(x => x.id === prior.id);
    if (replacement && JSON.stringify(replacement) !== JSON.stringify(prior)) throw Error(`declared requirement cannot be replaced: ${prior.id}`);
  }
  p.additions = [...(old.additions || []), ...supplied.filter(x => !(old.additions || []).some(y => y.id === x.id))];
}
export function validateProgress(p, writing = false) {
  if (!p || typeof p !== "object" || Array.isArray(p)) throw Error("invalid progress");
  if (reserved.some(k => k in p)) throw Error("required criteria come from the maintained template");
  if (!present(p.template) || !present(p.route) || !present(p.sourceRevision) || !present(p.evidenceRevision)) throw Error("progress template, route and source/evidence revisions required");
  const spec = templates.routes[p.route];
  const known = spec && p.template === `${templates.id}@${templates.version}`;
  if (writing && !known) throw Error("unknown template or route; initialize using template --route ROUTE");
  if (!present(p.active) || (known && !spec.stages.some(s => s.id === p.active))) throw Error("invalid active stage");
  if (!Array.isArray(p.claimedComplete) || p.claimedComplete.some(x => !present(x) || (known && !spec.stages.some(s => s.id === x)))) throw Error("invalid claimedComplete stages");
  if (!Array.isArray(p.activities) || p.activities.some(x => !["delegation"].includes(x))) throw Error("invalid activities; delegation records attempted dispatch");
  const additions = p.additions || [];
  if (!Array.isArray(additions) || additions.length > 40) throw Error("invalid additional criteria");
  const extraIds = new Set();
  for (const c of additions) {
    if (!c || Object.keys(c).some(k => !["id", "label", "stage", "source", "sourceRevision", "conditional", "independent"].includes(k)) || !/^X-[a-zA-Z0-9-]{1,100}$/.test(c.id) || extraIds.has(c.id) || !present(c.label) || !present(c.source) || !present(c.sourceRevision) || (known && !spec.stages.some(s => s.id === c.stage)) || (c.conditional !== undefined && typeof c.conditional !== "boolean") || (c.independent !== undefined && typeof c.independent !== "boolean")) throw Error("invalid additional criterion declaration");
    extraIds.add(c.id);
  }
  const stages = routeStages(p);
  const results = p.results ?? {};
  if (typeof results !== "object" || Array.isArray(results) || !results || Object.keys(results).length > 150) throw Error("invalid criterion results");
  const ids = new Set(stages?.flatMap(s => s.criteria.map(c => c.id)) || []);
  for (const [id, r] of Object.entries(results)) {
    if (known && !ids.has(id)) throw Error(`unknown criterion ${id}`);
    if (!r || !statuses.includes(r.status)) throw Error(`invalid result ${id}`);
    for (const k of ["reference", "revision", "reason", "actor"])
      if (r[k] !== undefined && !present(r[k])) throw Error(`invalid ${k} for ${id}`);
    // A claimed pass without proof is retained as an unknown, visibly violating
    // any dependent advancement; rejecting it would leave an older green visible.
    if (r.assessment !== undefined && (!r.assessment || !["passed", "failed", "unknown"].includes(r.assessment.result) || !present(r.assessment.actor) || !present(r.assessment.reference) || !present(r.assessment.revision))) throw Error(`invalid assessment for ${id}`);
    if (r.status === "na" && (known && !stages.some(s => s.criteria.some(c => c.id === id && c.conditional)) || !present(r.reason))) throw Error(`N/A requires a conditional criterion and reason: ${id}`);
    if (r.status === "exception" && (!r.authority || r.authority.kind !== "human" || !present(r.authority.actor) || !present(r.authority.reference) || !present(r.authority.revision) || !present(r.reason) || !present(r.reference) || !present(r.revision))) throw Error(`exception requires scoped human authority, reason and alternative evidence: ${id}`);
  }
}
export function project(s, { stale = false, sourceRevision, evidenceRevision } = {}) {
  const p = s.progress;
  if (!p) return { tracked: false, reason: "legacy/untracked; initialize template", stages: [] };
  const spec = templates.routes[p.route];
  if (!spec || p.template !== `${templates.id}@${templates.version}`) return { tracked: false, reason: "unknown template; initialize current template", stages: [] };
  const changed = p.sourceRevision !== templates.source.sha256 || (sourceRevision && sourceRevision !== p.sourceRevision) || (evidenceRevision && evidenceRevision !== p.evidenceRevision);
  const invalid = stale || changed;
  const active = spec.stages.findIndex(x => x.id === p.active);
  const stages = routeStages(p).map((stage, i) => {
    const rows = stage.criteria.map(c => {
      const r = p.results?.[c.id] || { status: "unknown" };
      const evidence = present(r.reference) && present(r.actor) && r.revision === p.evidenceRevision;
      const assessed = r.assessment?.result === "passed" && r.assessment.revision === p.evidenceRevision && r.assessment.actor !== r.actor;
      let status = r.status;
      let reason = r.reason || c.label;
      if (invalid) { status = "unknown"; reason = stale ? "stale evidence" : "source/evidence revision changed"; }
      else if (r.assessment?.result === "failed" && r.assessment.revision === p.evidenceRevision) { status = "failed"; reason = "independent assessment failed"; }
      else if (status === "passed" && (!evidence || (c.independent && !assessed))) { status = "unknown"; reason = !evidence ? `${c.label}: evidence missing or revision mismatch` : `${c.label}: independent assessment missing`; }
      else if (status === "exception" && (r.authority.revision !== p.evidenceRevision || !evidence || (c.independent && !assessed))) { status = "unknown"; reason = "exception authority/evidence not current or assessed"; }
      const attempted = i < active || p.claimedComplete.includes(stage.id) || (p.activities.includes("delegation") && c.id === "SK-orchestrator-load");
      const violation = status === "failed" || (!invalid && attempted && !["passed", "na", "exception"].includes(status));
      return { ...r, ...c, conditional: !!c.conditional, independent: !!c.independent, status, reason, violation, assurance: assessed ? "independent review reported" : "reported" };
    });
    const violation = rows.some(c => c.violation);
    const exception = rows.some(c => c.status === "exception");
    const satisfied = rows.every(c => ["passed", "na"].includes(c.status));
    const status = violation ? "!" : exception ? "E" : satisfied ? (rows.every(c => c.status === "na") ? "-" : "ok") : i > active ? "." : "?";
    return { ...stage, rows, status };
  });
  const blocking = stages.flatMap(s => s.rows.map(c => ({ ...c, stage: s.id }))).filter(c => c.violation || (["unknown", "pending", "exception"].includes(c.status) && stages.findIndex(s => s.id === c.stage) <= active));
  // Missing orchestrator must not get buried by generic intake bookkeeping.
  blocking.sort((a, b) => Number(b.violation) - Number(a.violation) || Number(b.id === "SK-orchestrator-load") - Number(a.id === "SK-orchestrator-load"));
  return { tracked: true, stages, active: p.active, blocking: blocking[0], reason: stale ? "STALE" : changed ? "SOURCE CHANGED" : "reported", invalid };
}
