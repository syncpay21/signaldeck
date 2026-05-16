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
  audience: string
  goal: string
  stage: string
  industry: string
}

export type DeckContent = Record<string, any>
