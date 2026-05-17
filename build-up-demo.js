const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./up-raw.json', 'utf8'));
if (data.error) { console.error('API error:', data.error); process.exit(1); }
const out = {
  form: {
    company: 'Up',
    industry: 'Fintech',
    oneLiner: "Australia's mobile-first bank built for people who actually live on their phones.",
    stage: 'Series A',
    founderName: 'Dom Pym',
    audience: 'Series A',
    websiteUrl: 'https://up.com.au',
    realStory: "We started Up because banking in Australia felt like it was built for a generation that still wrote cheques. So we built Up inside Bendigo's licence — a real bank, designed phone-first from the ground up. Instant notifications. Savers you can name. Pay-day automation that splits your money before you can spend it.",
    customers: 'Australians 18-34 who want their bank to feel like a product, not a utility — early-career professionals, freelancers, couples managing shared savings goals.',
    proof: '700,000+ customers in 5 years with zero paid acquisition in year one. NPS in the 70s. Maybi shared accounts hit 100k users in 6 months. Backed by Bendigo & Adelaide Bank ADI licence.'
  },
  logoUrl: 'https://icons.duckduckgo.com/ip3/up.com.au.ico',
  accentColor: data.brandWorld.colour.primary,
  brandWorld: data.brandWorld,
};
fs.writeFileSync('./public/demo-up.json', JSON.stringify(out, null, 2));
const c = data.brandWorld.colour;
console.log('=== FINAL PALETTE (post-critic) ===');
console.log('background:', c.background);
console.log('surface:   ', c.surface);
console.log('primary:   ', c.primary);
console.log('accent:    ', c.accent);
console.log('text:      ', c.text);
console.log('textMuted: ', c.textMuted);
console.log('\n=== DESIGN CRITIC ===');
if (data.designCritique) {
  console.log('failures:  ', JSON.stringify(data.designCritique.failures, null, 2));
  console.log('reasoning: ', data.designCritique.reasoning || '(none — no fixes needed)');
} else {
  console.log('(no designCritique field returned)');
}
