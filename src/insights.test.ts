import { describe, it, expect, beforeEach } from 'vitest'
import { addDays, format, parseISO, subDays } from 'date-fns'
import { detectTriggers } from './insights'
import type { BowelRating, CheckinPeriod, DailyCheckin, FoodEntry } from './types'

let seq = 0

const BASE = '2026-06-01'
const day = (i: number) => format(addDays(parseISO(BASE), i), 'yyyy-MM-dd')

function food(date: string, tags: string[]): FoodEntry {
  return {
    id: `f${seq++}`,
    date,
    meal: 'lunch',
    description: 'test meal',
    tags,
    createdAt: `${date}T12:00:00.000Z`,
  }
}

function checkin(
  date: string,
  period: CheckinPeriod,
  overrides: Partial<DailyCheckin> = {},
): DailyCheckin {
  return {
    id: `c${seq++}`,
    date,
    period,
    sleepQuality: 3,
    energy: 3,
    mood: 3,
    pain: 3,
    bowel: 3,
    notes: '',
    customLabels: {},
    customDirections: {},
    extraMetrics: [],
    createdAt: `${date}T20:00:00.000Z`,
    ...overrides,
  }
}

/** 12 days: `tags` eaten on even days, plain food on odd days. */
function twelveDays(
  tags: string[],
  painWith: number,
  painWithout: number,
): { foods: FoodEntry[]; checkins: DailyCheckin[] } {
  const foods: FoodEntry[] = []
  const checkins: DailyCheckin[] = []
  for (let i = 0; i < 12; i++) {
    const hasTag = i % 2 === 0
    foods.push(food(day(i), hasTag ? tags : []))
    checkins.push(checkin(day(i), 'evening', { pain: hasTag ? painWith : painWithout }))
  }
  return { foods, checkins }
}

beforeEach(() => {
  localStorage.clear()
})

describe('detectTriggers', () => {
  it('returns nothing for empty input', () => {
    expect(detectTriggers([], [])).toEqual([])
    expect(detectTriggers([food(day(0), ['dairy'])], [])).toEqual([])
    expect(detectTriggers([], [checkin(day(0), 'evening')])).toEqual([])
  })

  it('finds a same-day trigger with correct averages and lag', () => {
    const { foods, checkins } = twelveDays(['dairy'], 5, 1)
    const insights = detectTriggers(foods, checkins)
    expect(insights).toHaveLength(1)
    const ins = insights[0]
    expect(ins.tag).toBe('dairy')
    expect(ins.symptom).toBe('Pain')
    expect(ins.lag).toBe('same_day')
    expect(ins.occurrences).toBe(6)
    expect(ins.avgSymptomAfter).toBe(5)
    expect(ins.avgSymptomWithout).toBe(1)
    expect(ins.score).toBeGreaterThan(0.4)
  })

  it('reports nothing when symptoms are unrelated to the tag', () => {
    const foods: FoodEntry[] = []
    const checkins: DailyCheckin[] = []
    for (let i = 0; i < 12; i++) {
      foods.push(food(day(i), i % 2 === 0 ? ['dairy'] : []))
      // pain alternates 2/4 with equal means in both buckets
      checkins.push(checkin(day(i), 'evening', { pain: i % 4 < 2 ? 2 : 4 }))
    }
    expect(detectTriggers(foods, checkins)).toEqual([])
  })

  it('normalizes higher_better metrics (low energy after a food is a trigger)', () => {
    const foods: FoodEntry[] = []
    const checkins: DailyCheckin[] = []
    for (let i = 0; i < 12; i++) {
      const hasTag = i % 2 === 0
      foods.push(food(day(i), hasTag ? ['dairy'] : []))
      checkins.push(checkin(day(i), 'evening', { energy: hasTag ? 1 : 5 }))
    }
    const insights = detectTriggers(foods, checkins)
    expect(insights).toHaveLength(1)
    expect(insights[0].symptom).toBe('Low Energy')
  })

  it('never reports foods that make you feel better', () => {
    const foods: FoodEntry[] = []
    const checkins: DailyCheckin[] = []
    for (let i = 0; i < 12; i++) {
      const hasTag = i % 2 === 0
      foods.push(food(day(i), hasTag ? ['dairy'] : []))
      checkins.push(checkin(day(i), 'evening', { energy: hasTag ? 5 : 1 }))
    }
    expect(detectTriggers(foods, checkins)).toEqual([])
  })

  it('respects per-checkin customDirections over legacy defaults', () => {
    // pain flagged as higher_better on every check-in: high "pain" with dairy
    // now means dairy is fine — no insight.
    const { foods, checkins } = twelveDays(['dairy'], 5, 1)
    const flipped = checkins.map((c) => ({
      ...c,
      customDirections: { pain: 'higher_better' as const },
    }))
    expect(detectTriggers(foods, flipped)).toEqual([])
  })

  it('attributes morning symptoms to the previous day (next_morning lag)', () => {
    const foods: FoodEntry[] = []
    const checkins: DailyCheckin[] = []
    for (let i = 0; i < 12; i++) {
      const hasTag = i % 2 === 0
      foods.push(food(day(i), hasTag ? ['dairy'] : []))
      // morning check-in the NEXT day reflects yesterday's food
      checkins.push(checkin(day(i + 1), 'morning', { pain: hasTag ? 5 : 1 }))
    }
    const insights = detectTriggers(foods, checkins)
    expect(insights).toHaveLength(1)
    expect(insights[0].lag).toBe('next_morning')
    expect(insights[0].tag).toBe('dairy')
  })

  it('ignores unanswered (0) ratings from partial check-ins', () => {
    const foods: FoodEntry[] = []
    const checkins: DailyCheckin[] = []
    for (let i = 0; i < 12; i++) {
      const hasTag = i % 2 === 0
      foods.push(food(day(i), hasTag ? ['dairy'] : []))
      checkins.push(
        checkin(day(i), 'evening', {
          pain: 0, // unanswered — a perfect correlation here must not count
          sleepQuality: 0,
          energy: 0,
          mood: 0,
          bowel: 0 as unknown as BowelRating, // unanswered
        }),
      )
    }
    expect(detectTriggers(foods, checkins)).toEqual([])
  })

  it('collapses tags that always co-occur into one insight', () => {
    const { foods, checkins } = twelveDays(['bread', 'gluten'], 5, 1)
    const insights = detectTriggers(foods, checkins)
    expect(insights).toHaveLength(1)
    expect(insights[0].label).toContain('/')
    expect(insights[0].label).toMatch(/Bread|Gluten/)
  })

  it('excludes tags below the 10% base rate even with a huge effect', () => {
    const foods: FoodEntry[] = []
    const checkins: DailyCheckin[] = []
    for (let i = 0; i < 40; i++) {
      const hasTag = i < 3 // 3 of 40 days = 7.5%
      foods.push(food(day(i), hasTag ? ['dairy'] : []))
      checkins.push(checkin(day(i), 'evening', { pain: hasTag ? 5 : 1 }))
    }
    expect(detectTriggers(foods, checkins)).toEqual([])
  })

  it('ignores data older than the 60-day window', () => {
    const foods: FoodEntry[] = []
    const checkins: DailyCheckin[] = []
    const today = format(new Date(), 'yyyy-MM-dd')
    // Strong signal ~100 days ago
    for (let i = 0; i < 12; i++) {
      const d = format(subDays(parseISO(today), 100 - i), 'yyyy-MM-dd')
      const hasTag = i % 2 === 0
      foods.push(food(d, hasTag ? ['dairy'] : []))
      checkins.push(checkin(d, 'evening', { pain: hasTag ? 5 : 1 }))
    }
    // Bland recent data anchoring the window at today
    for (let i = 0; i < 10; i++) {
      const d = format(subDays(parseISO(today), i), 'yyyy-MM-dd')
      foods.push(food(d, []))
      checkins.push(checkin(d, 'evening'))
    }
    expect(detectTriggers(foods, checkins)).toEqual([])
  })

  it('boosts confidence when multi-serving days are worse (dose-response)', () => {
    // Scenario A: single servings, pain [4,4,4,3,3,3] with dairy, 3 without.
    const foodsA: FoodEntry[] = []
    const checkinsA: DailyCheckin[] = []
    for (let i = 0; i < 12; i++) {
      const hasTag = i % 2 === 0
      foodsA.push(food(day(i), hasTag ? ['dairy'] : []))
      checkinsA.push(checkin(day(i), 'evening', { pain: hasTag ? (i < 6 ? 4 : 3) : 3 }))
    }
    // Scenario B: same symptom values, but the pain-4 days had TWO servings.
    const foodsB: FoodEntry[] = []
    const checkinsB: DailyCheckin[] = []
    for (let i = 0; i < 12; i++) {
      const hasTag = i % 2 === 0
      if (hasTag && i < 6) {
        foodsB.push(food(day(i), ['dairy']))
        foodsB.push(food(day(i), ['dairy']))
      } else {
        foodsB.push(food(day(i), hasTag ? ['dairy'] : []))
      }
      checkinsB.push(checkin(day(i), 'evening', { pain: hasTag ? (i < 6 ? 4 : 3) : 3 }))
    }
    const a = detectTriggers(foodsA, checkinsA)
    const b = detectTriggers(foodsB, checkinsB)
    expect(a).toHaveLength(1)
    expect(b).toHaveLength(1)
    expect(b[0].score).toBeGreaterThan(a[0].score)
  })

  it('keeps modest small-sample effects below "strong pattern" confidence', () => {
    // 3 tag days, modest 0.5-point effect with some variance
    const foods: FoodEntry[] = []
    const checkins: DailyCheckin[] = []
    const painWith = [4, 3, 4]
    let w = 0
    for (let i = 0; i < 10; i++) {
      const hasTag = i < 3
      foods.push(food(day(i), hasTag ? ['dairy'] : []))
      checkins.push(checkin(day(i), 'evening', { pain: hasTag ? painWith[w++] ?? 3 : 3 }))
    }
    const insights = detectTriggers(foods, checkins)
    for (const ins of insights) {
      expect(ins.score).toBeLessThan(0.7)
    }
  })
})
