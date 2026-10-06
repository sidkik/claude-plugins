// Decide whether each required skill can be invoked natively at a worker cwd.
//
// Input is the app-server's own skills/list answer, so identity and path come
// from Codex's discovery at that cwd, never from a file the dispatcher chose to
// read. Every failure names the skill and the reason; nothing falls back to
// "read the SKILL.md instead", which would not be an invocation.
import fs from "node:fs";
import path from "node:path";

function frontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  return match ? match[1] : "";
}

// A skill whose author reserved invocation for the human. A delegated worker
// carries no human authority, so the dispatcher hands this back instead.
function isUserOnly(skillPath, readFile) {
  let text;
  try {
    text = readFile(skillPath);
  } catch {
    return false;
  }
  return /^disable-model-invocation:\s*true\s*$/m.test(frontmatter(text));
}

function matches(skill, requested) {
  if (skill.name === requested) return true;
  const plugin = typeof skill.pluginId === "string" ? skill.pluginId.split("@")[0] : "";
  return plugin !== "" && `${plugin}:${skill.name}` === requested;
}

export function resolveSkills({ requested, entries, cwd, readFile = (p) => fs.readFileSync(p, "utf8") }) {
  const entry = (entries ?? []).find((e) => e?.cwd === cwd) ?? (entries?.length === 1 ? entries[0] : null);
  if (!entry) {
    return { ok: false, skills: [], problems: [`skills/list returned no entry for cwd ${cwd}`] };
  }
  const listed = Array.isArray(entry.skills) ? entry.skills : [];
  const problems = [];
  const skills = [];
  for (const name of requested) {
    const found = listed.filter((s) => matches(s, name));
    const enabled = found.filter((s) => s.enabled === true);
    if (found.length === 0) {
      const hint = (entry.errors ?? []).filter((e) => String(e?.path ?? "").includes(name));
      const why = hint.length ? `; discovery errors: ${hint.map((e) => `${e.path}: ${e.message}`).join("; ")}` : "";
      problems.push(`skill "${name}" is not discovered at ${cwd}${why}`);
    } else if (enabled.length === 0) {
      problems.push(`skill "${name}" is discovered at ${cwd} but disabled (${found.map((s) => s.path).join(", ")})`);
    } else if (enabled.length > 1) {
      const where = enabled.map((s) => `${s.scope}:${s.path}`).join(", ");
      problems.push(`skill "${name}" is ambiguous at ${cwd}: ${where}; qualify it as <plugin>:<name> or remove the duplicate`);
    } else if (!path.isAbsolute(enabled[0].path)) {
      problems.push(`skill "${name}" has a non-absolute discovered path ${enabled[0].path}`);
    } else if (isUserOnly(enabled[0].path, readFile)) {
      problems.push(
        `skill "${name}" is user-only (disable-model-invocation); a delegated worker cannot invoke it. ` +
          `Hand the invocation to the user and hold the dependent action`
      );
    } else {
      // `requested` is the identity the caller asked for (plugin-qualified when it
      // was), so a resume or redirect resolves the same source again.
      skills.push({ name: enabled[0].name, path: enabled[0].path, requested: name });
    }
  }
  return { ok: problems.length === 0, skills, problems };
}
