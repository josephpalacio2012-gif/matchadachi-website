// Writes recommendations-table.csv: the result for every possible set of answers.
import { writeFileSync } from 'node:fs'
import { it } from 'vitest'
import { type Answers, questions, recommend } from './recommend'

it('writes recommendations-table.csv', () => {
  const label = (q: number, id: string) => questions[q].options.find((o) => o.id === id)!.label
  const rows = [['Q1 experience', 'Q2 flavor', 'Q3 sweetness', 'Q4 familiarity', 'Q5 mood', 'Persona', 'Main drink', 'Second pick']]
  const walk = (i: number, acc: string[]) => {
    if (i === questions.length) {
      const a = Object.fromEntries(questions.map((q, k) => [q.id, acc[k]])) as Answers
      const r = recommend(a)
      rows.push([...acc.map((id, k) => label(k, id)), r.persona.name, r.primary.displayName, r.secondary?.displayName ?? ''])
      return
    }
    for (const o of questions[i].options) walk(i + 1, [...acc, o.id])
  }
  walk(0, [])
  writeFileSync('recommendations-table.csv', rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n'))
})
