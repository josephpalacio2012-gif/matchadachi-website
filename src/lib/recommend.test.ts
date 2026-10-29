import { describe, expect, it } from 'vitest'
import {
  type Answers,
  isAvailable,
  products,
  questions,
  recommend,
  rules,
} from './recommend'

function allCombinations(): Answers[] {
  const out: Answers[] = []
  const walk = (i: number, acc: Partial<Answers>) => {
    if (i === questions.length) return void out.push(acc as Answers)
    for (const o of questions[i].options) walk(i + 1, { ...acc, [questions[i].id]: o.id })
  }
  walk(0, {})
  return out
}

const combos = allCombinations()

describe('quiz recommendations', () => {
  it('covers every combination (3 × 2 × 3 × 3 × 3 = 162)', () => {
    expect(combos.length).toBe(162)
  })

  it('every rule in rules.json points at a drink and version that is actually sold', () => {
    for (const r of rules) {
      expect(isAvailable(r.primary.product, r.primary.variant), JSON.stringify(r.primary)).toBe(true)
      if (r.secondary)
        expect(isAvailable(r.secondary.product, r.secondary.variant), JSON.stringify(r.secondary)).toBe(true)
    }
  })

  it.each(combos.map((c) => [Object.values(c).join(' / '), c] as const))(
    '%s → a real, consistent recommendation',
    (_label, answers) => {
      const rec = recommend(answers)
      // Stage 1: Q1 alone decides the persona
      const expected = { smooth: 'curious', strong: 'craver', complex: 'aficionado' }[answers.q1]
      expect(rec.persona.id).toBe(expected)

      // Primary drink is at the persona's own level and actually sold
      expect(rec.primary.variant).toBe(rec.persona.variant)
      expect(isAvailable(rec.primary.product.id, rec.primary.variant)).toBe(true)
      if (rec.secondary) {
        expect(isAvailable(rec.secondary.product.id, rec.secondary.variant)).toBe(true)
        expect(rec.secondary.photoKey).not.toBe(rec.primary.photoKey)
      }

      // Q5 "new" never pushes Curious/Craver into Japan Blend
      if (rec.persona.id !== 'aficionado') {
        expect(rec.primary.variant).not.toBe('JB')
        expect(rec.secondary?.variant).not.toBe('JB')
      }

      // Hojicha is never presented as Japan Blend matcha
      for (const p of [rec.primary, rec.secondary, ...rec.others]) {
        if (p?.product.id === 'hojicha') expect(p.displayName).not.toMatch(/Japan Blend/)
      }

      // Q4 never changes the drink, only the explanation depth
      for (const q4 of ['new', 'sometimes', 'regular']) {
        const r2 = recommend({ ...answers, q4 })
        expect(r2.primary.photoKey).toBe(rec.primary.photoKey)
        expect(r2.persona.id).toBe(rec.persona.id)
      }
    },
  )

  it('brief example: Craver + new + sweet → Marokokucha Level 2', () => {
    const r = recommend({ q1: 'strong', q2: 'classic', q3: 'sweet', q4: 'regular', q5: 'new' })
    expect(r.primary.displayName).toBe('Marokokucha Level 2')
  })

  it('brief example: Craver wanting something new and refreshing → Cococha Level 2', () => {
    const r = recommend({ q1: 'strong', q2: 'fruity', q3: 'balanced', q4: 'regular', q5: 'new' })
    expect(r.primary.displayName).toBe('Cococha Level 2')
  })

  it('a newcomer can still be an Aficionado (Q4 never blocks Japan Blend)', () => {
    const r = recommend({ q1: 'complex', q2: 'classic', q3: 'less', q4: 'new', q5: 'familiar' })
    expect(r.persona.id).toBe('aficionado')
    expect(r.primary.variant).toBe('JB')
  })

  it('Aficionado + something new → Japan Blend primary, Hojicha as roasted-tea alternative', () => {
    const r = recommend({ q1: 'complex', q2: 'classic', q3: 'sweet', q4: 'regular', q5: 'new' })
    expect(r.primary.variant).toBe('JB')
    expect(r.secondary?.product.id).toBe('hojicha')
  })

  it('every matcha drink is reachable as a primary or secondary pick', () => {
    const reached = new Set<string>()
    for (const c of combos) {
      const r = recommend(c)
      reached.add(r.primary.product.id)
      if (r.secondary) reached.add(r.secondary.product.id)
    }
    for (const p of products) expect(reached, p.id).toContain(p.id)
  })
})
