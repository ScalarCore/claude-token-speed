/** One reply's speed: output tokens over the time the model spent writing them. */
export type Speed = {
  tokens: number
  generateMs: number
  firstTokenMs: number
  steps: number
}

/** The session's running totals, for the average. */
export type Totals = { tokens: number; generateMs: number; replies: number }

declare module 'claude-code' {
  interface PluginState {
    'token-speed': { last: Speed | null; totals: Totals; isHidden: boolean }
  }
}
