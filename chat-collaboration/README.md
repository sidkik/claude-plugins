# chat-collaboration

General chat behavior, independent of any workflow or process.

- `chat-collaboration:listener` agent: a concise router. It invokes the skill below, reads its full source and answers.
- `chat-collaboration:listen` skill: owns the participation semantics and the output contract.

The listener observes a shared conversation between humans and privately answers whether the native agent should contribute, with three keys: `forwardToAgent` (boolean), `messageIds` (the trigger) and `contextMessageIds` (the undelivered human messages the agent needs, including contributions that are not requests). IDs are decimal strings. The supervisor forwards the selected originals with author and order and tracks delivery; unrelated conversation stays with the listener. It does no work, posts nothing publicly and changes no permissions. Delivery, queuing and correlation belong to the supervisor that runs it. The agent inherits the session model, so choose one explicitly when launching it (for example `--model`).

Structural check: `node --test chat-collaboration/tests/*.test.mjs`. It covers package validity only; model behavior and native skill loading need their own evidence.
