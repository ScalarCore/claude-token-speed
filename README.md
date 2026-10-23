# token-speed

A Claude Code mod that shows how fast each reply was generated, in a band above the prompt:

```
⚡ 68.3 tok/s  上条回复 1,234 tokens · 生成 18.1s · 首字 1.2s · 3 次请求 · 本会话平均 72.0 tok/s（5 条） [隐藏]
```

- **tok/s**: output tokens divided by the time the model spent writing them (the wait for the first token is not counted). Thinking tokens are included.
- **首字** (first token): time from sending the request to the first streamed piece.
- **次请求** (requests): a reply that uses tools makes several model requests; they are summed.
- **本会话平均** (session average): all replies in this session.
- Only the main conversation is counted, not subagents.

Press **隐藏** to hide the band; run `/token-speed` to show or hide it again.

## Install

At the prompt of a terminal session:

```
/plugin install token-speed --marketplace ScalarCore/claude-token-speed
```

From a shell:

```bash
claude plugin install token-speed --marketplace ScalarCore/claude-token-speed
```

In the Claude desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `ScalarCore/claude-token-speed`, then Add plugin.

Answer `y` to add the marketplace, then pick a scope (user scope loads it in every session).

## License

MIT
