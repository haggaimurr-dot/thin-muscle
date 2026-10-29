import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergeSnapshots } from '../src/sync-merge.js'
test('merge independent records, deletions and fields without overriding conflicts', () => {
  const base = {
    logs: [
      { id: 'a', reps: 5 },
      { id: 'b', reps: 6 },
    ],
    target: 100,
  }
  const local = { logs: [{ id: 'a', reps: 7 }], target: 100 }
  const remote = {
    logs: [
      { id: 'a', reps: 5 },
      { id: 'b', reps: 6 },
      { id: 'c', reps: 8 },
    ],
    target: 120,
  }
  const out = mergeSnapshots(base, local, remote)
  assert.equal(out.conflicts.length, 0)
  assert.deepEqual(out.data, {
    logs: [
      { id: 'a', reps: 7 },
      { id: 'c', reps: 8 },
    ],
    target: 120,
  })
  const edited = {
    ...remote,
    logs: [
      { id: 'a', reps: 5 },
      { id: 'b', reps: 9 },
    ],
  }
  const conflict = mergeSnapshots(base, local, edited)
  assert.equal(conflict.conflicts[0].path, '/logs/@b')
  assert.equal(conflict.conflicts[0].deleted, true)
  assert.deepEqual(mergeSnapshots(base, local, edited, { '/logs/@b': 'remote' }).data.logs[1], {
    id: 'b',
    reps: 9,
  })
  const both = mergeSnapshots({ a: 1 }, { a: 2 }, { a: 3 })
  assert.equal(both.conflicts.length, 1)
  assert.equal(mergeSnapshots({ a: 1 }, { a: 2 }, { a: 3 }, { '/a': 'local' }).data.a, 2)
})
