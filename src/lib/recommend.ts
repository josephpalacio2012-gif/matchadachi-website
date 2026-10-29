import productsData from '../config/products.json'
import personasData from '../config/personas.json'
import rulesData from '../config/rules.json'
import photosData from '../config/photos.json'
import quizData from '../config/quiz.json'

export type Variant = 'L1' | 'L2' | 'JB' | 'STD'
export type QuestionId = 'q1' | 'q2' | 'q3' | 'q4' | 'q5'
export type Answers = Record<QuestionId, string>

export interface Product {
  id: string
  name: string
  description: string
  kind: 'matcha' | 'roasted'
  kindLabel?: string
  variants: Variant[]
}

export interface Persona {
  id: string
  name: string
  q1Answer: string
  variant: Variant
  blend: string
  profile: string
  headline: string
  explainShort: string
  explainLong: string
  bolderVariant?: Variant
}

export interface DrinkPick {
  product: Product
  variant: Variant
  /** e.g. "Marokokucha Level 2", "Ichicha Japan Blend", "Hojicha" */
  displayName: string
  variantLabel: string
  blendNote: string
  photo: string | null
  photoKey: string
}

export interface Recommendation {
  persona: Persona
  primary: DrinkPick
  secondary: DrinkPick | null
  why: string
  /** Other drinks at the persona's level, for "Try Another Matcha" */
  others: DrinkPick[]
  depth: 'full' | 'standard' | 'brief'
  ruleIndex: number
}

interface Rule {
  persona: string
  when: Partial<Record<QuestionId, string[]>>
  primary: { product: string; variant: string }
  secondary?: { product: string; variant: string }
  why: string
}

export const products = productsData.products as Product[]
export const personas = personasData.personas as Persona[]
export const rules = rulesData.rules as Rule[]
export const questions = quizData.questions as {
  id: QuestionId
  text: string
  options: { id: string; label: string }[]
}[]
const variantLabels = productsData.variantLabels as Record<Variant, string>
const blendNotes = productsData.blendNotes as Record<string, string>
const photos = photosData as unknown as Record<string, string>
export const levelPrimer = personasData.levelPrimer

export function findProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id)
}

export function isAvailable(productId: string, variant: string): boolean {
  const p = findProduct(productId)
  return !!p && p.variants.includes(variant as Variant)
}

export function makePick(productId: string, variant: string): DrinkPick {
  const product = findProduct(productId)
  if (!product) throw new Error(`Unknown product "${productId}" in rules.json`)
  if (!product.variants.includes(variant as Variant)) {
    throw new Error(`${product.name} is not sold as "${variant}" (check products.json)`)
  }
  const v = variant as Variant
  const label = variantLabels[v] ?? ''
  const key = `${product.id}.${v}`
  const file = photos[key]
  return {
    product,
    variant: v,
    variantLabel: label,
    displayName: label ? `${product.name} ${label}` : product.name,
    blendNote: blendNotes[v] ?? '',
    photo: file ? file : null,
    photoKey: key,
  }
}

export function personaFor(answers: { q1: string }): Persona {
  const persona = personas.find((p) => p.q1Answer === answers.q1)
  if (!persona) throw new Error(`No persona for Q1 answer "${answers.q1}"`)
  return persona
}

function ruleMatches(rule: Rule, answers: Answers): boolean {
  return (Object.keys(rule.when) as QuestionId[]).every((q) =>
    (rule.when[q] ?? []).includes(answers[q]),
  )
}

/** Stage 1 (persona from Q1) + Stage 2 (drink from Q2, Q3, Q5). Q4 only sets explanation depth. */
export function recommend(answers: Answers): Recommendation {
  const persona = personaFor(answers)
  const ruleIndex = rules.findIndex((r) => r.persona === persona.id && ruleMatches(r, answers))
  if (ruleIndex < 0) throw new Error(`No rule matched for ${persona.id}; add a fallback rule`)
  const rule = rules[ruleIndex]

  const primary = makePick(rule.primary.product, rule.primary.variant)
  let secondary = rule.secondary ? makePick(rule.secondary.product, rule.secondary.variant) : null

  // "A bolder version of my usual": offer the same drink one step stronger, where it exists.
  if (
    answers.q5 === 'bolder' &&
    persona.bolderVariant &&
    isAvailable(primary.product.id, persona.bolderVariant)
  ) {
    secondary = makePick(primary.product.id, persona.bolderVariant)
  }

  const shown = new Set([primary.photoKey, secondary?.photoKey])
  const others = products
    .filter((p) => p.kind === 'matcha' && p.variants.includes(persona.variant))
    .map((p) => makePick(p.id, persona.variant))
    .filter((pick) => !shown.has(pick.photoKey))

  const depthMap = personasData.explanationDepth as Record<string, string>
  const depth = (depthMap[answers.q4] ?? 'standard') as Recommendation['depth']

  return { persona, primary, secondary, why: rule.why, others, depth, ruleIndex }
}

export function missingPhotos(): string[] {
  const keys: string[] = []
  for (const p of products) for (const v of p.variants) keys.push(`${p.id}.${v}`)
  return keys.filter((k) => !photos[k])
}
