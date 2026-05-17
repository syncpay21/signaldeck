import { Framework, FrameworkContext } from './types'

const norm = (s: string | undefined) => (s || '').trim().toLowerCase()
const normList = (xs?: string[]) => (xs || []).map(norm)

function matches(value: string | undefined, list?: string[]) {
  if (!value || !list || !list.length) return false
  return normList(list).includes(norm(value))
}

export function scoreFramework(f: Framework, ctx: FrameworkContext): number {
  let score = 0
  if (matches(ctx.industry, f.bestFor.industries)) score += 30
  if (matches(ctx.stage,    f.bestFor.stages))     score += 25
  if (matches(ctx.audience, f.bestFor.audiences))  score += 20

  // Lens-to-tag overlap: any tag keyword present in the lens string
  if (ctx.lensType && f.tags?.length) {
    const lens = norm(ctx.lensType)
    if (f.tags.some(t => lens.includes(norm(t)))) score += 10
  }

  // Small base so ties don't all collapse to 0
  score += 1
  return score
}

export function rankFrameworks(
  frameworks: Framework[],
  ctx: FrameworkContext,
  activeId: string | null
): Framework[] {
  const scored = frameworks
    .map(f => ({ f, s: scoreFramework(f, ctx) }))
    .sort((a, b) => b.s - a.s)
    .map(x => x.f)

  if (!activeId) return scored

  const idx = scored.findIndex(f => f.id === activeId)
  if (idx <= 0) return scored
  const [pinned] = scored.splice(idx, 1)
  return [pinned, ...scored]
}

export interface CompanionResult {
  combos: Framework[]
  swaps: Framework[]
}

export function recommendCompanions(
  activeId: string,
  ctx: FrameworkContext,
  allFrameworks: Framework[]
): CompanionResult {
  const byId = new Map(allFrameworks.map(f => [f.id, f]))
  const active = byId.get(activeId)
  if (!active) return { combos: [], swaps: [] }

  const pickAndSort = (ids: string[] | undefined) => {
    if (!ids?.length) return []
    return ids
      .map(id => byId.get(id))
      .filter((f): f is Framework => !!f)
      .map(f => ({ f, s: scoreFramework(f, ctx) }))
      .sort((a, b) => b.s - a.s)
      .map(x => x.f)
      .slice(0, 3)
  }

  return {
    combos: pickAndSort(active.pairsWith),
    swaps:  pickAndSort(active.swapAlternatives),
  }
}
