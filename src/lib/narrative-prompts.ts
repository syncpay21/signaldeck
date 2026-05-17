import type { SlideId, Narrative, NarrativeConfig, Stage, Industry, DeckInput } from './types'

// ─── System prompt ─────────────────────────────────────────────────────────────
// Tells Claude the story it's telling before it writes a single word.

export function buildSystemPrompt(
  narrative: NarrativeConfig,
  stage: Stage,
  industry: Industry,
  opts?: {
    framework?:     { name: string; summary: string; steps: string[] }
    industryVoice?: { tone: string; avoid: string[] }
  },
): string {
  const industryContext = INDUSTRY_CONTEXT[industry] ?? ''
  const stageContext = STAGE_CONTEXT[stage] ?? ''

  const frameworkBlock = opts?.framework
    ? `\nNARRATIVE FRAMEWORK to apply (overlays the spine):
"${opts.framework.name}" — ${opts.framework.summary}
Steps: ${opts.framework.steps.join(' → ')}
Use these steps as the connective tissue between slides. The narrative chooses WHICH slides; this framework chooses HOW they connect.\n`
    : ''

  const voiceBlock = opts?.industryVoice
    ? `\nINDUSTRY VOICE (per agency design guide):
Tone: ${opts.industryVoice.tone}
Avoid in copy: ${opts.industryVoice.avoid.join(', ')}\n`
    : ''

  return `You are a world-class pitch deck writer building a deck with a specific narrative purpose.

NARRATIVE: "${narrative.id}"
The audience's core question: "${narrative.coreQuestion}"
Story spine: ${narrative.narrativeSpine}

${stageContext}
${industryContext}${frameworkBlock}${voiceBlock}
WRITING RULES:
- Headlines: 2–6 words, SHORT, punchy, UPPERCASE-friendly. No buzzwords.
- Tags: 2–4 words, category label for the slide.
- Lede: 1–2 sentences max. Specific, not vague.
- Bullets: sharp, evidence-backed, no fluff. Start with the outcome, not the feature.
- Stats: real numbers only. Never invent metrics not given in the input.
- Every slide must answer: "So what does this prove about the business?"

Objections this deck must proactively address:
${narrative.objectionsToPreempt.map(o => `- ${o}`).join('\n')}

Return ONLY valid JSON, no markdown fences.`
}

// ─── Per-slide instructions ────────────────────────────────────────────────────
// Each slide gets a job description + emphasis level + what Claude must include.

const SLIDE_INSTRUCTIONS: Record<Narrative, Partial<Record<SlideId, string>>> = {
  'bet-on-founder': {
    s1_intro: `Job: Make the investor lean in. This is the founder's right to be building this.
Emphasize: relevant background (not prestige — relevance), personal connection to the problem, any "skin in the game" signal (personal investment, leaving a safe job).
Frame: "I spent X years watching this not get solved. Here's why I'm the one to fix it."
Avoid: company name + logo only, generic "serial entrepreneur" language, credential lists without context.`,

    s3_problem: `Job: Make the investor feel the pain — deeply and specifically.
Emphasize: one named customer segment, one quantified pain point (cost in time or money), why the current solutions fail.
Use PAS: state the problem, then agitate — what's the hidden cost? Who's suffering silently?
Avoid: multiple unrelated problems, vague language like "businesses struggle with X".`,

    s2_situation: `Job: Establish why this is solvable NOW — what has changed in the world?
Emphasize: 2–3 external shifts (tech cost curves, regulation, behavior change, infrastructure).
Frame as: "Previously impossible. Now inevitable."
Test: Can someone repeat the timing argument in one sentence? If yes, it's working.
Avoid: "market is growing 30% YoY" — that's size, not timing.`,

    s5_fix: `Job: Deliver the aha moment — the natural, inevitable answer to s3_problem.
Emphasize: the unique insight or approach, NOT a feature list. What's the "instead of X, we do Y" thesis?
Frame: "Instead of [old way], we [new way] — so customers can [outcome]."
Avoid: product feature lists, technical architecture, "AI-powered" as a differentiator.`,

    s6_how: `Job: Show the early GTM thesis — how does this company acquire and retain customers?
Emphasize: the basic motion (who buys, how they find it, why they stick), early unit economics hypothesis.
Keep it simple at seed stage — this is a thesis, not a proven machine.
Avoid: 10-channel strategy lists, unproven viral growth claims.`,

    s7_validation: `Job: Show any early proof — customers, revenue, Burn Multiple, key advisors.
Emphasize: the best signal you have. At pre-seed/seed, this could be pilots, LOIs, waitlist, or a notable co-investor.
Frame as trajectory: "Here's what we've proven so far, and here's where we're heading."
Avoid: vanity metrics, inflated "users" numbers that aren't paying customers.`,

    s8_market: `Job: Show the prize is worth chasing.
Emphasize: bottom-up TAM — buyer count × ARPA. SOM must align with your GTM slide.
Seed baseline: TAM $1–5B, SAM $200–500M is credible.
Avoid: top-down "X% of a $50B market" — this is now a credibility negative.`,

    s12_team_ask: `Job: Close the story. Prove this team + this ask = the right bet.
Team: lead with relevance over prestige. Answer explicitly: "Why is THIS team the one to solve this?"
Ask: specific amount + milestone + runway. Format: "$Xm gets us to [milestone] by [date] — [X] months runway."
Include spending split (e.g., Product 40% / GTM 40% / Ops 20%).
Avoid: team slide that's just headshots + company logos. Answer the "why us" question directly.`,
  },

  'show-me-the-machine': {
    s3_problem: `Job: Establish the market gap in ONE tight slide — then move immediately to proof.
Emphasize: one stat, one named customer segment, quantified cost or missed revenue.
Keep it brief — this audience already knows SaaS problems exist. Don't dwell.
Avoid: agitating the pain, multiple problems, hinting at the solution here.`,

    s7_validation: `Job: THIS IS WHERE THE DECK WINS OR LOSES. Lead with the machine working.
Emphasize: hero metric (ARR or revenue) with 6-month trendline, NRR or retention, customer logos.
Series A benchmarks: $1.5M+ ARR (SaaS B2B), 15–30% MoM growth, NRR 100%+ (120%+ = land-and-expand signal).
Format: one hero metric full-width → supporting 2×2 grid (NRR, logos, retention, growth rate).
Frame trajectory: "On track to $Xm ARR by [Q]" — connect to Series A benchmark.
Avoid: vanity metrics, "users" without revenue context, MoM figures that aren't growing.`,

    s5_fix: `Job: Show what you built that created those traction numbers.
Emphasize: the product's core mechanism, the outcome it delivers (not the features).
Frame: "Here's what we built — and here's why customers pay and stay."
Avoid: technical architecture, feature lists, screenshots without context.`,

    s6_how: `Job: Show the repeatable GTM motion — not a channel list, a MACHINE.
Format: left-to-right flow with ONE metric per step. E.g.: "ICP List → [reply rate] → Discovery → [conv rate] → Close → [ACV] → Expand → [NRR]"
Emphasize: CAC, payback period, expansion trigger.
Research: "Investors want to see a motion, not a menu."
Avoid: "We'll use LinkedIn, SEO, content, partnerships, referrals..." — pick the motion that's working.`,

    s9_customers: `Job: Make the buyer concrete. Prove they stick and expand.
Emphasize: named logos, customer segment definition (job title + company size + trigger event), cohort retention curve, NRR by cohort.
This is where land-and-expand gets proven — show the expansion story.
Avoid: generic "SMBs and enterprises" — name the exact buyer.`,

    s8_market: `Job: Show the market you can own — credibly.
Emphasize: bottom-up TAM (buyer count × ARPA), SAM that matches your ICP, SOM that aligns with your GTM slide.
SOM must match your team size and sales motion — if you have 5 AEs, $500M SOM in year 3 is not credible.
Avoid: "$50B TAM" with no bottom-up logic. 55% of pitch decks in 2024 lacked adequate market analysis.`,

    s10_competition: `Job: Prove you've done the work and have a defensible wedge.
Name every real competitor — better you find them than the investor does.
Frame: X/Y axis showing your position + one-sentence "why us vs. [main alternative]".
What creates a real moat: network effects, data flywheel, compliance lock-in, switching costs, distribution.
Avoid: "There is no competition" — instant red flag. Feature comparison tables are weak.`,

    s12_team_ask: `Job: Close with a specific, milestone-linked ask.
Team: lead with relevance. Answer: "Why is this team the one to own this market?"
Ask: "$Xm raises us to $Xm ARR / [milestone] by [date] — X months runway."
Spending split: show product / GTM / ops allocation.
Avoid: open-ended asks, runway under 18 months, vague "to grow the business" language.`,
  },

  'make-me-believe': {
    s1_intro: `Job: This is the whole pitch in embryo. Make the angel believe in this person.
Emphasize: founder's story, obsession, personal investment ("skin in the game" — did they leave a safe job? invest personal savings?), unique unfair advantage.
Frame as a journey: "Here's who I am, here's what I've seen, here's why I can't not build this."
Avoid: credential lists, funding history, company metrics (save those for later slides).
Tone: personal, conviction-driven, vulnerable but confident.`,

    s3_problem: `Job: The pain the founder personally experienced — make it visceral.
Emphasize: personal story + quantified impact. "I faced this problem for X years. It cost me Y."
Use PAS: state the problem, then agitate — what's the hidden emotional and financial cost?
Avoid: impersonal market research framing. Angels want the founder's lived experience.`,

    s4_implication: `Job: Raise the stakes — what happens if this problem stays unsolved?
Emphasize: dollar cost of inaction, strategic risk if a competitor solves this first, the emotional cost (frustration, missed opportunity, embarrassment).
Frame: "Every year this isn't solved, [named customer] loses $X / misses Y / suffers Z."
Avoid: abstract or corporate risk language. Make it human.`,

    s5_fix: `Job: The vision — your answer to the world's pain.
Emphasize: the "instead of X, we do Y" thesis, the founder's unique insight, the aha moment.
This should feel like relief after the tension of s3 + s4.
Avoid: feature lists, technical depth. Angels are betting on the vision, not the product spec.`,

    s7_validation: `Job: Show who already believes in you.
Emphasize: early customers (even 1-2 is powerful), notable advisors or co-investors, letters of intent, waitlist size.
Frame: "Here's the proof that others see what I see."
Keep metrics simple — goal is to show the business CAN work, not prove every forecast.
Avoid: overloading with spreadsheets to look "serious" — it backfires with angels.`,

    s8_market: `Job: Show the upside — how big can this get?
Keep it simple: one TAM number with a clear bottom-up logic.
Frame: "If we capture X% of Y buyers at $Z ARPA, that's a $[X]M business."
Avoid: complex TAM/SAM/SOM breakdowns — angels don't need the full market model.`,

    s12_team_ask: `Job: A personal, direct ask — join me.
Team: who else is building this with you? Show co-founder chemistry and complementary skills.
Ask: specific amount + what it buys + personal framing. "I need $Xm to [milestone]. I'm asking you to be part of this."
Tone: intimate, direct. This is a relationship ask, not a corporate pitch.`,
  },

  'show-me-the-fit': {
    s2_situation: `Job: Frame the market shift in THEIR world — not yours.
Emphasize: changes in their industry (tech, regulation, customer behavior) that create both risk and opportunity for THEM.
Frame: "Your industry is changing in ways that require you to [act / integrate / adapt]."
Avoid: framing this about your company's opportunity. Make it about their strategic moment.`,

    s3_problem: `Job: Identify a gap in their stack or customer experience.
Emphasize: a specific capability they lack, a customer experience they're failing at, or a competitive gap a rival is exploiting.
Frame: "Your customers are experiencing [X]. Your current stack can't address it. Here's what's leaking."
Avoid: generic problem framing. This must be specific to their business context.`,

    s5_fix: `Job: Show how your IP fills their gap — emphasize defensibility.
Emphasize: proprietary technology or data, integration feasibility, what can't be easily replicated.
Corporate VCs heavily value IP — patents, proprietary datasets, unique technical capabilities.
Frame: "Here's what we've built — and why it would take you [X time / $Y cost] to build in-house."
Avoid: features without defensibility logic. CVCs want to know why you're the right partner vs. an acquisition target.`,

    s6_how: `Job: Show exactly how integration works — remove the risk.
Emphasize: API documentation, integration timeline, technical support, onboarding cost, ongoing maintenance.
CVCs are more risk-averse than financial VCs — reduce perceived integration friction at every step.
Format: "Here's the integration path: [Phase 1] → [Phase 2] → [Go-live]. Timeline: X weeks. Cost: $Y."
Avoid: vague "easy to integrate" claims. Show the actual path.`,

    s9_customers: `Job: Show logos they recognize — preferably companies like them.
Emphasize: named enterprise customers, industry-specific logos, customer concentration and stability.
For CVCs: references from companies in their ecosystem are gold.
Avoid: consumer apps or SMB logos if pitching to enterprise-focused strategic.`,

    s10_competition: `Job: Prove partnering beats building or acquiring.
Frame: "Here's what it would take to build this in-house [time + cost]. Here's what it would cost to acquire a competitor. Here's what partnering with us looks like."
Emphasize: speed to market, IP you've already built, team depth that de-risks the partnership.
Avoid: attacking competitors. Frame as "we're the best fit for your roadmap."`,

    s7_validation: `Job: Prove stability, revenue, and IP defensibility.
Emphasize: revenue (even small), referenceable customers, IP/patent status, team longevity.
CVCs are risk-averse — they want to see you're a reliable partner, not a flight risk.
Avoid: only showing growth metrics. CVCs also care about operational stability.`,

    s12_team_ask: `Job: Frame the deal — what does partnership or investment look like?
Emphasize: deal structure options, what each side gets, timeline to value, next steps.
CVCs typically prefer board observer roles (not control) — frame accordingly.
Avoid: aggressive valuation anchoring. CVCs care about strategic value, not just financial return.`,
  },

  'clarity-and-confidence': {
    s2_situation: `Job: Brief the board on what has changed since the last update.
Emphasize: new market data, competitive moves, product learnings, or external events that change the picture.
Frame: "Since we last spoke, here's what's shifted — and here's what it means for our decision."
Avoid: context the board already knows. They've been briefed. Move fast.`,

    s7_validation: `Job: Show current state — KPIs, traction, pipeline, burn.
Emphasize: the metrics that matter for this decision. If asking for budget, show ROI on past spend. If asking for headcount, show capacity gap.
Format: dashboard-style — key numbers, trend direction, RAG status.
Avoid: narrative fluff. Board wants data.`,

    s5_fix: `Job: State the specific decision being requested.
Emphasize: exactly what you're asking for, why now, what the alternative is.
Frame: "We are asking the board to approve [X] because [Y]. The alternative is [Z], which has [consequences]."
Avoid: ambiguous asks. The board should leave knowing exactly what they approved.`,

    s6_how: `Job: Show the execution plan with clear milestones.
Emphasize: who owns what, by when, with what resources, and how you'll know if it's working.
Format: 3–5 milestones with dates, owners, and success metrics.
Avoid: vague "we'll figure it out" plans. Boards approve plans, not hopes.`,

    s11_risks: `Job: Show intellectual honesty — you've stress-tested this.
Emphasize: 3–4 real risks (not fake ones), with specific mitigation plans and current status.
Frame: "Here are the risks we see, here's what we're doing about each, and here's our early warning indicator."
Showing risk awareness INCREASES board confidence — it signals mature leadership.
Avoid: downplaying risks to make the ask look cleaner. Boards will find them anyway.`,

    s12_team_ask: `Job: The specific ask with clear accountability.
Emphasize: exact amount / headcount / approval needed, decision timeline, who owns execution.
Frame: "We need [X] by [date] to [milestone]. [Name] owns this. We'll report back at [next meeting]."
Avoid: open-ended asks or asks without clear owners.`,
  },

  'solve-my-problem': {
    s3_problem: `Job: This is the pain the customer lives with right now — use THEIR words.
Emphasize: the specific, daily frustration using language customers actually use (not analyst language).
Quantify: "X hours/week lost" or "$Y/month wasted" or "Z% of deals fall through because..."
Frame: "This is what your Monday morning looks like today."
Avoid: market research framing, investor language, mentioning your product.`,

    s4_implication: `Job: Make the cost of inaction visceral and concrete.
Emphasize: dollar cost (time × rate × frequency), strategic risk (what if a competitor fixes this first?), emotional cost.
Formula: "You're losing $X/month / X hours/week / X customers/quarter because of this."
Avoid: abstract risk language. Make it land financially and emotionally.`,

    s5_fix: `Job: The relief — your solution. Outcomes, NOT features.
Emphasize: what life looks like after they use your product. Time saved, money recovered, risk removed.
Concrete: "Instead of 5 days onboarding, it's 1. Instead of 3 tools, it's 1 inbox."
Avoid: "AI-powered platform that leverages machine learning to..." — pure features without outcomes.`,

    s6_how: `Job: Show how easy getting started is — remove the switch-cost fear.
Emphasize: onboarding steps, time to first value, integration complexity (or simplicity), support model.
Format: "Step 1 → Step 2 → Step 3 → First win in X days."
Avoid: technical implementation details. Customer cares about time-to-value, not architecture.`,

    s7_validation: `Job: Social proof — others like them have already solved this.
Emphasize: named logos (if possible), specific ROI / time saved / cost reduced by real customers.
Quote format: "[Company] reduced X by Y% in Z weeks."
Avoid: generic NPS scores or vague "customers love it" claims.`,

    s9_customers: `Job: Show companies that look like them — segment match creates trust.
Emphasize: 3–5 logos from the same industry/size/use case as the prospect.
Frame: "Here are companies in your space who use us."
Avoid: logos from completely different industries that don't create identification.`,

    s12_team_ask: `Job: A clear, low-friction call to action.
Emphasize: exact next step (trial, demo, pilot, purchase), timeline, what they get.
Frame: "Here's how to start. [One clear CTA]."
Avoid: multiple CTAs, pushy language, complex pricing tables.`,
  },

  'lets-build-together': {
    s2_situation: `Job: Frame the shared market opportunity — this is OUR opportunity, not just yours.
Emphasize: a market shift that benefits both parties if they act together.
Frame: "Here's what's opening up — and here's why we're both better positioned to capture it together than separately."
Avoid: framing this as your pitch. Make it mutual from the first sentence.`,

    s5_fix: `Job: Brief overview of what you do — positioned as COMPLEMENTARY, not competitive.
Emphasize: what you do well that they don't, and vice versa. The gap your partnership fills.
Frame: "We do [X]. You do [Y]. Together we deliver [Z] that neither of us can alone."
Avoid: overselling your product. This is a fit slide, not a feature demo.`,

    s9_customers: `Job: Show the customer overlap — who do you both serve?
Emphasize: shared ICP, customer segments where there's natural overlap, existing joint opportunities.
Frame: "We both serve [X]. Here's where we see the overlap — and here's the joint opportunity."
Avoid: showing customers the partner doesn't recognize or care about.`,

    s6_how: `Job: Show exactly how the partnership works — technically AND commercially.
Emphasize: integration path, what each side does, revenue model (who earns what), timeline.
Frame: "Here's how the partnership works in practice: [technical integration] + [commercial terms] + [go-to-market motion]."
Avoid: vague "we'll figure out the commercial terms later." Come with a proposal.`,

    s7_validation: `Job: Prove you deliver value and are a reliable partner.
Emphasize: customer results, operational stability, references from similar partnerships.
Frame: "Here's what our customers experience — and here's who we've already partnered with successfully."
Avoid: only showing growth metrics. Partners also care about reliability and operational maturity.`,

    s10_competition: `Job: Prove partnering beats competing.
Frame: "Here's what it would take to compete with us directly [cost/time]. Here's what partnering delivers instead [revenue/customers/speed]."
Emphasize: speed to market, revenue share potential, competitive moat from combining forces.
Avoid: attacking the partner's current approach. Frame as "we're better together."`,

    s12_team_ask: `Job: Propose the deal — specific terms, timeline, next steps.
Emphasize: what a partnership looks like (integration + commercial + GTM), what each side commits, decision timeline.
Frame: "Here's what we're proposing: [terms]. Here's our suggested next step: [meeting/pilot/agreement]."
Avoid: open-ended "let's explore" asks. Come with a concrete proposal.`,
  },
}

// ─── Industry context injected into system prompt ─────────────────────────────

const INDUSTRY_CONTEXT: Record<string, string> = {
  fintech: `INDUSTRY: Fintech
- Regulatory status MUST be addressed explicitly. Investors and partners will ask.
- Compliance-first framing in the solution slide — build this in, not bolted on.
- Unit economics are under extra scrutiny. CAC, payback, and gross margin must be tight.
- Avoid "move fast and break things" language. Compliance is a feature.
- Required proof: licensed entities, compliance audit status, AML/KYC approach.`,

  health: `INDUSTRY: Health
- Clinical evidence is required. "Pilot results" without n= and methodology are weak.
- Regulatory pathway (FDA clearance, CE marking, etc.) must be stated and de-risked.
- Reimbursement model must be clear — who pays and how.
- Avoid overpromising outcomes without clinical backing.`,

  ai: `INDUSTRY: AI
- Answer "why not just use OpenAI / Claude / [OSS model]?" explicitly. Investors will ask.
- Include inference cost per unit of value delivered — shows unit economics maturity.
- Data flywheel or fine-tuning strategy must be articulated — what's the moat?
- Benchmarks vs. frontier models (GPT-4, Claude) strengthen the competitive slide.
- Avoid "AI-powered" as a differentiator — be specific about the technical advantage.`,

  saas: `INDUSTRY: SaaS
- NRR is the signal Series A investors trust most. Surface it if >100%.
- CAC payback <18 months is the Series A credibility floor.
- Land-and-expand story must be shown — who expands, what triggers it, what NRR results.
- Cohort analysis > aggregate metrics. Show retention curves if available.`,

  enterprise: `INDUSTRY: Enterprise
- Customer logos carry enormous weight. Named logos > revenue numbers at early stage.
- Deployment complexity must be addressed — what's the implementation burden?
- Time-to-value is the key buying metric. How fast does a new customer see ROI?
- Land-and-expand proof: show ACV growth within existing accounts.`,

  'dev-tools': `INDUSTRY: Developer Tools
- Bottom-up, product-led growth is the expected motion. Show self-serve funnel.
- GitHub stars, community size, and OSS traction are proof signals.
- Usage metrics > revenue metrics at early stage (DAU, repos using the tool).
- Developer trust is earned, not bought. Show community engagement.`,

  consumer: `INDUSTRY: Consumer
- D30 retention is the signal that matters most. Show the retention curve.
- DAU/MAU ratio signals engagement depth.
- CAC via organic / referral is more credible than paid at early stage.
- Revenue-first framing is less important than engagement-first at pre-seed/seed.`,

  climate: `INDUSTRY: Climate
- "Why now" is the tailwind — policy (IRA, carbon markets, net-zero mandates). Name the specific catalyst.
- Path to profitability must be clear — climate investors have learned from the first wave.
- Enterprise adoption proof is more credible than consumer intent.
- Impact metrics belong in the deck but shouldn't replace unit economics.`,
}

// ─── Stage context injected into system prompt ────────────────────────────────

const STAGE_CONTEXT: Record<string, string> = {
  'pre-seed': `STAGE: Pre-seed
- Traction may be limited. Use LOIs, pilot agreements, waitlist size, or founder track record as proof.
- Founder IS the proof at this stage — the intro slide carries double weight.
- Unit economics at "hypothesis" level is acceptable — show you've thought through the math.
- Avoid invented metrics. Acknowledge what's unknown and explain how funding resolves it.`,

  seed: `STAGE: Seed
- First paying customers are available. Feature them — even 3–5 logos matters.
- Monthly retention must be 80%+ to be credible. Flag if below.
- Early unit economics required: CAC estimate, LTV logic, payback thesis.
- Bottom-up TAM now required — top-down market claims are a credibility negative.`,

  'series-a': `STAGE: Series A
- LEAD WITH TRACTION. Put the validation slide immediately after the problem slide.
- SaaS B2B benchmark: $1.5–4M ARR. Flag if below — frame the trajectory to get there.
- NRR 100%+ is the baseline. 120%+ signals land-and-expand. Surface it prominently.
- GTM must be "a motion, not a menu" — one clear repeatable path with metrics at each step.
- Full unit economics required: CAC, LTV, payback period, gross margin.`,

  'series-b': `STAGE: Series B
- The machine must be proven and repeatable. Not just metrics — the motion at scale.
- Financial projections (3-year model) are expected.
- GTM must show documented repeatability — not just results, the documented process.
- Competitive moat must be demonstrated, not asserted.`,
}

// ─── Main builder ─────────────────────────────────────────────────────────────

export function buildSlideInstruction(
  slideId: SlideId,
  narrative: NarrativeConfig,
): string {
  const instruction = SLIDE_INSTRUCTIONS[narrative.id]?.[slideId]
  return instruction ?? `Generate this slide with content appropriate for the "${narrative.id}" narrative. Keep it tight and evidence-backed.`
}

export function buildGenerationPrompt(
  input: DeckInput,
  narrative: NarrativeConfig,
  slideIds: SlideId[],
): string {
  const storyBlock = input.realStory
    ? `Founder story:\n${input.realStory}`
    : [
        input.problem      && `Problem: ${input.problem}`,
        input.solution     && `Solution: ${input.solution}`,
        input.howItWorks   && `How it works: ${input.howItWorks}`,
        input.traction     && `Traction: ${input.traction}`,
        input.market       && `Market: ${input.market}`,
        input.businessModel && `Business model: ${input.businessModel}`,
        input.competition  && `Competition: ${input.competition}`,
        input.team         && `Team: ${input.team}`,
        input.ask          && `Ask: ${input.ask}`,
      ].filter(Boolean).join('\n')

  const slideInstructions = slideIds.map(id => {
    const instruction = buildSlideInstruction(id, narrative)
    return `\n--- ${id} ---\n${instruction}`
  }).join('\n')

  const slideSchemas = slideIds.map(id => `"${id}":${SLIDE_SCHEMA[id]}`).join(',')

  return `Create a pitch deck for:
Company: ${input.company}
One-liner: ${input.oneLiner}
Founder: ${input.founderName}${input.founderRole ? ', ' + input.founderRole : ''}
Industry: ${input.industry}
Stage: ${input.stage}
Audience: ${input.audience}
${storyBlock}
${input.demoDescription ? 'Demo: ' + input.demoDescription : ''}

NARRATIVE: ${narrative.id}
Core question this deck answers: ${narrative.coreQuestion}
Story spine: ${narrative.narrativeSpine}

SLIDE-SPECIFIC INSTRUCTIONS:
${slideInstructions}

Return ONLY this JSON (no markdown):
{${slideSchemas}}`
}

// ─── Slide JSON schemas ────────────────────────────────────────────────────────
// Each slide type has a fixed output shape the renderer expects.

const SLIDE_SCHEMA: Record<SlideId, string> = {
  s1_intro:        `{"tag":"string","headline":"COMPANY NAME","sub":"hook line"}`,
  s2_situation:    `{"tag":"string","headline":"string","lede":"string","stats":[{"value":"string","label":"string"}]}`,
  s3_problem:      `{"tag":"string","headline":"string","lede":"string","bullets":["string","string","string"]}`,
  s4_implication:  `{"tag":"string","headline":"string","lede":"string","stats":[{"value":"string","label":"string"}]}`,
  s5_fix:          `{"tag":"string","headline":"string","sub":"string","lede":"string"}`,
  s6_how:          `{"tag":"string","headline":"string","lede":"string","bullets":["string","string","string"]}`,
  s7_validation:   `{"tag":"string","headline":"string","lede":"string","stats":[{"value":"string","label":"string"},{"value":"string","label":"string"},{"value":"string","label":"string"}]}`,
  s8_market:       `{"tag":"string","headline":"string","lede":"string","stats":[{"value":"string","label":"TAM"},{"value":"string","label":"SAM"},{"value":"string","label":"SOM"}]}`,
  s9_customers:    `{"tag":"string","headline":"string","lede":"string","bullets":["string","string","string"]}`,
  s10_competition: `{"tag":"string","headline":"string","lede":"string","bullets":["string","string","string"]}`,
  s11_risks:       `{"tag":"string","headline":"string","lede":"string","bullets":["Risk: X → Mitigation: Y","Risk: X → Mitigation: Y","Risk: X → Mitigation: Y"]}`,
  s12_team_ask:    `{"tag":"string","headline":"string","lede":"string","stats":[{"value":"string","label":"raising"},{"value":"string","label":"runway"}],"bullets":["string","string"]}`,
}

// Extend DeckInput to support free-form story (already used in codebase)
declare module './types' {
  interface DeckInput {
    realStory?: string
  }
}
