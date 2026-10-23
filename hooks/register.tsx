import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Speed, Totals } from '../types'

const last = atom({ plugin: 'token-speed', key: 'last' } as const, null)
const totals = atom({ plugin: 'token-speed', key: 'totals' } as const, {
  tokens: 0,
  generateMs: 0,
  replies: 0,
})
const isHidden = atom({ plugin: 'token-speed', key: 'isHidden' } as const, false)

const rate = (tokens: number, ms: number) =>
  ms > 0 ? (tokens / ms) * 1000 : 0

const seconds = (ms: number) => (ms / 1000).toFixed(1)

export const register: Register = on => {
  // What each running turn has added up so far, by turnId.
  const turns = new Map<string, Speed>()

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'token-speed',
      description: 'Show or hide the token speed band above the prompt',
    })

    return next(e)
  })

  on('command.run', { command: 'token-speed' }, async $ => {
    const wasHidden = await read($, isHidden)
    await update($, isHidden, () => !wasHidden)

    return { text: wasHidden ? 'Token speed band shown.' : 'Token speed band hidden.' }
  })

  on('turn.step', async function* ($, e, next) {
    if (e.agentId !== undefined) {
      return yield* next(e)
    }

    const sentAt = performance.now()
    let firstAt: number | undefined
    const stream = next(e)

    for await (const chunk of stream) {
      if (firstAt === undefined && chunk.kind !== 'engine' && chunk.kind !== 'stop') {
        firstAt = performance.now()
      }
      yield chunk
    }

    const doneAt = performance.now()
    const result = await stream.result
    const tokens = result.usage?.output_tokens ?? 0
    const turn = turns.get(e.turnId) ?? { tokens: 0, generateMs: 0, firstTokenMs: 0, steps: 0 }

    turns.set(e.turnId, {
      tokens: turn.tokens + tokens,
      generateMs: turn.generateMs + (doneAt - (firstAt ?? sentAt)),
      firstTokenMs: turn.steps === 0 ? (firstAt ?? doneAt) - sentAt : turn.firstTokenMs,
      steps: turn.steps + 1,
    })

    return result
  })

  on('turn.complete', async ($, e, next) => {
    const turn = e.agentId === undefined ? turns.get(e.turnId) : undefined
    turns.delete(e.turnId)

    if (turn !== undefined && turn.tokens > 0) {
      await update($, last, () => turn)
      await update($, totals, (sum): Totals => ({
        tokens: sum.tokens + turn.tokens,
        generateMs: sum.generateMs + turn.generateMs,
        replies: sum.replies + 1,
      }))
      $.ui.status(`${rate(turn.tokens, turn.generateMs).toFixed(1)} tok/s`)
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const speed = await read($, last)

    if (e.props.hasSurvey || speed === null || (await read($, isHidden))) {
      return next(e)
    }

    const sum = await read($, totals)
    const { Box, Button, Text } = $.ui.resolve(e)

    return (
      <Box>
        <Text bold>⚡ {rate(speed.tokens, speed.generateMs).toFixed(1)} tok/s</Text>
        <Text dimColor>
          {'  '}上条回复 {speed.tokens.toLocaleString()} tokens · 生成 {seconds(speed.generateMs)}s · 首字{' '}
          {seconds(speed.firstTokenMs)}s · {speed.steps} 次请求 · 本会话平均{' '}
          {rate(sum.tokens, sum.generateMs).toFixed(1)} tok/s（{sum.replies} 条）{' '}
        </Text>
        <Button key="hide" label="隐藏" onPress={() => update($, isHidden, () => true)} />
      </Box>
    )
  })
}
