import fs from 'node:fs';
import path from 'node:path';
import { CONTENT_ROOT, loadWorlds, loadUnits } from './content.mjs';
import { nextConceptNumber, slugify, addEntry, markDrafted, listInbox } from './intake.mjs';

/**
 * DRAFTER — intake entry → Thinking Unit shell.
 *
 * This is the "structure, don't replace" half of the engine. It may:
 *   carry the author's sentences verbatim, order them, write section labels,
 *   derive a provisional title/hook, split an arrow chain, propose visual slots.
 * It must never:
 *   invent a belief, an example, a quote or a stance — those stay NEEDS_AUTHOR_INPUT
 *   with the exact question the author has to answer.
 */

export const GAP = 'NEEDS_AUTHOR_INPUT';

const QUESTIONS = {
  thesis: 'আপনার মূল position এক-দুই লাইনে—আপনি কী সত্যি মনে করেন এই বিষয়ে?',
  belief: 'সাধারণ মানুষ বা industry এই বিষয়ে কী ভুল ধরে নেয়?',
  framework: 'আপনার চিন্তার ধাপের শিকলটা কী? (যেমন: A → B → C → D, ৩–৫ ধাপ)',
  steps: 'প্রতিটা ধাপে কী ঘটে, এক লাইনে—নিজের ভাষায়।',
  example: 'আপনার নিজের দেখা একটা ঘটনা/client situation (অ্যানোনিমাইজ করা) যেখানে এই সত্যটা কাজ করেছে।',
  counter: 'কোন পরিস্থিতিতে আপনার এই কথাটা খাটবে না? (এটা না দিলে position doctrine হয়ে যায়)',
  biz: 'business level-এ এর টাকার/সময়ের/ঝুঁকির ফল কী?',
  mkt: 'marketing decision-এ এটা কী বদলে দেবে?',
  brand: 'brand thinking-এ এটার স্থায়ী ফল কী?',
  quote: 'পুরো concept-টার সবচেয়ে শক্ত এক লাইন—যেটা মানুষ মুখে মুখে ফেরত দেবে।',
  cta: 'পড়ার পর পাঠকের কাছে আপনার একটা প্রশ্ন কী হবে? (বিক্রির কথা নয়)',
  visual: 'এই conceptটা একটা ছবিতে দেখাতে হলে আপনি কী দেখাতেন?',
};

const q = (key) => `${GAP} — ${QUESTIONS[key]}`;
const has = (s) => Boolean(s && s.trim() && s.trim().length > 3);
const pad = (n) => String(n).padStart(2, '0');
const yaml = (v) => JSON.stringify(v ?? '');
const list = (v = []) => (v.length ? v.map((x) => `  - ${JSON.stringify(x)}`).join('\n') : '  []');

const WORLD_TAGS = {
  'brand-thinking': ['#Branding', '#BrandStrategy', '#BrandIdentity', '#BrandMarketing', '#LogoDesign'],
  'marketing-thinking': ['#Marketing', '#MarketingStrategy', '#ConsumerBehaviour', '#Positioning', '#Growth'],
  default: ['#Thinking', '#Framework', '#Strategy'],
};

export function tagsFor(worldId) {
  return WORLD_TAGS[worldId] || WORLD_TAGS.default;
}

function provisional(entry) {
  const f = entry.fields || {};
  const t = (f.thought || '').replace(/\s+/g, ' ').trim();
  const sentences = t.split(/(?<=[।.!?])\s+/).filter(Boolean);
  const first = sentences[0] || t;
  const title =
    f.title ||
    (first
      .replace(/[।.]$/, '')
      .split(' ')
      .slice(0, 7)
      .join(' ') || 'Untitled thought');
  const hook = f.hook || first.replace(/[।.]$/, '');
  return { title, hook, sentences };
}

function chain(angle = '') {
  const raw = String(angle).replace(/→|->/g, ' → ');
  const parts = raw.split('→').map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 3) return { framework: parts.join(' → '), steps: parts };
  return { framework: q('framework'), steps: null };
}

/** build the full unit file text from one intake entry */
export function draftFromEntry(entry, { worldId, number } = {}) {
  const f = entry.fields || {};
  const wid = worldId || entry.world || 'brand-thinking';
  const world = loadWorlds().find((w) => w.id === wid);
  const n = number ?? nextConceptNumber(wid);
  const { title, hook } = provisional(entry);
  const { framework, steps } = chain(f.angle);

  const thesis = has(f.observation) ? `${f.observation.trim()}` : q('thesis');
  const belief = has(f.wrong) ? f.wrong.trim() : q('belief');
  const why = has(f.why) ? f.why.trim() : '';
  const example = has(f.example) ? f.example.trim() : q('example');
  const slug = slugify(title);

  const article = [
    ['### Problem', `${belief}\n\n${why ? `এটা কেন দামি: ${why}` : `এটা কেন দামি: ${q('biz')}`} `.trim()],
    ['### Common belief', `বেশিরভাগ মানুষ এখানে যা ধরে নেয়: *${belief}*`],
    ["### Author's observation", `${f.thought?.trim() || q('thesis')}`],
    ['### Argument', `${thesis}`],
    ['### Breakdown', steps ? `${framework}\n\n${steps.map((s, i) => `${i + 1}. ${s} — ${GAP} (${QUESTIONS.steps})`).join('\n')}` : framework],
    ['### In plain words', `${GAP} — উপরের argumentটা একজন অ-বিশেষজ্ঞের জন্য ৩ লাইনে সহজ করে বলুন।`],
    ['### Example', example],
    ['### Counter-example', q('counter')],
    ['### Where it gets misread', `${GAP} — এই কথাটাকে মানুষ কীভাবে অজুহাত হিসেবে ব্যবহার করতে পারে?`],
    ['### Implication', `**Business:** ${q('biz')}\n\n**Marketing:** ${q('mkt')}\n\n**Brand:** ${q('brand')}`],
    ['### Test you can run today', `নিজের কাজে চেক করার প্রশ্ন: ${q('cta')}`],
    ['### Conclusion', `${q('quote')}`],
  ]
    .map(([h, b]) => `${h}\n\n${b.trim()}`)
    .join('\n\n');

  const visuals = [
    ['hero', 'মূল metaphor—conceptটা এক ছবিতে থামাতে হবে', `Generate one editorial visual for: "${title}". ${GAP} — visual direction: ${q('visual')} Style: minimal flat vector, 1:1, ink black + warm off-white + one accent, one headline max 10 words, no paragraph text, no watermark.`],
    ['explanation', 'framework chain', steps ? `Minimal 3-7 step horizontal chain diagram, labels: ${framework}. One thin arrow between each, tiny uppercase mono labels, lots of whitespace.` : `Minimal step diagram. ${GAP} — framework ঠিক করলে এটা লেখা হবে।`],
    ['real-life', 'বাস্তব দৃশ্য', `Two contrasting isometric panels showing the mistake vs the disciplined approach. No text.`],
    ['business', 'commercial consequence', `Simple comparison: short-term spike vs compounding curve, single accent colour on the compounding line. No numbers.`],
    ['quote', 'shareable line', `Typographic card, one sentence max 12 words. ${GAP} — quote লেখার পর এটা বসবে। Signature: Md Ilias Hossain Tushar, Brand Marketing Strategist.`],
  ].map(([kind, purpose, prompt], i) => ({ slot: i + 1, kind, purpose, prompt }));

  const fm = [
    '---',
    `concept_id: ${slug}`,
    `world_id: ${wid}`,
    `world_label: ${world?.name || wid}`,
    `concept_number: ${n}`,
    `series_label: ${pad(n)} / ${world?.target || 50}${n > (world?.target || 50) ? '+' : ''}`,
    `cluster: 1`,
    `title: ${yaml(title)}`,
    `title_provisional: ${f.title ? 'false' : 'true'}`,
    `hook: ${yaml(hook)}`,
    `hook_provisional: ${f.hook ? 'false' : 'true'}`,
    `core_thesis: ${yaml(thesis)}`,
    `original_thought: ${yaml((f.thought || '').replace(/\s+/g, ' ').trim())}`,
    `common_belief: ${yaml(belief)}`,
    `contrarian_angle: ${yaml(`সাধারণ ধারণা: ${belief} — আমার দেখা: ${thesis}`)}`,
    `simple_breakdown: ${yaml(f.why ? f.why.trim() : GAP + ' — ' + QUESTIONS.thesis)}`,
    `framework: ${yaml(framework)}`,
    `framework_steps:`,
    steps ? list(steps.map((s, i) => `${i + 1}. ${s} — ${GAP} (${QUESTIONS.steps})`)) : `  - ${yaml(GAP + ' — ' + QUESTIONS.steps)}`,
    `quote: ${yaml(q('quote'))}`,
    `cta: ${yaml(q('cta'))}`,
    `hashtags:`,
    list(tagsFor(wid)),
    `related_concepts:`,
    `  []`,
    `related_worlds:`,
    `  []`,
    `world_theme: ${world?.accent || 'amber'}`,
    `expanded_by: drafter v1 (structure only — author text carried verbatim)`,
    `intake: ${path.basename(entry.__file || '')}`,
    `reviewed_by: null`,
    `needs_author_input:`,
    list(Object.keys(QUESTIONS).filter((k) => ![ 'thesis', 'belief' ].includes(k) || !has(f[k]))),
    `status: draft`,
    `created_at: ${new Date().toISOString().slice(0, 10)}`,
    `updated_at: ${new Date().toISOString().slice(0, 10)}`,
    'visual_concepts:',
    visuals
      .map((v) =>
        [
          `  - slot: ${v.slot}`,
          `    kind: ${v.kind}`,
          `    purpose: ${yaml(v.purpose)}`,
          `    prompt: ${yaml(v.prompt)}`,
        ].join('\n'),
      )
      .join('\n'),
    '---',
  ].join('\n');

  const body = [
    `# ${title}`,
    '',
    `## Hook`,
    '',
    `**${hook}**`,
    '',
    `## The Idea`,
    '',
    f.thought?.trim() || q('thesis'),
    '',
    `## Deep Article`,
    '',
    article,
    '',
    `## Framework`,
    '',
    `\`${framework}\``,
    '',
    `## Real-life Example`,
    '',
    example,
    '',
    `## Business Application`,
    '',
    why || q('biz'),
    '',
    `## Visual Gallery`,
    ``,
    `${visuals.length}টা visual direction তৈরি হয়েছে; slot 1-এর prompt-এ ছবির direction বসানোর বাকি আছে (NEEDS_AUTHOR_INPUT)।`,
    '',
    `## Related Thinking`,
    '',
    `${GAP} — এই concept কোন কোন worlds-এর সাথে জোড়া লাগে, দুইটা link দিন (site-এর graph এই ফিল্ড থেকেই বানানো)।`,
    '',
    `## LinkedIn Caption`,
    '',
    `**${hook}**`,
    '',
    'আমার দেখা:\n',
    thesis,
    '',
    `${framework}`,
    '',
    'বিস্তারিত আর্টিকেল + framework ভরার পর এখানে পূর্ণ caption আসবে।',
    '',
    `## Author`,
    '',
    `**Md Ilias Hossain Tushar**`,
    `*Brand Marketing Strategist*`,
    `www.iliashossain.site · mail@iliashossain.site · 01701076173`,
    '',
    `Think differently. Build strategically.`,
    '',
  ].join('\n');

  return {
    worldId: wid,
    number: n,
    slug,
    filename: `${pad(n)}-${slug}.md`,
    text: `${fm}\n\n${body}\n`,
    gaps: Object.values(QUESTIONS).length - 2 + (steps ? 0 : 1),
  };
}

/** draft every pending entry for a world (or all worlds) */
export function draftPending({ world = null, dry = false } = {}) {
  const pending = listInbox({ status: 'pending', world: world || undefined });
  const out = [];
  for (const entry of pending) {
    const used = new Set(loadUnits().filter((u) => u.concept_id).map((u) => u.concept_id));
    const draftedBefore = used.size;
    const d = draftFromEntry(entry);
    while (fs.existsSync(path.join(CONTENT_ROOT, 'worlds', d.worldId, d.filename))) {
      d.number += 1;
      d.filename = `${pad(d.number)}-${d.slug}.md`;
    }
    const rel = `worlds/${d.worldId}/${d.filename}`;
    if (!dry) {
      fs.mkdirSync(path.join(CONTENT_ROOT, 'worlds', d.worldId), { recursive: true });
      fs.writeFileSync(path.join(CONTENT_ROOT, 'worlds', d.worldId, d.filename), d.text, 'utf8');
      markDrafted(entry.__file, rel);
    }
    out.push({ entry: entry.id, world: d.worldId, file: rel, number: d.number, title: d.text.match(/^title: "(.+)"$/m)[1] });
    void draftedBefore;
  }
  return out;
}

export { addEntry, listInbox };
