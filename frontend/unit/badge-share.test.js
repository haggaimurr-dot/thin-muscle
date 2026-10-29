import { test } from 'node:test'
import assert from 'node:assert/strict'
import { badgeShareSvg } from '../src/badge-share.js'
test('share card uses explicit public fields and escapes injected text', () => {
  const svg = badgeShareSvg({
    title: '<script>bad</script>',
    description: 'Rule & test',
    category: '训练',
    earned_at: '2026-01-01',
    user_id: 'SECRET-ACCOUNT',
    nickname: 'PRIVATE-NAME',
    body_kg: 66,
  })
  assert.ok(svg.includes('&lt;script&gt;'))
  assert.ok(svg.includes('Rule &amp; test'))
  assert.ok(!svg.includes('SECRET-ACCOUNT') && !svg.includes('PRIVATE-NAME'))
  assert.throws(() => badgeShareSvg({ title: 'unearned' }))
})
