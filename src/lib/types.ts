export interface DeckInput {
  company: string
  oneLiner: string
  problem: string
  solution: string
  howItWorks: string
  traction: string
  market: string
  businessModel: string
  competition: string
  team: string
  ask: string
  founderName: string
  founderRole: string
  domain: string
  demoUrl: string
  demoDescription: string
  accentColor: string
  bgColor: string
  fontHeading: string
  fontBody: string
  isDark: boolean
  audience: AudienceType
  goal: UseCase
  stage: Stage
  industry: Industry
}

export type DeckContent = Record<string, any>

// ─── Narrative types ──────────────────────────────────────────────────────────

export type SlideId =
  | 's1_intro'
  | 's2_situation'
  | 's3_problem'
  | 's4_implication'
  | 's5_fix'
  | 's6_how'
  | 's7_validation'
  | 's8_market'
  | 's9_customers'
  | 's10_competition'
  | 's11_risks'
  | 's12_team_ask'

export type Narrative =
  | 'bet-on-founder'
  | 'show-me-the-machine'
  | 'make-me-believe'
  | 'show-me-the-fit'
  | 'clarity-and-confidence'
  | 'solve-my-problem'
  | 'lets-build-together'

export type AudienceType =
  | 'seed-vc'
  | 'series-a'
  | 'angel'
  | 'strategic'
  | 'internal'
  | 'customer'
  | 'partner'

export type UseCase = 'raise' | 'customer' | 'partner'

export type Stage = 'pre-seed' | 'seed' | 'series-a' | 'series-b'

export type Industry =
  | 'fintech'
  | 'health'
  | 'ai'
  | 'saas'
  | 'enterprise'
  | 'dev-tools'
  | 'consumer'
  | 'climate'
  | 'other'

export interface NarrativeConfig {
  id: Narrative
  version: string
  audience: AudienceType
  coreQuestion: string
  narrativeSpine: string
  slideOrder: SlideId[]
  objectionsToPreempt: string[]
}
