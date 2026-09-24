# sidkik-plugins

Claude Code plugin marketplace for Sidkik.

```bash
claude plugin marketplace add sidkik/claude-plugins
```

## Plugins

| Plugin | Description |
|---|---|
| [codex-crew](codex-crew/) | Tiered Codex delegate agents (implementer-astra / implementer-sol / implementer-terra / implementer-luna / reviewer). Astra, Sol, and Luna are GPT-6; Terra stays GPT-5.6 because there is no GPT-6 Terra. Astra at medium, the other lanes at xhigh. |
| [grok-crew](grok-crew/) | Claude → Grok inject **contract** (v0.0.1, skill only). Name the channel before proposing steer. Claude launched Grok jobs have no inject command; `grok -p` and Grok native subagent steer are other channels |
| [sdlc-status](sdlc-status/) | Per-session SDLC phase, attributed checks, next action and human decisions. Manual Claude/Grok footer setup; Codex text fallback. |

```bash
claude plugin install codex-crew@sidkik-plugins
claude plugin install grok-crew@sidkik-plugins
```
