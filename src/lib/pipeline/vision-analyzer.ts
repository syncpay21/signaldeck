/* ════════════════════════════════════════════════════════════════════
   VISION ANALYZER — Sonnet vision on user-uploaded screenshots

   Replaces the headless-screenshot approach. The user uploads what they
   want represented (homepage hero, product UI), we feed it to Sonnet
   vision and get back structured brand-feel data:

     - dominantHex      primary brand color extracted from the image
     - accentHex        secondary/complementary
     - mood             playful-gradient | editorial-minimal | technical-mono
                        | luxury-restraint | bold-loud
     - typography       bold-condensed | serif-editorial | geometric-sans
                        | playful-script | mono-technical
     - imageryArchetype 3d-render | photography | illustration | abstract | none
     - layout           centered-hero | split-image-text | gradient-blob
                        | minimalist-text-only | dense-product
     - confidence       0-100

   Best-effort: returns null on failure rather than throwing. The
   downstream pipeline falls back to industry-guide defaults.
═══════════════════════════════════════════════════════════════════ */

import Anthropic from '@anthropic-ai/sdk'
import { ANDREAS_PERSONA } from '../andreas-persona'

export type BrandMood       = 'playful-gradient' | 'editorial-minimal' | 'technical-mono' | 'luxury-restraint' | 'bold-loud'
export type TypographyFeel  = 'bold-condensed' | 'serif-editorial' | 'geometric-sans' | 'playful-script' | 'mono-technical'
export type LayoutArchetype = 'centered-hero' | 'split-image-text' | 'gradient-blob' | 'minimalist-text-only' | 'dense-product'
export type ImageryArchetype = '3d-render' | 'photography' | 'illustration' | 'abstract' | 'none'

export interface VisionResult {
  dominantHex:      string
  accentHex:        string
  mood:             BrandMood
  typography:       TypographyFeel
  imageryArchetype: ImageryArchetype
  layout:           LayoutArchetype
  confidence:       number   // 0-100
  reasoning:        string
}

const SYSTEM_PROMPT = `${ANDREAS_PERSONA}

YOUR JOB HERE
Brand-vision pass. Look at the company's website screenshot or product image and return a structured analysis of its visual identity — the way a senior brand designer would.

Pick from these exact values:
  mood:             "playful-gradient" | "editorial-minimal" | "technical-mono" | "luxury-restraint" | "bold-loud"
  typography:       "bold-condensed" | "serif-editorial" | "geometric-sans" | "playful-script" | "mono-technical"
  imageryArchetype: "3d-render" | "photography" | "illustration" | "abstract" | "none"
  layout:           "centered-hero" | "split-image-text" | "gradient-blob" | "minimalist-text-only" | "dense-product"

CRITICAL — describe THIS brand, not its genre:
- Do NOT default to "technical-mono" / dark purple-cyan just because the company is in AI or tech. Many AI/tech brands are deliberately restrained, editorial, or warm.
- A clean white SaaS with one strong colour is "editorial-minimal", not "technical-mono".
- "playful-gradient" only when the brand actually leans on multi-colour gradient blobs (Luma, Linear, Notion AI).
- "technical-mono" only when the brand actually is mono-heavy and dense (Vercel old design, Raycast, terminal-first).
- Reserve the generic-AI look (dark + purple-cyan glow + glass) for brands that visibly use it — don't infer it from category.

Color hexes: extract from what you actually see. dominantHex is the primary color (often the accent/CTA colour); accentHex is a complementary secondary.

confidence: 0-100. Lower if the image is ambiguous or off-brand (e.g. a screenshot of a third-party login modal).

Return ONLY valid JSON, no markdown fences:
{
  "dominantHex": "#rrggbb",
  "accentHex": "#rrggbb",
  "mood": "<one of the values>",
  "typography": "<one of the values>",
  "imageryArchetype": "<one of the values>",
  "layout": "<one of the values>",
  "confidence": 0-100,
  "reasoning": "1-2 sentence justification grounded in what's actually visible"
}`

const VALID = {
  mood:             new Set(['playful-gradient','editorial-minimal','technical-mono','luxury-restraint','bold-loud']),
  typography:       new Set(['bold-condensed','serif-editorial','geometric-sans','playful-script','mono-technical']),
  imageryArchetype: new Set(['3d-render','photography','illustration','abstract','none']),
  layout:           new Set(['centered-hero','split-image-text','gradient-blob','minimalist-text-only','dense-product']),
}

/** Convert a data:URL to the Anthropic SDK image-input shape. */
function parseDataUrl(dataUrl: string): { mediaType: string; data: string } | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!m) return null
  return { mediaType: m[1], data: m[2] }
}

export async function analyzeBrand(
  client: Anthropic,
  imageDataUrl: string,
  context: { company?: string; industry?: string } = {},
): Promise<VisionResult | null> {
  const parsed = parseDataUrl(imageDataUrl)
  if (!parsed) return null

  const userPrompt = `Company: ${context.company || '(unknown)'}
Industry: ${context.industry || '(unknown)'}

Analyze the attached image and return the JSON exactly as specified.`

  let raw: string
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: parsed.mediaType as any, data: parsed.data } },
          { type: 'text',  text: userPrompt },
        ],
      }],
    })
    raw = (message.content[0] as any).text?.trim() ?? ''
  } catch {
    return null
  }

  const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  let parsedJson: any
  try { parsedJson = JSON.parse(jsonStr) }
  catch {
    const m = jsonStr.match(/\{[\s\S]*\}/)
    if (!m) return null
    try { parsedJson = JSON.parse(m[0]) }
    catch { return null }
  }

  // Defensive: normalise + enforce enum values
  const fb = <T extends string>(v: any, set: Set<string>, fallback: T): T =>
    typeof v === 'string' && set.has(v) ? (v as T) : fallback

  const hex = (v: any, fallback: string): string =>
    typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : fallback

  return {
    dominantHex:      hex(parsedJson.dominantHex, '#0F1115'),
    accentHex:        hex(parsedJson.accentHex,   '#0F1115'),
    mood:             fb<BrandMood>(parsedJson.mood, VALID.mood, 'editorial-minimal'),
    typography:       fb<TypographyFeel>(parsedJson.typography, VALID.typography, 'geometric-sans'),
    imageryArchetype: fb<ImageryArchetype>(parsedJson.imageryArchetype, VALID.imageryArchetype, 'none'),
    layout:           fb<LayoutArchetype>(parsedJson.layout, VALID.layout, 'centered-hero'),
    confidence:       Math.max(0, Math.min(100, Number(parsedJson.confidence) || 0)),
    reasoning:        typeof parsedJson.reasoning === 'string' ? parsedJson.reasoning : '',
  }
}
