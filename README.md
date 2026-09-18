# sidkik-plugins

Claude Code plugin marketplace for Sidkik.

```bash
claude plugin marketplace add sidkik/claude-plugins
```

## Plugins

| Plugin | Description |
|---|---|
| [codex-crew](codex-crew/) | Tiered Codex delegate agents (implementer-astra / implementer-sol / implementer-terra / implementer-luna / reviewer) across the GPT-6 / GPT-5.6 ladder — Astra at medium, the 5.6 lanes at xhigh — with per-tier selection criteria in each agent description, riding the official `codex@openai-codex` plugin's companion runtime |
| [grok-crew](grok-crew/) | Claude → Grok inject **contract** (v0.0.1, skill only). Name the channel before proposing steer. Claude launched Grok jobs have no inject command; `grok -p` and Grok native subagent steer are other channels |

```bash
claude plugin install codex-crew@sidkik-plugins
claude plugin install grok-crew@sidkik-plugins
```
