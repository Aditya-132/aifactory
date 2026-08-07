import { describe, expect, it } from 'vitest'

import {
  buildCoachSummaryPrompt,
  parseCoachSummaryResponse,
  SUMMARY_BULLET_COUNT,
} from './aiCoachSummary'

describe('buildCoachSummaryPrompt', () => {
  it('lists the feed messages in order', () => {
    const prompt = buildCoachSummaryPrompt([
      'Knees caving inward on the descent',
      'Strong lockout — keep that tension',
    ])

    expect(prompt).toContain('1. Knees caving inward on the descent')
    expect(prompt).toContain('2. Strong lockout — keep that tension')
    expect(prompt).toContain(String(SUMMARY_BULLET_COUNT))
  })

  it('handles an empty feed without producing message lines', () => {
    const prompt = buildCoachSummaryPrompt([])
    expect(prompt).not.toMatch(/\d+\. /)
    expect(prompt).toContain('no coaching cues were recorded')
  })
})

describe('parseCoachSummaryResponse', () => {
  it('parses three trimmed bullets from a valid payload', () => {
    const bullets = parseCoachSummaryResponse({
      bullets: [' Depth hit every rep ', 'Brace harder at the bottom', 'Add a pause squat'],
    })
    expect(bullets).toEqual([
      'Depth hit every rep',
      'Brace harder at the bottom',
      'Add a pause squat',
    ])
  })

  it('returns null when the payload shape is wrong', () => {
    expect(parseCoachSummaryResponse(null)).toBeNull()
    expect(parseCoachSummaryResponse({})).toBeNull()
    expect(parseCoachSummaryResponse({ bullets: 'not-an-array' })).toBeNull()
    expect(parseCoachSummaryResponse({ bullets: ['a', 'b'] })).toBeNull()
    expect(parseCoachSummaryResponse({ bullets: ['a', 'b', 'c', 'd'] })).toBeNull()
    expect(parseCoachSummaryResponse({ bullets: ['a', 2, 'c'] })).toBeNull()
  })

  it('returns null when any bullet is blank after trimming', () => {
    expect(parseCoachSummaryResponse({ bullets: ['a', '   ', 'c'] })).toBeNull()
  })
})
