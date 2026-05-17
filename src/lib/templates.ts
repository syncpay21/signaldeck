/* ════════════════════════════════════════════════════════════════════
   PER-INDUSTRY TEMPLATE ENGINE
   Drives every workspace screen so the deck feels custom to the founder.
   Each industry produces: tips, quality-gate checklist, slide flow with
   motion + body, objection list, audit score baselines, story rewrites,
   speaker note tone, follow-up angle, claim rewrites, and VC profile fit.
═══════════════════════════════════════════════════════════════════ */

export type Severity = 'good' | 'warn' | 'risk' | 'info'

export interface Tip      { icon: string; severity: Severity; title: string; body: string }
export interface SlideDef { kind: string; title: string; body: string; motion: string; notes: string }
export interface Objection{ question: string; angle: string; severity: Severity }
export interface ClaimEx  { claim: string; status: string; risk: 'Low'|'Medium'|'High'; classification: 'supported'|'needs-source'|'risky'|'founder-thesis'; rewrite: string }

export interface Template {
  status:         string
  tips:           Tip[]
  checklist:      string[]
  slides:         SlideDef[]
  objections:     Objection[]
  scoreBaseline:  [number, number, number, number]   // story, proof, fit, market (0–10)
  rewriteBefore:  string
  rewriteAfter:   { headline: string; body: string }
  exampleClaims:  ClaimEx[]
  engagementLabels: string[]
  followupAngle:  { headline: string; reason: string }
  speakerTone:    string
  motionFlavor:   string
}

const _claims: Record<string, ClaimEx[]> = {
  Fintech: [
    { claim: 'Payments show money moved, but not what was bought.',                  status: 'Supported',          risk: 'Low',    classification: 'supported',      rewrite: 'Safe to use as a core problem framing.' },
    { claim: '10.6B paper receipts are printed annually.',                            status: 'Needs source',       risk: 'High',   classification: 'needs-source',   rewrite: 'Paper receipts remain common across retail and still create waste and record-keeping gaps.' },
    { claim: 'Accountants waste hours matching receipts to bank transactions.',       status: 'Discovery-backed',   risk: 'Medium', classification: 'supported',      rewrite: 'Accountants and SMBs still spend time manually matching payments to invoices and receipts.' },
    { claim: 'We can become the context layer for all payments.',                     status: 'Founder thesis',     risk: 'Medium', classification: 'founder-thesis', rewrite: 'We start by linking records to payments, with a longer-term path toward broader payment context.' },
    { claim: 'No one else does this.',                                                status: 'Risky',              risk: 'High',   classification: 'risky',          rewrite: 'Existing tools solve parts of the workflow, but we focus on linking the record before the payment lands.' },
    { claim: 'MVP is built and integrations are in progress.',                        status: 'Founder provided',   risk: 'Low',    classification: 'supported',      rewrite: 'MVP built, with integration work underway across payment and accounting workflows.' },
  ],
  SaaS: [
    { claim: 'Teams waste 8 hours a week on this workflow.',                          status: 'Needs source',       risk: 'High',   classification: 'needs-source',   rewrite: 'Discovery suggests teams spend several hours weekly on this manual step — quantify before pitching.' },
    { claim: 'Our NRR will reach 130%.',                                              status: 'Founder thesis',     risk: 'Medium', classification: 'founder-thesis', rewrite: 'Early cohort behaviour suggests expansion potential — say "we are tracking expansion" until cohorts mature.' },
    { claim: 'Customers pay $X within 30 days.',                                      status: 'Supported',          risk: 'Low',    classification: 'supported',      rewrite: 'Safe — keep customer logos in the appendix.' },
    { claim: 'We are 10x faster than the incumbent.',                                 status: 'Risky',              risk: 'High',   classification: 'risky',          rewrite: 'We replace a manual workflow that takes hours with a single configured action.' },
    { claim: 'The market is $50B and growing.',                                       status: 'Needs source',       risk: 'High',   classification: 'needs-source',   rewrite: 'Frame TAM via bottoms-up — number of teams × spend on the current workaround.' },
  ],
  AI: [
    { claim: 'Our agent reaches 94% accuracy.',                                       status: 'Needs source',       risk: 'High',   classification: 'needs-source',   rewrite: 'Internal evals show high accuracy on N tasks — share methodology and dataset size.' },
    { claim: 'No one else has this dataset.',                                         status: 'Risky',              risk: 'High',   classification: 'risky',          rewrite: 'We have proprietary access to X via Y partnership — call out the moat directly.' },
    { claim: 'GPT-4 cannot do this.',                                                 status: 'Founder thesis',     risk: 'Medium', classification: 'founder-thesis', rewrite: 'Off-the-shelf models lack the workflow context our system provides.' },
    { claim: 'Users save 4 hours a day.',                                             status: 'Supported',          risk: 'Low',    classification: 'supported',      rewrite: 'Safe — keep usage logs in appendix.' },
  ],
  Marketplace: [
    { claim: 'Our take rate will be 15%.',                                            status: 'Founder thesis',     risk: 'Medium', classification: 'founder-thesis', rewrite: 'Early experiments suggest 12–18% take rate is sustainable for this category.' },
    { claim: 'We have 10,000 suppliers signed up.',                                   status: 'Supported',          risk: 'Low',    classification: 'supported',      rewrite: 'Safe — separate "signed up" from "active" for credibility.' },
    { claim: 'Liquidity is solved.',                                                  status: 'Risky',              risk: 'High',   classification: 'risky',          rewrite: 'Match rate within our wedge category has reached X% — broader liquidity remains a wedge expansion.' },
  ],
  Consumer: [
    { claim: 'Users open the app 6x a day.',                                          status: 'Supported',          risk: 'Low',    classification: 'supported',      rewrite: 'Safe — cite cohort size and time window.' },
    { claim: 'We are the next TikTok.',                                               status: 'Risky',              risk: 'High',   classification: 'risky',          rewrite: 'We solve a behaviour gap that the current generation of social apps does not address.' },
    { claim: 'Retention is best-in-class.',                                           status: 'Needs source',       risk: 'High',   classification: 'needs-source',   rewrite: 'D30 retention is X% — show the curve, not just the headline number.' },
  ],
  Default: [
    { claim: 'The problem affects everyone.',                                         status: 'Risky',              risk: 'High',   classification: 'risky',          rewrite: 'Specifically, [segment] hits this problem [frequency] because [trigger].' },
    { claim: 'We are the only ones solving this.',                                    status: 'Risky',              risk: 'High',   classification: 'risky',          rewrite: 'Existing solutions address parts of this. We focus on [specific wedge] that they leave open.' },
    { claim: 'The team is uniquely qualified.',                                       status: 'Founder thesis',     risk: 'Medium', classification: 'founder-thesis', rewrite: 'Founder spent N years at [company] building [related thing] — gives us insight into [specific edge].' },
  ],
}

export const TEMPLATES: Record<string, Template> = {
  /* ── FINTECH ─────────────────────────────────────────────── */
  Fintech: {
    status: 'Fintech lens active',
    tips: [
      { icon: '✓', severity: 'good',  title: 'Lead with workflow pain',  body: 'Show the {wedge} pain at {company} before explaining the code or rails.' },
      { icon: '!', severity: 'warn',  title: 'Wedge must be believable', body: '{company} should start with one narrow buyer segment before claiming bank-scale infrastructure.' },
      { icon: '×', severity: 'risk',  title: 'Trust needs to appear early', body: '{audience} readers test data access, reliability, compliance, and adoption risk — answer it on slide 6 of {company}’s deck.' },
    ],
    checklist: ['Exact workflow pain','First paying wedge for {company}','System integration path','Trust and data control','Why {company} becomes infrastructure','Real competitor is manual work'],
    slides: [
      { kind: 'Hook',     title: 'The broken workflow',         body: '{company} opens with the exact pain that makes the company obvious.',  motion: 'zoom passage',  notes: '{founder} opens with the silence after a payment lands. Let it sit for a beat.' },
      { kind: 'Problem',  title: 'Payments are blind',          body: 'Show the gap between payment data and business records — the gap {company} closes.', motion: 'glitch',        notes: 'Use one specific {founder} anecdote. No statistics yet.' },
      { kind: 'Why now',  title: 'Rails changed',               body: 'Explain why {company} was not possible before, but is now needed.',     motion: 'fold',          notes: 'Tie to instant payments, ISO 20022, open banking — pick one.' },
      { kind: 'Product',  title: 'Context layer',               body: 'Show {company} simply before going technical.',                        motion: 'smooth reveal', notes: 'One screen, one user, one action. Save the API for later.' },
      { kind: 'Wedge',    title: 'Start with the first buyer',  body: 'Make {company}’s first customer segment clear and believable.',   motion: 'explode',       notes: 'Name the first 3 {company} design partners. Why them, why now.' },
      { kind: 'Trust',    title: 'Data control',                body: 'Explain where records live in {company} and who can resolve them.',    motion: 'clean fade',    notes: 'Mention encryption, audit logs, retention. Quick — they will ask.' },
      { kind: 'Vision',   title: 'Payment context layer',       body: 'Show how {company}’s narrow wedge becomes broader infrastructure.', motion:'vortex',         notes: '{founder} ends big. Show the 5-year picture without overclaiming.' },
    ],
    objections: [
      { question: 'Why has no one solved this already?',         angle: 'Tie {company} to wedge + timing — what changed in the rails that makes this possible now.',     severity: 'warn' },
      { question: 'What stops a large bank from copying this?',  angle: 'Distribution speed + integration breadth. Banks own one rail; {company} links all of them.',    severity: 'risk' },
      { question: 'How do you get distribution?',                angle: '{company}’s wedge network → SMB pull-through. Show the named first 3 partners.',           severity: 'info' },
    ],
    scoreBaseline: [8.2, 6.4, 7.1, 5.8],
    rewriteBefore: 'We help businesses collect receipts and connect them to payments.',
    rewriteAfter:  { headline: 'Payments show that money moved. They do not show what actually happened.', body: '{company} links the record to the payment, so businesses reconcile without chasing receipts, invoices, or missing context.' },
    exampleClaims: _claims.Fintech,
    engagementLabels: ['Hook','Problem','Why now','Product','Wedge','Trust','Vision'],
    followupAngle: { headline: 'Product depth and integration readiness', reason: 'They spent longest on {company}’s product and technical flow, but dropped near market sizing.' },
    speakerTone: 'Direct and grounded. Use the {founder} anecdote in slide 2. Slow down on Wedge.',
    motionFlavor: 'tense early, hands-on mid, sharp at the end',
  },

  /* ── SAAS ────────────────────────────────────────────────── */
  SaaS: {
    status: 'SaaS lens active',
    tips: [
      { icon: '✓', severity: 'good',  title: 'Lead with repeat pain',    body: 'Show the recurring workflow issue {company} solves — the one that creates budget.' },
      { icon: '!', severity: 'warn',  title: 'ROI needs to be concrete', body: '{company} should frame time saved, cost reduced, or revenue unlocked — with a number.' },
      { icon: '×', severity: 'risk',  title: 'ICP is too wide',          body: '{audience} will press until {company} names one specific first segment.' },
    ],
    checklist: ['Specific ICP for {company}','Current workaround','ROI proof','Adoption path','Expansion potential','Budget owner'],
    slides: [
      { kind: 'Pain',     title: 'The workflow tax',           body: '{company} makes the repeated daily problem obvious.',         motion: 'hard cut',     notes: 'Use a real {company} customer day-in-the-life. Walk through the pain.' },
      { kind: 'Customer', title: 'Who feels it most',          body: 'Define the buyer and user {company} sells to with precision.', motion: 'slide up',     notes: 'Name the buyer title. Name the user title. Be specific.' },
      { kind: 'Product',  title: 'Before and after',           body: 'Show the {company} transformation in one screen.',            motion: 'smooth reveal',notes: 'A 5-second before/after image works better than a demo here.' },
      { kind: 'ROI',      title: 'Why they pay',               body: 'Quantify saved time or money on {company}.',                  motion: 'stat pulse',   notes: 'One number, one source, one {company} customer quote. Done.' },
      { kind: 'GTM',      title: 'Land and expand',            body: 'Show {company}’s route from first users to teams.',           motion: 'flow',         notes: 'Cite expansion within accounts. Logo expansion is a story.' },
    ],
    objections: [
      { question: 'Is this a feature or a company?',         angle: 'Show breadth of the workflow {company} owns — multi-step, multi-role, defensible by depth.', severity: 'risk' },
      { question: 'How do you get past procurement?',        angle: '{company}’s self-serve wedge → champion → procurement. Name the bottoms-up motion.',         severity: 'warn' },
      { question: 'Why will big SaaS not copy?',             angle: 'Speed + depth. Incumbents will bolt on; {company} is designed for it.',                       severity: 'info' },
    ],
    scoreBaseline: [7.6, 6.7, 7.3, 6.4],
    rewriteBefore: 'We help teams do their work faster.',
    rewriteAfter:  { headline: 'The workflow is not broken once. It breaks every week.', body: '{company} turns a repeated manual process into a clear system teams use without duct tape.' },
    exampleClaims: _claims.SaaS,
    engagementLabels: ['Pain','Customer','Product','ROI','GTM'],
    followupAngle: { headline: 'Concrete ROI for their portfolio', reason: 'They paused on {company}’s ROI slide twice — lead the follow-up with the customer case study.' },
    speakerTone: 'Crisp and confident. Use the {company} customer name. ROI slide is the closer.',
    motionFlavor: 'fast, concrete, transactional',
  },

  /* ── AI ──────────────────────────────────────────────────── */
  AI: {
    status: 'AI lens active',
    tips: [
      { icon: '✓', severity: 'good',  title: 'Show the agent loop',       body: '{audience} need to see what {company}’s agent observes, decides, and executes.' },
      { icon: '!', severity: 'warn',  title: 'Avoid prompt-wrapper risk', body: '{company} must explain proprietary data, workflow depth, or distribution moat.' },
      { icon: '×', severity: 'risk',  title: 'Quality proof is missing',  body: '{company} should show accuracy, evals, human review, or benchmark evidence.' },
    ],
    checklist: ['Workflow before {company}','{company} agent loop','Output quality','Data edge','Defensibility beyond prompts','Human review path'],
    slides: [
      { kind: 'Pain',     title: 'Manual work loop',       body: 'Show the repeated workflow {company} replaces.',          motion: 'glitch',     notes: 'Walk through the human steps. Each one is a candidate for {company} automation.' },
      { kind: 'Why now',  title: 'Models are useful now',  body: 'Explain the timing shift that made {company} possible.',  motion: 'zoom passage', notes: 'Frontier capability + workflow specificity. Both, not one.' },
      { kind: 'Agent',    title: 'Observe decide act',     body: 'Show the actual {company} agent loop.',                   motion: 'orbit',      notes: 'A diagram beats a sentence. Pause on the decide step.' },
      { kind: 'Proof',    title: 'Output quality',         body: 'Show evals, accuracy, or examples from {company}.',        motion: 'stat pulse', notes: 'One eval graph, one before/after, one {company} customer outcome.' },
      { kind: 'Moat',     title: 'Data advantage',         body: 'Explain why {company} gets better over time.',             motion: 'vortex',     notes: 'Compound on usage data, RLHF, customer-specific tuning.' },
    ],
    objections: [
      { question: 'What stops OpenAI from doing this?',  angle: '{company}’s workflow depth + proprietary data. Foundation models do not own the workflow.', severity: 'risk' },
      { question: 'How accurate is it really?',          angle: 'Internal evals + human-in-the-loop where accuracy is critical. {company} shows the curve.', severity: 'warn' },
      { question: 'Is this a wrapper?',                  angle: '{company} shows its proprietary layer — data, workflow, distribution, human review system.', severity: 'risk' },
    ],
    scoreBaseline: [7.4, 5.9, 7.8, 6.6],
    rewriteBefore: 'We use AI to help users do their job.',
    rewriteAfter:  { headline: 'The old workflow needs a human at every step.', body: '{company} gives teams an agent that observes the workflow, decides the next action, and executes with review.' },
    exampleClaims: _claims.AI,
    engagementLabels: ['Pain','Why now','Agent','Proof','Moat'],
    followupAngle: { headline: 'Output quality benchmark + moat story', reason: 'They lingered on {company}’s agent loop but skipped the moat slide — pre-empt the wrapper concern.' },
    speakerTone: 'Technical but not jargon-heavy. Slow down on {company}’s agent loop diagram.',
    motionFlavor: 'restrained, evidence-led, proof-first — avoid generic AI futurism unless the brand explicitly leans into it',
  },

  /* ── ENTERPRISE ──────────────────────────────────────────── */
  Enterprise: {
    status: 'Enterprise lens active',
    tips: [
      { icon: '✓', severity: 'good',  title: 'Quantified ROI lead',     body: '{company} opens with the dollar saved per enterprise, not the feature.' },
      { icon: '!', severity: 'warn',  title: 'Sales cycle reality',     body: '{company} shows the path to closing a $250k+ ACV deal, not a hopeful POC.' },
      { icon: '×', severity: 'risk',  title: 'Security and compliance', body: 'SOC 2, HIPAA, on-prem, SSO — call out what {company} ships and what is on roadmap.' },
    ],
    checklist: ['Champion + economic buyer','POC → contract path','{company} security posture','Integration depth','Replacement ROI','Customer reference'],
    slides: [
      { kind: 'Cost',     title: 'What the incumbent costs',  body: '{company} anchors on the dollar figure that justifies a replacement.', motion: 'stat pulse',    notes: 'Use a real {company} customer dollar figure. Source it.' },
      { kind: 'Pain',     title: 'Where the legacy breaks',   body: 'Workflow gap {company} closes that costs time and risk today.',         motion: 'fold',          notes: 'Pull a screenshot or quote from a {company} customer interview.' },
      { kind: 'Product',  title: 'The replacement',           body: 'Show the cleaner {company} workflow in one diagram.',                   motion: 'smooth reveal', notes: 'Side-by-side: old vs {company}. Visual wins this slide.' },
      { kind: 'Proof',    title: 'Customer reference',        body: 'One named {company} logo, one quote, one outcome.',                     motion: 'clean fade',    notes: 'Lead with the customer name they will recognize.' },
      { kind: 'Security', title: 'Trust posture',             body: '{company} compliance, isolation, data residency.',                     motion: 'hard cut',      notes: 'A 10-second slide. They are looking for the icons.' },
      { kind: 'GTM',      title: 'Sales motion',              body: '{company} champion → POC → contract → expand.',                       motion: 'flow',          notes: 'Show {company}’s typical 90-day path. Cite the longest deal.' },
    ],
    objections: [
      { question: 'How long is your sales cycle really?',     angle: '{company} shows median + range. POC duration is the leading indicator.', severity: 'warn' },
      { question: 'Will the incumbent just match price?',     angle: '{company}’s replacement story is depth, not price. Show what we own that they cannot.', severity: 'risk' },
      { question: 'What is your customer concentration?',     angle: 'Top 3 {company} ACVs as % of revenue. Show diversification plan.', severity: 'info' },
    ],
    scoreBaseline: [7.8, 7.4, 7.6, 7.0],
    rewriteBefore: 'We replace legacy software for enterprises.',
    rewriteAfter:  { headline: 'Enterprises pay millions for software no one wants to use.', body: '{company} replaces the legacy stack with one workflow teams actually adopt — and proves the ROI in the first quarter.' },
    exampleClaims: _claims.Default,
    engagementLabels: ['Cost','Pain','Product','Proof','Security','GTM'],
    followupAngle: { headline: 'POC pilot scope + reference call', reason: 'They asked about {company}’s security on the call — send the SOC 2 letter and the customer ref.' },
    speakerTone: 'Measured and reference-driven. Always cite {company} customer names.',
    motionFlavor: 'trust-building, ROI-anchored, deliberate',
  },

  /* ── CONSUMER ────────────────────────────────────────────── */
  Consumer: {
    status: 'Consumer lens active',
    tips: [
      { icon: '✓', severity: 'good',  title: 'Lead with behaviour',         body: '{company} shows the behaviour shift, not the feature list.' },
      { icon: '!', severity: 'warn',  title: 'Retention matters early',     body: '{audience} will ask why {company} users come back. Have a curve, not a metaphor.' },
      { icon: '×', severity: 'risk',  title: 'Distribution cannot be vague', body: '{company} needs a believable growth loop.' },
    ],
    checklist: ['{company} behaviour shift','Emotional pain','Product moment','Retention loop','Distribution edge','Cultural timing'],
    slides: [
      { kind: 'Behaviour', title: 'A new habit is forming',  body: 'Show the shift in user behaviour {company} unlocks.', motion: 'soft reveal',  notes: 'Open with a cultural reference your audience knows.' },
      { kind: 'Pain',      title: 'Why users care',          body: 'Make {company}’s pain emotional and specific.',     motion: 'zoom passage', notes: 'One real {company} user quote. Read it slowly.' },
      { kind: 'Moment',    title: 'Product magic',           body: 'Show the {company} aha moment.',                    motion: 'pop',          notes: 'A 5-second clip. If you have to explain it, redo it.' },
      { kind: 'Retention', title: 'Why they return',         body: 'Show {company}’s frequency or habit loop.',         motion: 'flow',         notes: 'D7, D30, D90 — show the curve and the cohort.' },
      { kind: 'Growth',    title: 'How it spreads',          body: 'Show {company}’s loop or channel.',                 motion: 'explode',      notes: 'One sentence per growth loop. Name the K-factor if you have it.' },
    ],
    objections: [
      { question: 'Why will users come back?',           angle: '{company} shows D7 retention curve, not D1. Habit loop > novelty.', severity: 'warn' },
      { question: 'How is this defensible?',             angle: 'Community, content, distribution. {company} picks the one that compounds.', severity: 'risk' },
      { question: 'What is your CAC vs LTV story?',      angle: '{company} starts organic, then paid. Show the loop before the spend.', severity: 'info' },
    ],
    scoreBaseline: [7.8, 6.2, 7.2, 6.1],
    rewriteBefore: 'We are an app that helps people connect.',
    rewriteAfter:  { headline: 'Users do not need another app. They need a reason to come back.', body: '{company} turns a painful behaviour into a simple product moment that becomes a daily habit.' },
    exampleClaims: _claims.Consumer,
    engagementLabels: ['Behaviour','Pain','Moment','Retention','Growth'],
    followupAngle: { headline: 'Retention curve + product clip', reason: 'They watched {company}’s demo twice — send the longer walkthrough and the cohort retention chart.' },
    speakerTone: 'Warm, energetic, anchored in real {company} users. Show the clip early.',
    motionFlavor: 'emotional, fast, visual-heavy',
  },

  /* ── DEVELOPER TOOLS ─────────────────────────────────────── */
  'Developer Tools': {
    status: 'Devtools lens active',
    tips: [
      { icon: '✓', severity: 'good',  title: 'Show developer pain fast',     body: 'Developers need to see the broken workflow {company} fixes in seconds.' },
      { icon: '!', severity: 'warn',  title: 'Adoption path matters',         body: '{company} should explain docs, SDKs, API ergonomics, or open-source route.' },
      { icon: '×', severity: 'risk',  title: 'Moat cannot be only features', body: '{company} should show community, workflow lock-in, data, or ecosystem.' },
    ],
    checklist: ['Developer pain {company} fixes','API or CLI flow','Time-to-value','Adoption path','Ecosystem moat','Docs quality'],
    slides: [
      { kind: 'Pain',     title: 'Developers are duct taping this', body: 'Show the hacky current workflow {company} replaces.', motion: 'glitch',     notes: 'A real code snippet from a real repo. Make it ugly.' },
      { kind: 'Product',  title: 'One clean API',                   body: 'Show the simplest {company} implementation.',         motion: 'terminal',   notes: '3 lines of {company} code. Nothing more.' },
      { kind: 'Demo',     title: 'From install to value',           body: 'Show a quick {company} developer flow.',              motion: 'scroll snap', notes: 'Install → first response. Time it on stage.' },
      { kind: 'Adoption', title: 'Why teams spread it',             body: '{company} internal expansion.',                       motion: 'flow',       notes: 'GitHub stars, npm downloads, or {company} signups week-over-week.' },
      { kind: 'Moat',     title: 'Ecosystem edge',                  body: 'Show what compounds for {company}.',                   motion: 'vortex',     notes: 'Integrations, plugins, community contributions.' },
    ],
    objections: [
      { question: 'Will this be open-sourced and commoditized?',  angle: '{company} hosted offering + enterprise features. Open core if relevant.', severity: 'warn' },
      { question: 'How do devs find you?',                        angle: '{company} via GitHub + content + community. Name the inbound channels working.', severity: 'info' },
      { question: 'How do you monetize?',                         angle: '{company} usage tier + team tier + enterprise. Show conversion at each step.',   severity: 'risk' },
    ],
    scoreBaseline: [7.4, 6.5, 7.0, 6.2],
    rewriteBefore: 'We build a tool for developers.',
    rewriteAfter:  { headline: 'Developers spend more time wiring tools than shipping product.', body: '{company} gives them one clean implementation path that removes repeated integration work.' },
    exampleClaims: _claims.Default,
    engagementLabels: ['Pain','Product','Demo','Adoption','Moat'],
    followupAngle: { headline: 'Trial credentials + integration scope', reason: 'They starred {company} on GitHub but did not sign up — send credentials and the quickstart.' },
    speakerTone: 'Technical, terse, code-first. Less marketing, more {company} terminal.',
    motionFlavor: 'punchy, dev-aesthetic, copy-pasteable',
  },

  /* ── CLIMATE ─────────────────────────────────────────────── */
  Climate: {
    status: 'Climate lens active',
    tips: [
      { icon: '✓', severity: 'good',  title: 'Tons CO2 or dollars saved',    body: '{company} leads with the measurable climate outcome, not the technology.' },
      { icon: '!', severity: 'warn',  title: 'Unit economics need detail',   body: '{audience} will ask {company} about cost per ton or LCOE — have the number.' },
      { icon: '×', severity: 'risk',  title: 'Scale path is the moat',       body: '{company} shows how this becomes 1000x bigger, not just iteratively better.' },
    ],
    checklist: ['Measurable outcome','{company} cost per ton','Customer + buyer','Scale path','Policy alignment','Tech maturity'],
    slides: [
      { kind: 'Stake',     title: 'What is at risk',            body: '{company} anchors on the climate cost, in tons and dollars.', motion: 'soft reveal',   notes: 'One number, one source. Make it personal.' },
      { kind: 'Why now',   title: 'Cost curves shifted',        body: 'Explain why {company} is finally economically viable.',        motion: 'fold',          notes: 'Tie to a specific cost curve — solar, battery, capture.' },
      { kind: 'Product',   title: 'What we build',              body: 'Show {company} at the unit level.',                            motion: 'smooth reveal', notes: 'Diagram or photo of the actual unit. Not a render.' },
      { kind: 'Economics', title: 'Cost per outcome',           body: '{company} cost-down curve over time.',                         motion: 'stat pulse',    notes: 'Show today, year 3, year 5. Cite assumptions.' },
      { kind: 'Customer',  title: 'Who buys it',                body: 'Buyer type and contract structure for {company}.',             motion: 'flow',          notes: 'Offtake, utility, corporate — name the buyer category.' },
      { kind: 'Scale',     title: 'The path to gigatons',       body: 'How {company} becomes infrastructure.',                         motion: 'vortex',        notes: 'End on the system scale. Avoid hand-waving.' },
    ],
    objections: [
      { question: 'What is your cost per ton at scale?',     angle: '{company} shows the cost-down curve with assumptions. Be honest about the gap.', severity: 'warn' },
      { question: 'Who actually pays for this?',             angle: '{company} names the buyer category and contract structure — offtake, RPS, voluntary.', severity: 'info' },
      { question: 'How is this not a science project?',      angle: '{company} customer LOI + first revenue + clear unit economics by year N.', severity: 'risk' },
    ],
    scoreBaseline: [7.2, 6.8, 6.9, 6.4],
    rewriteBefore: 'We are tackling climate change.',
    rewriteAfter:  { headline: 'A gigaton of carbon costs less to remove than ever before.', body: '{company} builds the system that captures it at the cost line where utilities and corporates actually buy.' },
    exampleClaims: _claims.Default,
    engagementLabels: ['Stake','Why now','Product','Economics','Customer','Scale'],
    followupAngle: { headline: 'Cost curve + first customer LOI', reason: 'They are an outcomes-driven fund — they need {company}’s unit economics, not the mission deck.' },
    speakerTone: 'Outcome-anchored. Quantify everything {company} does. Avoid environmental abstractions.',
    motionFlavor: 'grounded, system-scale, factual',
  },

  /* ── HEALTH ──────────────────────────────────────────────── */
  Health: {
    status: 'Health lens active',
    tips: [
      { icon: '✓', severity: 'good',  title: 'Outcome over feature',    body: '{company} leads with the clinical or financial outcome, not the platform.' },
      { icon: '!', severity: 'warn',  title: 'Reimbursement path',      body: 'Without a path to who pays {company}, the deck stalls. Show it.' },
      { icon: '×', severity: 'risk',  title: 'Regulatory clarity',      body: 'FDA, HIPAA, state law — {company} calls out the path and the gating risks.' },
    ],
    checklist: ['Clinical outcome','{company} buyer + payer','Reimbursement code','Clinical evidence','Regulatory path','Network of providers'],
    slides: [
      { kind: 'Patient',    title: 'Who is hurting',          body: '{company} anchors on the patient, not the system.',   motion: 'soft reveal',   notes: 'A real {company} patient story. One name. One outcome.' },
      { kind: 'System',     title: 'Why care is broken here', body: 'Workflow or financial gap in care {company} closes.', motion: 'fold',          notes: 'Cite a clinician quote or a published study.' },
      { kind: 'Product',    title: 'How we change it',        body: 'Show the {company} intervention in one screen.',      motion: 'smooth reveal', notes: 'Avoid jargon. Picture > acronyms.' },
      { kind: 'Evidence',   title: 'Clinical proof',          body: '{company} trial data or pilot outcomes.',             motion: 'stat pulse',    notes: 'One peer-reviewed citation > 10 internal claims.' },
      { kind: 'Buyer',      title: 'Who pays',                body: '{company} payer model and contract structure.',       motion: 'flow',          notes: 'CMS, payer, employer, provider — name it.' },
      { kind: 'Scale',      title: 'The system reach',        body: 'How {company} becomes care infrastructure.',           motion: 'vortex',        notes: 'End on lives reached, not dollars earned.' },
    ],
    objections: [
      { question: 'What is your reimbursement story?',         angle: '{company} names the CPT code or value-based path. Reimbursement is the gate.', severity: 'risk' },
      { question: 'How fast can you scale clinical trials?',   angle: '{company} trial design + IRB partners + pre-existing data. Show the velocity.', severity: 'warn' },
      { question: 'What is your regulatory risk?',             angle: '{company} FDA path + classification + de novo vs 510(k). Be specific.', severity: 'risk' },
    ],
    scoreBaseline: [7.5, 7.0, 7.4, 6.7],
    rewriteBefore: 'We are improving healthcare.',
    rewriteAfter:  { headline: 'Patients fall through the gaps between providers. We close them.', body: '{company} reaches the patient at the moment care breaks down — and gets paid for it via existing reimbursement.' },
    exampleClaims: _claims.Default,
    engagementLabels: ['Patient','System','Product','Evidence','Buyer','Scale'],
    followupAngle: { headline: 'Reimbursement memo + clinical citation', reason: 'They are a healthtech specialist fund — they will ask about {company}’s CPT codes and trial design.' },
    speakerTone: 'Compassionate but rigorous. Cite {company} studies, not vibes.',
    motionFlavor: 'clinical, evidence-led, patient-anchored',
  },

  /* ── EDUCATION ───────────────────────────────────────────── */
  Education: {
    status: 'Edtech lens active',
    tips: [
      { icon: '✓', severity: 'good',  title: 'Outcome over engagement', body: '{company} shows learning outcomes, not just time-on-app.' },
      { icon: '!', severity: 'warn',  title: 'Buyer ≠ user',             body: 'Parents, schools, districts, learners — {company} picks one buyer and stays with them.' },
      { icon: '×', severity: 'risk',  title: 'Distribution in schools',  body: 'School sales cycles are long. {company} shows the wedge that bypasses procurement.' },
    ],
    checklist: ['{company} learner outcome','Buyer + user split','Engagement loop','Distribution edge','Pricing model','Evidence of efficacy'],
    slides: [
      { kind: 'Gap',      title: 'Where learning falls short', body: '{company} specific outcome gap for a specific group.',  motion: 'soft reveal',   notes: 'One {company} learner story. One outcome missed.' },
      { kind: 'Product',  title: 'The new learning loop',      body: 'Show the daily {company} product moment.',              motion: 'smooth reveal', notes: 'A 10-second screen recording of a learner using {company}.' },
      { kind: 'Evidence', title: 'Outcome proof',              body: '{company} pre/post scores or completion lift.',         motion: 'stat pulse',    notes: 'Cite the third-party study or in-product cohort data.' },
      { kind: 'Loop',     title: 'Why learners return',        body: '{company} engagement and habit signal.',                motion: 'flow',          notes: 'D30 retention. Show the streak/cohort behaviour.' },
      { kind: 'Buyer',    title: 'Who pays',                   body: 'Parent, school, district, learner — {company} picks one.', motion: 'pop',        notes: 'Name the buyer. ARR per buyer. Sales cycle length.' },
    ],
    objections: [
      { question: 'Does this actually improve outcomes?', angle: '{company} cites the study or the cohort data. No engagement metric beats an outcome.', severity: 'risk' },
      { question: 'How do you sell into schools?',        angle: '{company} teacher-led adoption → district contract. Show the wedge.', severity: 'warn' },
      { question: 'Why not free open content?',           angle: '{company} is not content — it is the loop that produces outcomes.', severity: 'info' },
    ],
    scoreBaseline: [7.4, 6.5, 7.1, 6.0],
    rewriteBefore: 'We are an education platform.',
    rewriteAfter:  { headline: 'Engagement does not equal learning. We measure the gap that matters.', body: '{company} turns daily practice into measurable outcome lift — backed by cohort data, not user time.' },
    exampleClaims: _claims.Default,
    engagementLabels: ['Gap','Product','Evidence','Loop','Buyer'],
    followupAngle: { headline: 'Outcome study + teacher pilot offer', reason: 'They asked about outcome evidence — send the {company} cohort report and a free pilot for one classroom.' },
    speakerTone: 'Optimistic but outcome-led. Lead with {company} learners, close with the buyer.',
    motionFlavor: 'hopeful, evidence-anchored, learner-centred',
  },

  /* ── DEFAULT / OTHER ─────────────────────────────────────── */
  Other: {
    status: 'Generalist lens active',
    tips: [
      { icon: '✓', severity: 'good',  title: 'Lead with the wedge',  body: '{company} picks one customer, one painful workflow, one outcome. Stay narrow.' },
      { icon: '!', severity: 'warn',  title: 'Concrete proof early', body: '{audience} want one {company} number that is true today, not a forecast.' },
      { icon: '×', severity: 'risk',  title: 'Defensibility story',  body: '{company} shows what compounds: data, distribution, network, integration.' },
    ],
    checklist: ['{company} narrow wedge','First customer proof','Defensibility','Distribution path','Why now','Founder edge'],
    slides: [
      { kind: 'Hook',    title: 'The status quo is broken', body: '{company} opens with the pain that makes the company obvious.', motion: 'zoom passage',  notes: '{founder} uses a real anecdote. Earn the right to talk about market size later.' },
      { kind: 'Pain',    title: 'Who hurts the most',       body: '{company} defines the wedge customer precisely.',                motion: 'fold',          notes: 'Name the persona. Don\'t generalise.' },
      { kind: 'Product', title: 'What we built',            body: 'Show {company}, not the pitch.',                                motion: 'smooth reveal', notes: 'One screen, one user, one outcome. Save features for inspector.' },
      { kind: 'Proof',   title: 'Why it works',             body: 'One {company} number, one customer, one outcome.',              motion: 'stat pulse',    notes: 'The proof slide is the closer. Make it tight.' },
      { kind: 'Why now', title: 'What changed',             body: 'Why {company} is finally possible or finally needed.',          motion: 'fold',          notes: 'Pick a single shift. Tie it to your wedge.' },
      { kind: 'Vision',  title: 'Where this goes',          body: 'How {company}’s wedge becomes the company.',                  motion: 'vortex',        notes: 'End big without overclaiming.' },
    ],
    objections: [
      { question: 'Why now?',                         angle: '{company} picks one shift — tech, regulatory, behaviour — and ties it to the wedge.', severity: 'warn' },
      { question: 'Why you?',                         angle: '{founder} insight that earns the right to build {company}. Specific, not generic.', severity: 'info' },
      { question: 'Why does this become a company?', angle: '{company} shows what compounds — data, distribution, integration depth.', severity: 'risk' },
    ],
    scoreBaseline: [7.0, 6.5, 6.8, 6.2],
    rewriteBefore: 'We are building a solution to a big problem.',
    rewriteAfter:  { headline: 'The status quo costs more than people realise.', body: '{company} starts by serving one customer profile with one painful workflow — and earns the right to expand from there.' },
    exampleClaims: _claims.Default,
    engagementLabels: ['Hook','Pain','Product','Proof','Why now','Vision'],
    followupAngle: { headline: 'Customer proof + wedge clarity', reason: 'Send the named {company} customer outcome and the 6-month wedge expansion plan.' },
    speakerTone: 'Direct, founder-led, no jargon. Use one anecdote, one number, one {company} customer.',
    motionFlavor: 'clear, paced, anecdote-driven',
  },
}

/* ── VC PROFILES ──────────────────────────────────────────── */
export interface VCProfile { name: string; fund: string; focus: string[]; questionsLikely: string[] }

export const VC_PROFILES: Record<string, VCProfile> = {
  'Seed VC':   { name: 'Seed VC',           fund: 'Generalist Seed ($500k–$2M)',     focus: ['Conviction','Insight quality','Believable wedge','Narrative clarity'],   questionsLikely: ['Why this team?','What is the wedge?','Why now?','What compounds?','How do you get the first 10 customers?'] },
  'Series A':  { name: 'Series A',          fund: 'Series A Lead ($8M–$15M)',         focus: ['Repeatable GTM','NRR','Payback period','Channel proof'],                  questionsLikely: ['What is CAC payback?','What is NRR?','Show me the GTM motion','What channels work?','What expansion proof exists?'] },
  'Angel':     { name: 'Operator Angel',    fund: 'Angel ($25k–$250k)',               focus: ['Founder edge','Network','Speed of execution','Unfair advantage'],         questionsLikely: ['Why you?','What is the unfair edge?','Who else is in?','How fast can you ship?','What can I help with?'] },
  'Strategic': { name: 'Strategic',         fund: 'Corporate Development',            focus: ['Distribution fit','Integration cost','M&A optionality','Stack overlap'],   questionsLikely: ['How does this fit our stack?','Integration scope?','Distribution leverage?','What is the long-term path?','Acquisition optionality?'] },
  'Internal':  { name: 'Internal',          fund: 'Board / Team',                     focus: ['Decision framing','What changed','Smallest ask','Risk-adjusted bet'],     questionsLikely: ['What decision are we making?','What changed since last review?','What is the smallest ask?','What is the downside?','Who owns the outcome?'] },
}

/* ── Helpers ──────────────────────────────────────────────── */
export function getTemplate(industry?: string): Template {
  if (!industry) return TEMPLATES.Other
  return TEMPLATES[industry] || TEMPLATES.Other
}

export interface PersonalCtx {
  company:  string
  wedge:    string
  audience: string
  stage:    string
  product:  string
  founder:  string
}

export function personalize(text: string | undefined, ctx: PersonalCtx): string {
  if (!text) return ''
  return text
    .replace(/\{company\}/g,  ctx.company  || 'The company')
    .replace(/\{wedge\}/g,    ctx.wedge    || 'this workflow')
    .replace(/\{audience\}/g, ctx.audience || 'investors')
    .replace(/\{stage\}/g,    ctx.stage    || 'pre-seed')
    .replace(/\{product\}/g,  ctx.product  || 'this space')
    .replace(/\{founder\}/g,  ctx.founder  || 'The founder')
}

export function extractWedge(realStory?: string, fallback = 'this workflow'): string {
  if (!realStory) return fallback
  const first = realStory.split(/[.!?]/)[0]?.trim()
  if (!first || first.length === 0) return fallback
  if (first.length > 80) return fallback
  return first.toLowerCase().replace(/^(we |our |the )/i, '')
}
