#!/usr/bin/env node
// Minimal bridge to the Codex app-server, reusing the codex plugin's own
// client so we speak whatever protocol version that plugin was built for.
//
//   queue-add  <companionRoot> <cwd> <threadId> <clientId>   (message on stdin)
//   followups  <companionRoot> <cwd> <threadId> <clientIdPrefix>
//   skills-resolve <companionRoot> <cwd>   (JSON array of skill names on stdin)
//
// queue-add needs the codex plugin patched (patches/codex-plugin-queue-
// passthrough.patch): stock, the broker refuses the method while a turn is
// streaming and the server rejects it for want of the experimentalApi
// capability. followups works either way.
import { pathToFileURL } from "node:url";

const argv = process.argv.slice(2);
const anyPhase = argv.includes("--any-phase");
const [mode, companionRoot, cwd, threadId, clientArg] = argv.filter((a) => a !== "--any-phase");

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

if (!mode || !companionRoot || !cwd || (mode !== "skills-resolve" && !threadId)) {
  fail("usage: appserver-cli.mjs <queue-add|followups|steer> <companionRoot> <cwd> <threadId> <clientId> | skills-resolve <companionRoot> <cwd>");
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8").trim();
}

const clientUrl = pathToFileURL(`${companionRoot}/scripts/lib/app-server.mjs`).href;
let CodexAppServerClient;
try {
  ({ CodexAppServerClient } = await import(clientUrl));
} catch (error) {
  fail(`cannot load the codex app-server client from ${companionRoot}: ${error?.message ?? error}`);
}

let client = null;
try {
  // Discovery is read-only, so it gets its own app-server: a shared broker that
  // is streaming someone's turn answers "busy" to every other request.
  client = await CodexAppServerClient.connect(
    cwd,
    mode === "skills-resolve" ? { disableBroker: true } : { reuseExistingBroker: true }
  );

  if (mode === "skills-resolve") {
    // Prints the resolved [{name,path}] as JSON, or every problem on stderr
    // with exit 1, so the launch stops before any dependent review runs.
    const requested = JSON.parse((await readStdin()) || "[]");
    const listing = await client.request("skills/list", { cwds: [cwd], forceReload: true });
    const { resolveSkills } = await import(new URL("./skills-resolve.mjs", import.meta.url).href);
    const resolved = resolveSkills({ requested, entries: listing?.data, cwd });
    if (!resolved.ok) fail(resolved.problems.join("\n"));
    process.stdout.write(JSON.stringify(resolved.skills));
  } else if (mode === "steer") {
    // Interject into the turn that is already running. Unlike turn/interrupt
    // this stops nothing: the in-flight tool call finishes and the model reads
    // the message at its next step. turnId identifies the turn being steered,
    // so a turn that has since ended is rejected rather than silently missed.
    const text = await readStdin();
    if (!text) fail("steer: the message text was empty");
    const result = await client.request("turn/steer", {
      threadId,
      expectedTurnId: clientArg,
      input: [{ type: "text", text, text_elements: [] }]
    });
    process.stdout.write(JSON.stringify(result ?? {}));
  } else if (mode === "queue-add") {
    const text = await readStdin();
    if (!text) fail("queue-add: the message text was empty");
    const result = await client.request("thread/queue/add", {
      threadId,
      input: [{ type: "text", text, text_elements: [] }],
      clientUserMessageId: clientArg
    });
    process.stdout.write(String(result?.queuedSubmission?.id ?? ""));
  } else if (mode === "followups") {
    const result = await client.request("thread/turns/list", { threadId });
    const turns = Array.isArray(result?.data) ? result.data : [];
    const out = [];
    for (const turn of turns) {
      const items = Array.isArray(turn?.items) ? turn.items : [];
      const asked = items.find(
        (i) => i?.type === "userMessage" && String(i?.clientId ?? "").startsWith(clientArg)
      );
      if (!asked) continue;
      // A turn emits chatter before it emits its answer ("I'll now create..."),
      // so only phase:final_answer counts. Without this the caller captures a
      // preamble and reports the queued message as answered while it is still
      // being worked on. --any-phase relaxes it for a last-ditch read after the
      // caller has given up waiting.
      const answered = items.filter(
        (i) =>
          i?.type === "agentMessage" &&
          i?.text &&
          (anyPhase || i?.phase === "final_answer")
      );
      if (!answered.length) continue;
      out.push(`[${asked.clientId}] ${answered[answered.length - 1].text}`);
    }
    process.stdout.write(out.join("\n\n"));
  } else {
    fail(`unknown mode: ${mode}`);
  }
} catch (error) {
  fail(String(error?.message ?? error));
} finally {
  await client?.close().catch(() => {});
}
