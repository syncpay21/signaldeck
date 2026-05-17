const fs = require('fs');
const deck = JSON.parse(fs.readFileSync('./up-deck.json', 'utf8'));
if (deck.error) { console.error('generate error:', deck.error); process.exit(1); }
const demo = JSON.parse(fs.readFileSync('./public/demo-up.json', 'utf8'));
demo.generatedHtml = deck.html || '';
demo.generatedContent = deck.content || {};
demo.deckMetadata = deck.metadata || null;
fs.writeFileSync('./public/demo-up.json', JSON.stringify(demo, null, 2));
const ids = Object.keys(demo.generatedContent);
console.log('html bytes:    ', (demo.generatedHtml.length / 1024).toFixed(1) + ' KB');
console.log('slide count:   ', ids.length);
console.log('slide ids:     ', ids.join(', '));
console.log('narrative:     ', deck.metadata?.narrative || '(unknown)');
console.log('strategist:    ', deck.metadata?.stage_a1_5?.appliedNarrative || '(none)');
console.log('researcher:    ', deck.metadata?.stage_a0_5?.competitors?.length || 0, 'competitors');
console.log('critic:        ', deck.metadata?.stage_a5?.revisedSlideIds?.length || 0, 'revised slides');
