import type { SlideId, Narrative, NarrativeConfig, Stage, Industry, DeckInput, BusinessModel, GtmMotion, TractionStatus, Region, TeamSize } from './types'
import { ANDREAS_PERSONA } from './andreas-persona'

// ─── System prompt ─────────────────────────────────────────────────────────────
// Tells Claude the story it's telling before it writes a single word.

export function buildSystemPrompt(
  narrative: NarrativeConfig,
  stage: Stage,
  industry: Industry,
  opts?: {
    framework?:        { name: string; summary: string; steps: string[] }
    industryVoice?:    { tone: string; avoid: string[] }
    businessModel?:    BusinessModel
    gtmMotion?:        GtmMotion
    tractionStatus?:   TractionStatus
    region?:           Region
    teamSize?:         TeamSize
    /** When true, founder opted-in to harder persuasion moves (FOMO, scarcity,
     *  competitive shade, urgency anchors). Off by default. */
    darkTacticsEnabled?: boolean
  },
): string {
  const industryContext = INDUSTRY_CONTEXT[industry] ?? ''
  const stageContext = STAGE_CONTEXT[stage] ?? ''
  const businessModelContext = opts?.businessModel ? BUSINESS_MODEL_CONTEXT[opts.businessModel] ?? '' : ''
  const gtmMotionContext = opts?.gtmMotion ? GTM_MOTION_CONTEXT[opts.gtmMotion] ?? '' : ''
  const tractionContext = opts?.tractionStatus ? TRACTION_STATUS_CONTEXT[opts.tractionStatus] ?? '' : ''
  const regionContext = opts?.region ? REGION_CONTEXT[opts.region] ?? '' : ''
  const teamSizeContext = opts?.teamSize ? TEAM_SIZE_CONTEXT[opts.teamSize] ?? '' : ''

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

  const darkTacticsBlock = opts?.darkTacticsEnabled
    ? `\nEDGE TACTICS UNLOCKED (founder opted in):
The founder has explicitly enabled harder persuasion moves. You may use:
- Scarcity framing ("we're closing this round in 30 days, two slots left")
- Urgency anchors ("the competitor that ignored this in 2022 is now public")
- Competitive shade (name a competitor's weakness IF it's true and verifiable)
- FOMO ("the funds that passed on Notion in 2018 still talk about it")
- Loss-frame > gain-frame on the problem slide ("what you're losing every quarter")
- Specific contrast ("they took 18 months to ship this. We did it in 6.")
Rules: never invent stats to support these moves. Use only proof the founder already gave you. If you can't substantiate it, don't reach for the tactic.\n`
    : ''

  const contextBlocks = [businessModelContext, gtmMotionContext, tractionContext, regionContext, teamSizeContext]
    .filter(Boolean)
    .join('\n')

  return `${ANDREAS_PERSONA}

YOUR JOB HERE
Write the full pitch deck for this founder using the chosen narrative spine.

NARRATIVE: "${narrative.id}"
The audience's core question: "${narrative.coreQuestion}"
Story spine: ${narrative.narrativeSpine}

${stageContext}
${industryContext}${businessModelContext}${gtmMotionContext}${tractionContext}${regionContext}${teamSizeContext}${frameworkBlock}${voiceBlock}${darkTacticsBlock}
WRITING RULES:
- Headlines: 2–6 words, SHORT, punchy, UPPERCASE-friendly. No buzzwords.
- Tags: 2–4 words, category label for the slide.
- Lede: 1–2 sentences max. Specific, not vague.
- Bullets: sharp, evidence-backed, no fluff. Start with the outcome, not the feature.
- Stats: real numbers only. Never invent metrics not given in the input.
- Every slide must answer: "So what does this prove about the business?"

ANTI-CLICHÉ GUARDRAIL — avoid the generic AI / SaaS pitch deck look unless the founder's brand explicitly uses it:
- DO NOT default to "AI-powered", "next-gen", "intelligent", "futuristic", "neural", "revolutionary"
- DO NOT describe the product with visual metaphors of glowing orbs, gradients, particles, code streams, neural networks
- DO NOT use glassmorphism / dark+purple+cyan as the visual lens unless the founder's actual site uses that aesthetic
- DEFAULT preference: real product specifics, real customer language, restraint. The premium move is one strong brand colour, real screenshots, light grid, one accent — not the same dark gradient every AI deck uses.

STORY ARC — slides are NOT independent units. They are act structure.
This deck tells ONE argument, not 12 disconnected pitches. Treat the slide order
as a screenplay:
- Each slide ends with tension or a question the next slide answers.
- Each slide opens by acknowledging where the previous one left off — implicitly
  ("Which is exactly what makes the fix unusual…") or explicitly ("That's the
  cost. Here's the answer.").
- The Intro raises the founder's stake. Problem agitates. Implication closes the
  trap. Fix opens the relief. How proves the mechanism. Validation confirms it
  works. Market sizes the win. Competition explains why others fail. Team/Ask
  closes the deal.
- For every slide, the LAST bullet or lede sentence should plant the seed for
  the next slide's headline. Don't just describe; foreshadow.

Example sequencing for show-me-the-machine:
  s3 (Problem) closes: "Every quarter this drags, X loses $Y."
  s5 (Fix) opens:     "What if the drag disappeared?" — directly answers s3.
  s6 (How) opens:     "Here's exactly how." — delivers on s5.
  s7 (Validation) opens: "And here's the proof it works." — delivers on s6.

REFERENCE DECK LIBRARY — channel the lessons, not the layouts. When writing a
given slide, pattern-match against the canonical deck that taught the lesson
your slide needs. Do NOT copy phrasing or claims; absorb the move.

Story arc:           Airbnb seed (3-truth problem → inevitable solution); Front
                     (status-quo failure → wedge); Buffer (radical numbers
                     transparency); Sequoia template (purpose → problem → why
                     now → solution → market → team → ask).
Wedge clarity:       Brex ("Amex for YC" not "corporate cards"); Mixpanel
                     ("deeper than GA"); Wise (P2P FX for expats + 20% MoM);
                     Revolut (4.8k pre-product subscribers).
Visual restraint:    Notion seed (deck IS the brand artefact); Dropbox seed
                     (one mental model per slide); Intercom seed (plain copy
                     that reads like founder email).
Brand-led aesthetic: Liquid Death (brand IS the moat); Warby Parker (magazine-
                     quality mission framing); Allbirds (ruthless reduction);
                     Canva (humanise the market, not just the team).
Data-density:        Snowflake (84 slides earned by receipts); Datadog (logos,
                     DBNRR, cohort curves); Snapchat (14 slides, one chart per
                     slide); Mattermark (before/after the data).
Founder thesis:      Figma pre-seed (no product, unmovable thesis); Anthropic
                     2022 Series B (calm contrarian positioning, 10 slides);
                     Perplexity (one thesis sentence stable across rounds).
Market sizing:       Uber seed (bottom-up SF cab TAM, not top-down); Foursquare
                     B (recategorise to expand TAM); BuzzFeed (frame as tech).
Competitive moat:    Dropbox ("it just works" UX moat); Peloton (anti-positioning
                     wheel); Plaid (ecosystem diagram as moat); WeWork
                     (cautionary: moat detached from unit economics).
Ask + financials:    Coinbase (missionary tone, ask = manifesto); Robinhood
                     (ask tied to one growth lever, not runway); Square B
                     (5-year model on the ask page); Klarna (system diagram
                     for multi-sided ops).
Traction-as-narrative: Mixpanel B (cohort retention as centrepiece, not
                     footnote); Shopify (one named customer's upgrade journey).

Pick at MOST 2-3 references for the whole deck — channel their MOVE on the
slides where the lesson fits. If your slide is the Problem, ask: "Am I doing
the Airbnb 3-truths thing? Is this as concrete as Mixpanel's wedge?" If not,
rewrite.

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

// ─── Business Model context ────────────────────────────────────────────────────

const BUSINESS_MODEL_CONTEXT: Record<string, string> = {
  'b2b': `BUSINESS MODEL: B2B
- Emphasize sales motion, contract value, and expansion within accounts.
- CAC payback period is critical — show math.
- Land-and-expand is the expected narrative — how do customers grow with you?
- Enterprise customers may have long sales cycles — address deal complexity.`,

  'b2c': `BUSINESS MODEL: B2C
- Emphasize viral coefficient, organic growth, and unit economics.
- D30 retention is more important than early revenue at pre-seed/seed.
- CAC is typically lower than B2B but must be sustainable via lifetime value.
- Show how you acquire the first 1K users — founder-driven, viral loop, paid?`,

  'marketplace': `BUSINESS MODEL: Marketplace
- Two-sided network effects are critical — you must show both supply and demand sides.
- Address the chicken-and-egg problem: how did you bootstrap supply or demand first?
- GMV (gross merchandise value) is important but net revenue (take rate) is what matters.
- Show cohort growth — are both sides growing in parallel?`,

  'api-platform': `BUSINESS MODEL: API/Platform
- Developer adoption and ecosystem growth matter most — show GitHub stars, API usage, SDK adoption.
- Pricing model must be transparent: per-call, per-deployment, per-user?
- Show integration ease: time-to-first-success, code samples, documentation quality.
- Developer trust and community engagement replace traditional marketing.`,
}

// ─── GTM Motion context ───────────────────────────────────────────────────────

const GTM_MOTION_CONTEXT: Record<string, string> = {
  'sales': `GTM MOTION: Sales-Led
- Emphasize AE hiring plan, quota ramp, and sales cycle length.
- Show CAC and payback period prominently — investors will scrutinize.
- Ideal customer profile (ICP) must be crystal clear — who are the first 10 customers?
- Proof: initial pilot results, LOIs, signed contracts.`,

  'self-serve': `GTM MOTION: Self-Serve / Product-Led
- Emphasize funnel conversion: signup → activation → retention → expansion.
- Show organic/viral coefficient if available — how fast does word-of-mouth spread?
- CAC via organic is more credible than paid at early stage.
- Proof: signup velocity, D30 retention curve, NPS / virality signals.`,

  'partnerships': `GTM MOTION: Partnerships
- Emphasize distribution leverage — which strategic partners can accelerate growth?
- Show signed partnership agreements, joint go-to-market plans, or revenue share models.
- Address risk: are you dependent on one or two partners?
- Proof: initial partner commitments, joint pipeline, expansion partners.`,
}

// ─── Traction Status context ──────────────────────────────────────────────────

const TRACTION_STATUS_CONTEXT: Record<string, string> = {
  'idea': `TRACTION STATUS: Idea / Pre-Product
- Validation comes from LOIs, customer discovery interviews, or letters of intent.
- Show founder credibility — why does the founder have the right to build this?
- Address the earliest assumption you'll prove with this funding round.
- Avoid invented metrics — be honest about what's unknown.`,

  'pilots': `TRACTION STATUS: Pilots / Early Customers
- Show pilot results concretely: number of pilots, duration, customer outcomes.
- Quantify: time saved, cost reduced, satisfaction (NPS, feedback quotes).
- Be specific about pilot customers — why them, what did they learn?
- Proof of concept is stronger than proof of demand — are pilots ready to buy?`,

  'revenue': `TRACTION STATUS: Revenue-Generating
- Lead with ARR or MRR prominently — this is your strongest signal.
- Show growth trajectory: monthly or quarterly growth rates.
- Include cohort analysis: retention curves, NRR, expansion revenue.
- Benchmarks: compare against peer companies at your stage.`,
}

// ─── Region context ──────────────────────────────────────────────────────────

const REGION_CONTEXT: Record<string, string> = {
  'us': `REGION: United States
- Standard venture benchmarks apply — market sizing assumes US TAM first.
- Unit economics expectations are aggressive: CAC payback <18mo for Series A.
- Mention Series B or IPO path if raising for scale.`,

  'eu': `REGION: European Union
- GDPR and data residency MUST be addressed explicitly in the deck.
- Market adoption is slower than US — extend TAM timeline assumptions.
- Unit economics may differ (lower customer density per geography, higher compliance costs).
- Highlight data sovereignty or compliance as a competitive advantage if applicable.`,

  'apac': `REGION: Asia-Pacific
- Market heterogeneity — treat India, Southeast Asia, Australia, Japan differently.
- Regulatory environment varies dramatically; address compliance per key markets.
- Localization (language, payment methods) is a go-to-market requirement.
- Partner-led growth may be more efficient than direct sales.`,

  'other': `REGION: Global / Multi-region
- Show which markets you're serving first and why.
- Address multi-currency and multi-language complexity in GTM plan.
- Regional expansion strategy should be clear — simultaneous or sequential?`,
}

// ─── Team Size context ───────────────────────────────────────────────────────

const TEAM_SIZE_CONTEXT: Record<string, string> = {
  'solo': `TEAM SIZE: Solo Founder
- S1_intro emphasizes founder obsession, skin-in-game, personal investment.
- Address execution risk explicitly — no co-founder means all weight on one person.
- Show if co-founder or key hires are in pipeline.
- Investors may ask: "Why not co-founder? Why now?"`,

  'co-founder': `TEAM SIZE: Co-Founder(s)
- S1_intro emphasizes complementary skills and co-founder chemistry.
- Show how you met and why you're the right pair for this problem.
- Each founder's relevant background should be highlighted (relevance > prestige).
- Prove alignment: shared narrative on vision, values, decision-making.`,

  'full-team': `TEAM SIZE: Full Team (3+)
- S1_intro shifts from "founder bet" to "execution capability."
- Show full leadership team + org structure — who owns what?
- Key hires (technical, sales, ops) matter at this stage.
- Culture and retention risk — who's been with you longest?`,
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

// Structured shapes — the renderer dispatches bespoke per-slide layouts
// (prob-grid, fix-checks, how-flow, comp-matrix) when these fields are
// present. Generic shell still works when they're missing.
const SLIDE_SCHEMA: Record<SlideId, string> = {
  s1_intro:        `{"tag":"string","headline":"COMPANY NAME","sub":"hook line"}`,
  // s2_situation has 4 variants — pick ONE shape:
  //   shifts: [{name,desc}]                  → why-now-triple (3 shifts default)
  //   timeline: [{when,what,isNow?}]         → shift-timeline (key dates)
  //   converging: [{name,desc}]              → convergence (3-4 trends meeting)
  //   oldWorld + newWorld {title,items[]}    → before-after-world (pre vs post shift)
  s2_situation:    `{"tag":"string","headline":"string","sub":"string","lede":"string","shifts":[{"name":"Shift name","desc":"1-line description"}],"timeline":[],"converging":[],"oldWorld":null,"newWorld":null}`,
  // s3_problem has 4 variants — pick ONE shape:
  //   cards[{num,head,body,foot}]            → 3-card grid (default, most common)
  //   heroStat{value,label,subtext}+supporting → stat-overlay (huge number framing)
  //   painQuotes[{text,author?}]             → quote-evidence (customer voice)
  //   statusQuo{title,items} + wished{title,items} → before-state (today vs wished)
  s3_problem:      `{"tag":"string","headline":"string","sub":"string","lede":"string","cards":[{"num":"01","head":"PAIN POINT","body":"1-2 sentence concrete pain","foot":"→ consequence"},{"num":"02","head":"...","body":"...","foot":"..."},{"num":"03","head":"...","body":"...","foot":"..."}],"heroStat":null,"painQuotes":[],"statusQuo":null,"wished":null}`,
  // s4_implication has 4 variants — pick ONE shape:
  //   cost{value,label} + multipliers[{value,label}]      → cost-counter (default)
  //   cascading[strings] (5 escalating consequences)       → risk-fan
  //   lossFrame[{when,what}]                               → loss-frame (year-by-year)
  //   failureTable{colA,colB,rows[{today,cost}]}           → status-quo-failure
  s4_implication:  `{"tag":"string","headline":"string","sub":"string","lede":"string","cost":{"value":"$X","label":"lost annually"},"multipliers":[{"value":"3×","label":"multiplier"}],"cascading":[],"lossFrame":[],"failureTable":null}`,
  // s5_fix has 4 variants — pick ONE shape:
  //   checks[] (default)                        → 5-check row of outcome statements
  //   before{title,items} + after{title,items}  → before-after split (status quo → with us)
  //   pillars[{icon,name,desc}] (exactly 3)     → three-pillar (clearest "3 things we do")
  //   oneThing (string) + supporting[]          → one-big-thing (one bold statement)
  s5_fix:          `{"tag":"string","headline":"string","sub":"string","lede":"string","checks":["outcome statement, 80 chars max","...","...","...","..."],"before":null,"after":null,"pillars":[],"oneThing":null,"supporting":[]}`,
  // s6_how has 4 variants — pick ONE shape:
  //   steps[{head,body}] (4 steps)              → step-flow (default horizontal)
  //   layers[{label,name,body}] (foundation→surface) → arch-stack (vertical layers)
  //   sequence[{name,body}]                     → sequence-arrows (left-to-right flow)
  //   inputs[] + outputs[] + engineName + engineBody → inputs-outputs (3-col with engine)
  s6_how:          `{"tag":"string","headline":"string","sub":"string","lede":"string","steps":[{"head":"FOUNDATION","body":"explanation"},{"head":"...","body":"..."}],"layers":[],"sequence":[],"inputs":[],"outputs":[],"engineName":null,"engineBody":null}`,
  // s7_validation renders one of 4 variants. Pick the right shape based on what the
  // founder's proof actually is. If quotes exist: include "quotes"[{text,author,role}].
  // If named customer logos: "customerLogos"[{name,url?}]. Otherwise emit stats[],
  // with stats[0] as the HERO number (largest, most defensible).
  s7_validation:   `{"tag":"string","headline":"string","sub":"string","lede":"string","stats":[{"value":"700K+","label":"customers in 5yrs"},{"value":"70+","label":"NPS"},{"value":"100K","label":"shared accounts"},{"value":"$0","label":"paid acquisition"}],"quotes":[],"customerLogos":[]}`,
  // s8_market has 4 variants — pick ONE shape:
  //   stats with TAM/SAM/SOM labels (default)   → concentric rings
  //   stats with 3-4 descending labels          → waterfall-bars
  //   verticals[{name,size,detail?}]            → verticals (segment-by-segment)
  //   growthCurve[{year,value,label?}] (3+)     → growth-curve (historical + projected)
  s8_market:       `{"tag":"string","headline":"string","sub":"string","lede":"string","stats":[{"value":"$X","label":"TAM"},{"value":"$Y","label":"SAM"},{"value":"$Z","label":"SOM"}],"verticals":[],"growthCurve":[]}`,
  // s9_customers renders one of 4 variants. Default to bullets[] for "archetype-cards".
  // If you have real customer quotes, include "quotes". For a journey-style story,
  // include "journey"[{when,what,detail?}]. For many segments, "segments"[{name,icon?}].
  s9_customers:    `{"tag":"string","headline":"string","sub":"string","lede":"string","bullets":["Named archetype — 1-line use case","...","..."],"quotes":[],"journey":[],"segments":[]}`,
  // s10_competition has 4 layout variants — pick the one that fits this founder's
  // competitive story best, emit ONE of these shape blocks:
  //   matrix:           when you have 5+ concrete capabilities to compare side by side
  //   quadrant:         when 2 axes (e.g. enterprise/consumer × bank/wallet) place you
  //   radar:            when you compete on 5-6 dimensions and beat competitors on some
  //   antiPositioning:  when the story is what you DON'T do (Peloton-style framing)
  s10_competition: `{"tag":"string","headline":"string","sub":"string","matrix":{"columns":["You","Competitor A","Competitor B"],"rows":[{"label":"Capability","cells":[true,false,true]}]},"quadrant":{"xAxis":"AXIS LABEL","yAxis":"AXIS LABEL","points":[{"label":"Us","x":85,"y":80,"isUs":true},{"label":"Competitor A","x":40,"y":60}]},"radar":{"youLabel":"Us","themLabel":"Average competitor","axes":[{"label":"Speed","you":85,"them":40},{"label":"Trust","you":92,"them":70}]},"antiPositioning":[{"are":"What we are","areNot":"What we are not"}]}`,
  // s11_risks has 4 variants — pick ONE shape:
  //   pairs[{risk,mitigation}]                                  → mitigation-pairs (default)
  //   riskRadar{risks:[{name,severity:0-100,probability:0-100}]} → risk-radar (2D scatter)
  //   riskNarrative[{question,answer}]                          → risk-narrative (q&a)
  //   riskTimeline[{when,name,mitigation?,peak?}]               → risk-timeline (when each peaks)
  s11_risks:       `{"tag":"string","headline":"string","sub":"string","lede":"string","pairs":[{"risk":"Risk description","mitigation":"How we mitigate"}],"riskRadar":null,"riskNarrative":[],"riskTimeline":[]}`,
  // s12_team_ask renders one of 4 variants. Pick the strongest framing:
  //   split-cta:      raising X for milestone Y + use-of-funds bullets (default)
  //   team-grid:      include "team"[{name, role, cred?, photo?}] when founders + credentials matter
  //   cap-table:      include "capTable"{round, valuation, leadInvestor, leadCommittedPct} when round terms are public
  //   milestone-road: include "milestones"[{when, what, detail?, isCurrent?}] when 3+ milestones make the story
  s12_team_ask:    `{"tag":"string","headline":"string","sub":"string","lede":"string","stats":[{"value":"$X","label":"Series A"},{"value":"by Y","label":"milestone"}],"bullets":["use of funds","hiring plan","milestones","contact"],"team":[],"capTable":null,"milestones":[]}`,
}

// Extend DeckInput to support free-form story (already used in codebase)
declare module './types' {
  interface DeckInput {
    realStory?: string
  }
}
