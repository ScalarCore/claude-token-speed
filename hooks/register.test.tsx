import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'token-speed',
  component: 'AbovePrompt',
  requestId: 'above-prompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 3,
    bodyColumns: 120,
    scroll: { offset: 0, bodyRows: 3 },
    view: {},
  },
} as const

const usage = (output_tokens: number) => ({
  model: 'claude-opus-5-5',
  input_tokens: 10,
  output_tokens,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
})

const step = async ($: any, turnId: string, index: number) => {
  const stream = $.turn.step({ turnId, index, model: 'claude-opus-5-5', messageCount: 1 })
  for await (const _ of stream) {
    // drain
  }
  return stream.result
}

test('the band shows the reply speed after a turn', async ($, on) => {
  on('command.register', () => ({ value: { command: 'token-speed' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.step', async function* (_, e) {
    yield { kind: 'text', index: 0, text: 'hello' }
    return {
      turnId: e.turnId,
      index: e.index,
      answer: 'hello',
      toolUses: [],
      stopReason: 'end_turn',
      usage: usage(e.index === 0 ? 100 : 200),
    }
  })
  on('turn.complete', () => ({ text: 'hello' }))
  on('command.run', () => ({ text: '' }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const empty = await $.ui.mount({ ...BAND, surface })
    expect(await empty.find({ type: 'Text', text: /tok\/s/ })).toBeUndefined()
    await empty.unmount()
  }

  await step($, 't1', 0)
  await step($, 't1', 1)
  await $.turn.complete({
    turnId: 't1',
    answer: 'hello',
    durationMs: 1000,
    isAborted: false,
    reason: 'answer',
  })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    const detail = await ui.find({ type: 'Text', text: /上条回复/ })
    expect(detail?.text).toMatch(/300 tokens/)
    expect(detail?.text).toMatch(/2 次请求/)
    expect(detail?.text).toMatch(/（1 条）/)
    expect(await ui.find({ type: 'Text', text: /⚡/ })).toBeDefined()

    await ui.press({ key: 'hide' })
    await ui.unmount()

    const hidden = await $.ui.mount({ ...BAND, surface })
    expect(await hidden.find({ type: 'Text', text: /上条回复/ })).toBeUndefined()
    await hidden.unmount()

    await $.command.run({ command: 'token-speed', args: '' })
  }
})
