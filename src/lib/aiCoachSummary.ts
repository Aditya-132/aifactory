/**
 * Post-workout coaching summary — pure prompt builder and response parser.
 *
 * This module has no side effects and no environment access, so it is safe to
 * import from the client bundle. The actual LLM call lives server-side in
 * `vite-plugins/aiCoachSummaryApi.ts`, which keeps the provider API key out
 * of the browser.
 */

export const SUMMARY_BULLET_COUNT = 3

export type CoachSummaryBullet = string

const SYSTEM_INSTRUCTIONS = [
  'You are a strength coach writing a post-workout debrief.',
  `Write exactly ${SUMMARY_BULLET_COUNT} bullet points summarizing the lifter's session.`,
  'Each bullet must be a single concise sentence (max 20 words).',
  'Lead with what went well, then the most important correction, then one actionable focus for next session.',
  'Do not number the bullets, do not add a heading, do not add any other text.',
].join(' ')

/**
 * Builds the user prompt from the live coaching feed shown during the set.
 * Messages are listed verbatim and in order so the model can weigh recurring
 * cues more heavily than one-off observations.
 */
export function buildCoachSummaryPrompt(feedMessages: string[]): string {
  if (feedMessages.length === 0) {
    return `${SYSTEM_INSTRUCTIONS}\n\nNo coaching cues were recorded this session. Write a generic but useful ${SUMMARY_BULLET_COUNT}-bullet debrief acknowledging the completed set.`
  }

  const lines = feedMessages.map((message, index) => `${index + 1}. ${message}`).join('\n')
  return `${SYSTEM_INSTRUCTIONS}\n\nLive coaching feed from the session (chronological):\n${lines}`
}

/**
 * Validates and normalizes the parsed JSON body returned by the server.
 * Returns null when the payload is not exactly three non-empty strings.
 */
export function parseCoachSummaryResponse(payload: unknown): CoachSummaryBullet[] | null {
  if (typeof payload !== 'object' || payload === null) return null
  const bullets = (payload as { bullets?: unknown }).bullets
  if (!Array.isArray(bullets) || bullets.length !== SUMMARY_BULLET_COUNT) return null

  const trimmed = bullets.map((bullet) => (typeof bullet === 'string' ? bullet.trim() : ''))
  if (trimmed.some((bullet) => bullet.length === 0)) return null
  return trimmed
}
