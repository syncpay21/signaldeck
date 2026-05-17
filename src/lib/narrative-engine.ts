import type { SlideId, Narrative, NarrativeConfig, AudienceType, UseCase, Stage, Industry } from './types'

// ─── Narrative Configs ────────────────────────────────────────────────────────
// Each config defines: which slides appear, in what order, with what
// narrative spine. Presentation/visual layer is NOT touched here.

const NARRATIVE_CONFIGS: Record<Narrative, NarrativeConfig> = {
  'bet-on-founder': {
    id: 'bet-on-founder',
    version: '1.0',
    audience: 'seed-vc',
    coreQuestion: 'Is this founder the right person to solve this — and have they stress-tested the business?',
    narrativeSpine: "Founder insight → Problem they know → Why now → Early proof → Business logic → Ask",
    slideOrder: ['s1_intro', 's3_problem', 's2_situation', 's5_fix', 's6_how', 's7_validation', 's8_market', 's12_team_ask'],
    objectionsToPreempt: [
      "Founder hasn't done this before",
      "Problem isn't validated",
      "Too early for unit economics",
    ],
  },

  'show-me-the-machine': {
    id: 'show-me-the-machine',
    version: '1.0',
    audience: 'series-a',
    coreQuestion: 'Does this scale repeatably into a $1B+ business with defensible unit economics?',
    narrativeSpine: "Problem (brief) → Traction proves it's solved → GTM engine → Market → Why we win → Ask",
    slideOrder: ['s3_problem', 's7_validation', 's5_fix', 's6_how', 's9_customers', 's8_market', 's10_competition', 's12_team_ask'],
    objectionsToPreempt: [
      "Unit economics don't work at scale",
      "No repeatable sales process",
      "Market is too crowded / small",
    ],
  },

  'make-me-believe': {
    id: 'make-me-believe',
    version: '1.0',
    audience: 'angel',
    coreQuestion: 'Do I believe in this person enough to write a check?',
    narrativeSpine: "Founder identity + skin in game → Personal pain → Stakes of inaction → Vision → Early believers → Intimate ask",
    slideOrder: ['s1_intro', 's3_problem', 's4_implication', 's5_fix', 's7_validation', 's8_market', 's12_team_ask'],
    objectionsToPreempt: [
      "What if the founder quits?",
      "Why should I believe you over someone with more experience?",
      "Is the market big enough for venture returns?",
    ],
  },

  'show-me-the-fit': {
    id: 'show-me-the-fit',
    version: '1.0',
    audience: 'strategic',
    coreQuestion: 'Does this complement our roadmap, and is the IP defensible enough to integrate?',
    narrativeSpine: "Their industry's shift → Gap in their stack → Our IP fills it → Integration proof → Distribution leverage → Deal",
    slideOrder: ['s2_situation', 's3_problem', 's5_fix', 's6_how', 's9_customers', 's10_competition', 's7_validation', 's12_team_ask'],
    objectionsToPreempt: [
      "We could build this in-house",
      "Integration complexity is too high",
      "IP isn't defensible",
    ],
  },

  'clarity-and-confidence': {
    id: 'clarity-and-confidence',
    version: '1.0',
    audience: 'internal',
    coreQuestion: 'Should we approve this decision / resource allocation?',
    narrativeSpine: "What changed → Current KPIs → Specific decision → Execution plan → Risks → Ask",
    slideOrder: ['s2_situation', 's7_validation', 's5_fix', 's6_how', 's11_risks', 's12_team_ask'],
    objectionsToPreempt: [
      "Why is this the right time?",
      "What are the risks we haven't considered?",
      "What happens if we don't approve this?",
    ],
  },

  'solve-my-problem': {
    id: 'solve-my-problem',
    version: '1.0',
    audience: 'customer',
    coreQuestion: 'Will this save me time/money/pain — and is the switch cost worth it?',
    narrativeSpine: "Their specific pain → Quantified cost → Our solution → How easy → Social proof → CTA",
    slideOrder: ['s3_problem', 's4_implication', 's5_fix', 's6_how', 's7_validation', 's9_customers', 's12_team_ask'],
    objectionsToPreempt: [
      "Is switching worth the disruption?",
      "Will this actually work for my use case?",
      "Can I trust a new vendor?",
    ],
  },

  'lets-build-together': {
    id: 'lets-build-together',
    version: '1.0',
    audience: 'partner',
    coreQuestion: 'Is this worth our time — does it make both parties more money?',
    narrativeSpine: "Shared market opportunity → Complementary strengths → Joint value → Integration path → Proof → Deal",
    slideOrder: ['s2_situation', 's5_fix', 's9_customers', 's6_how', 's7_validation', 's10_competition', 's12_team_ask'],
    objectionsToPreempt: [
      "What's in it for us?",
      "Would we be better off competing?",
      "What does the integration actually cost?",
    ],
  },
}

// ─── Narrative Selection ───────────────────────────────────────────────────────

export function selectNarrative(audience: AudienceType, useCase: UseCase): NarrativeConfig {
  // Use-case overrides take priority over audience type
  if (useCase === 'customer') return NARRATIVE_CONFIGS['solve-my-problem']
  if (useCase === 'partner')  return NARRATIVE_CONFIGS['lets-build-together']

  const map: Record<AudienceType, Narrative> = {
    'seed-vc':   'bet-on-founder',
    'series-a':  'show-me-the-machine',
    'angel':     'make-me-believe',
    'strategic': 'show-me-the-fit',
    'internal':  'clarity-and-confidence',
    // defaults for unmapped values
    'customer':  'solve-my-problem',
    'partner':   'lets-build-together',
  }

  const narrativeId = map[audience] ?? 'bet-on-founder'
  return NARRATIVE_CONFIGS[narrativeId]
}

// ─── Stage Modifiers ──────────────────────────────────────────────────────────

export function applyStageModifiers(slides: SlideId[], narrative: NarrativeConfig, stage: Stage): SlideId[] {
  let result = [...slides]

  if (stage === 'pre-seed') {
    // At pre-seed, if there's no traction the validation slide is still included
    // but Claude is told to use LOIs / waitlist / founder track record instead
    // No structural change needed — handled in prompt instructions
  }

  if (stage === 'series-a') {
    // Ensure s7_validation is in position 2 (right after problem)
    result = result.filter(s => s !== 's7_validation')
    const problemIdx = result.indexOf('s3_problem')
    if (problemIdx !== -1) {
      result.splice(problemIdx + 1, 0, 's7_validation')
    } else {
      result.unshift('s7_validation')
    }
    // Ensure customers + competition are present
    if (!result.includes('s9_customers')) result.splice(result.indexOf('s6_how') + 1, 0, 's9_customers')
    if (!result.includes('s10_competition')) result.splice(result.indexOf('s8_market') + 1, 0, 's10_competition')
  }

  return result
}

// ─── Industry Modifiers ───────────────────────────────────────────────────────

export function applyIndustryModifiers(slides: SlideId[], industry: Industry): SlideId[] {
  const result = [...slides]

  // Regulated industries always need a risk slide
  if ((industry === 'fintech' || industry === 'health') && !result.includes('s11_risks')) {
    // Insert before the final ask slide
    const askIdx = result.indexOf('s12_team_ask')
    result.splice(askIdx, 0, 's11_risks')
  }

  return result
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export function getSlideSet(narrative: NarrativeConfig, stage: Stage, industry: Industry): SlideId[] {
  let slides = [...narrative.slideOrder]
  slides = applyStageModifiers(slides, narrative, stage)
  slides = applyIndustryModifiers(slides, industry)
  return slides
}
