export type FrameworkTier = 'clean' | 'edgy' | 'dark'

export type FrameworkCategory =
  | 'sales-framework'
  | 'persuasion-principle'
  | 'rhetorical-device'
  | 'cognitive-bias'
  | 'narrative-frame'
  | 'investor-play'
  | 'fallacy'

export type FrameworkRisk = 'low' | 'medium' | 'high'

export interface Framework {
  id: string
  name: string
  summary: string
  steps: string[]
  when: string
  tier: FrameworkTier
  category: FrameworkCategory
  tags: string[]
  bestFor: {
    industries?: string[]
    stages?: string[]
    audiences?: string[]
  }
  pairsWith?: string[]
  swapAlternatives?: string[]
  risk?: FrameworkRisk
}

export interface FrameworkContext {
  industry?: string
  stage?: string
  audience?: string
  lensType?: string
}
