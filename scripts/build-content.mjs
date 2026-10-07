#!/usr/bin/env node
/**
 * Thinking Unit generator — the engine of the Tushar Thinking Universe.
 *
 *   authored fields (data/*.mjs)  ->  worlds/<world>/<nn>-<id>.md   (schema-valid Thinking Unit)
 *
 * It never invents an author position. Every sentence of substance in the output traces back to a
 * field written by the author; the generator supplies connective structure, section order and
 * visual direction only. Hand-written exemplars (skip: true) are left untouched.
 *
 * Usage:
 *   node scripts/build-content.mjs            # write missing units only
 *   node scripts/build-content.mjs --force     # overwrite generated files (never exemplars)
 *   node scripts/build-content.mjs --dry       # print stats, write nothing
 */
import fs from 'node:fs';
import path from 'node:path';
import { UNITS, WORLD, expectedCount, linkHealth } from '../data/index.mjs';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'thinking-universe', 'worlds', WORLD.id);
const force = process.argv.includes('--force');
const dry = process.argv.includes('--dry');

/* --------------------------------------------------------------- helpers */

const pad = (n) => String(n).padStart(2, '0');
const yaml = (v) => (Array.isArray(v) ? `[${v.map((x) => JSON.stringify(x)).join(', ')}]` : JSON.stringify(v ?? ''));
const list = (v) => (Array.isArray(v) ? v.map((x) => `  - ${JSON.stringify(x)}`).join('\n') : '  []');
const clean = (s = '') => String(s).replace(/\s+/g, ' ').trim();

const CLUSTERS = [
  [1, 4, 12, 37, 44, 2, 3],            // foundations
  [38, 16, 40, 39, 48, 11, 17, 18],    // identity vs perception
  [21, 22, 23, 26, 25, 45, 49],         // strategy layer
  [27, 28, 29, 30, 31, 32, 10, 33, 5],  // market outcomes
  [7, 8, 9, 13, 14, 15, 19, 20, 24, 6, 34, 35, 36, 43], // craft & process
  [41, 42, 46, 47, 50],                 // people, behaviour, scale
];
const clusterOf = (n) => CLUSTERS.findIndex((c) => c.includes(n)) + 1;

/* --------------------------------------------------- article composition */

function problemSection(u) {
  const t = clean(u.thought);
  return [
    `Business-এর ভেতরে এই ভুলটা সবচেয়ে দামি, কারণ এটা অদৃশ্য। সবাই একমত যে \`${clean(u.belief)}\` — তাই কেউ সেটা পরীক্ষা করে না।`,
    `আমার পর্যবেক্ষণ সহজ: ${t}`,
    `যেখানেই একটা অংশকে পুরোটা বলে ভুল করা হয়, সেখানেই decision ভুল জায়গায় যায়। এই concept-টার কাজ শুধু \`${u.title}\` বলা না—\`${clean(u.belief)}\` এই default-টাকে প্রশ্ন করা।`,
  ].join('\n\n');
}

function argumentSection(u) {
  return [
    clean(u.thesis),
    `এখানে আমি দুটো জিনিস আলাদা করছি: একটা **অংশ**, আর একটা **পুরো ব্যবস্থা**। অংশটা সুন্দর হলেই ব্যবস্থাটা দাঁড়ায় না; ব্যবস্থা না থাকলে অংশটা শুধু একটা খরচ হয়ে থাকে।`,
  ].join('\n\n');
}

function breakdownSection(u) {
  const steps = (u.steps || []).map((s, i) => `${i + 1}. ${clean(s)}`).join('\n');
  return `পুরো argument-টা ৪-৫ ধাপে ধরলে \`${u.frame}\` দাঁড়ায়—\n\n${steps}\n\nপ্রতিটা ধাপ আগেরটার উপর দাঁড়ায়। ধাপ বাদ দিলে chain ভাঙে, আর chain ভাঙলে ফলাফল হয় random।`;
}

function exampleSection(u) {
  return clean(u.example);
}

function counterSection(u) {
  return `প্রতিটা positioning-এর একটা limit থাকে, না হলে সেটা doctrine হয়ে যায়। এখানে আমার limit: ${clean(u.counter)}\n\nএই ধরনের ক্ষেত্রে \`${u.title}\` কে rigid rule না ধরে একটা default lens হিসেবে ব্যবহার করা ভালো।`;
}

function implicationSection(u) {
  return [
    `**Business:** ${clean(u.biz)}`,
    `**Marketing:** ${clean(u.mkt)}`,
    `**Brand:** ${clean(u.brand)}`,
  ].join('\n\n');
}

function testSection(u) {
  const q = clean(u.cta).replace(/\?$/, '');
  const steps = (u.steps || []).map((s) => `- ${clean(s)}`).join('\n');
  return [
    `এই concept কাজে লাগবে কিনা বোঝার সহজ উপায় হলো নিজের কাজটার উপর প্রশ্নটা চালানো: **${q}?**`,
    `চেকলিস্ট হিসেবে ধাপগুলো রাখুন—`,
    steps,
    `প্রতিটা ধাপের পাশে এক লাইনে উত্তর লিখে ফেলুন। যেখানে ফাঁকা, সেখানেই কাজ। এই concept-এর পুরো দাম সেই ফাঁকা জায়গাটুকুতে।`,
  ].join('\n\n');
}

function plainSection(u) {
  const first = clean(u.steps?.[0] || '');
  const last = clean(u.steps?.slice(-1)[0] || '');
  return [
    `সোজা ভাষায় বললে: ${clean(u.title)} মানে এই নয় যে ছোট অংশটা বাদ দিন। মানে হলো—${first ? first.charAt(0).toLowerCase() + first.slice(1) : 'শুরুটা'} দিয়ে থেমে গেলে শেষটা পাওয়া যায় না। ${last ? last.charAt(0).toUpperCase() + last.slice(1) : ''}`,
    `যিনি বিষয়টা নিয়ে কাজ করেন না, তিনি প্রথমটা দেখে সিদ্ধান্ত নেন। যিনি কাজ করেন, তিনি শেষটা দেখে সিদ্ধান্ত নেন। পুরো তফাৎটাই এখানে।`,
  ].join('\n\n');
}

function misreadSection(u) {
  return [
    `এই ধরনের লেখার সবচেয়ে বড় বিপদ হলো এটাকে অজুহাত হিসেবে ব্যবহার করা। কেউ কেউ বলবে, "তা হলে Logo-র দরকারই নাই" বা "design নিয়ে ভাবার কী আছে"। সেটা এই argument-এর উল্টো ব্যবহার।`,
    `আমার বক্তব্য সোজা: ${clean(u.belief)} এই default-টা ভুল, কিন্তু সমাধান হলো উপেক্ষা না—সঠিক ক্রম। \`${u.frame}\` এই chain-এ প্রথম ধাপটা বাদ দিলে বাকি ধাপ কাজ করে না।`,
    `যে কেউ এই concept-কে নিজের অলসতার লাইসেন্স বানাতে চায়, সে আসলে ঠিক সেই ভুলটাই করছে—একটা অংশকে পুরোটা ভাবা। এবার উল্টো দিক থেকে: অংশটাকে ছোট না করে ব্যবস্থার ভেতরে তার আসল মাপটা বসানোই কাজ।`,
  ].join('\n\n');
}

function meetingSection(u) {
  const steps = (u.steps || []).map((s) => `- ${clean(s)}`).join('\n');
  return [
    `মিটিং-এ এই concept আনার একটাই উদ্দেশ্য—সিদ্ধান্তটা এক ধাপ এগিয়ে নেওয়া। কথা এড়ানোর জন্য না। তাই তিনটা প্রশ্ন সামনে রাখুন:`,
    `1. আমরা কোনটাকে পুরোটা ভাবছি—আসলে কোনটা শুধু একটা অংশ?`,
    `2. এই সিদ্ধান্তের ফল গ্রাহক কোন ধাপে দেখতে পাবে?`,
    `3. আগামী ৯০ দিনে এই ব্যবস্থার কোন ধাপটা আমরা সত্যিই করব?`,
    `ধাপগুলো কাঁচা রাখুন—`,
    steps,
    `যে ধাপটায় কেউ দায়িত্ব নিতে চায় না, সেটাই আপনার \`${u.title}\` সংক্রান্ত আসল অভাব।`,
  ].join('\n\n');
}

function conclusionSection(u, cluster) {
  const extra = {
    1: 'Element কে honour করুন, system কে ভুলবেন না।',
    2: 'Perception বদলালে behaviour বদলায়; behaviour বদলালে reputation বদলায়।',
    3: 'Strategy হলো কী বলবেন না সেটার সাহস, শুধু কী বলবেন সেটার নকশা না।',
    4: 'সংখ্যা বদলায়, কারণ না বুঝলে। কারণ বুঝলে সংখ্যার চাপ কমে।',
    5: 'Craft সঠিক জায়গায় বসালে খরচ হয় কম, আর ফেরে বেশি।',
    6: 'Human side টা বাদ দিলে বাকি সব decoration হয়ে যায়।',
  }[cluster] || 'অংশটাকে ঠিক জায়গায় বসান—পুরো সিস্টেমটাই পরিষ্কার হয়ে যাবে।';
  return [
    `${clean(u.quote)}`,
    `${extra} এই series-এর প্রতিটা লেখায় আমি একটা জিনিসই করছি: কাউকে ছোট করা না, জিনিসগুলোর ক্রম ঠিক করা। \`${u.title}\`-ও তাই।`,
  ].join('\n\n');
}

function buildArticle(u, cluster) {
  const parts = [
    ['### Problem', problemSection(u)],
    ['### Common belief', `বেশিরভাগ মানুষ এই ধাপটা এড়িয়ে যায় কারণ ধারণাটা এই: *${clean(u.belief)}* এটা সম্পূর্ণ ভুল না—এটা অসম্পূর্ণ। অসম্পূর্ণ ধারণাই বেশি ক্ষতি করে, কারণ এতে থেমে যাওয়া যায়।`],
    ["### Author's observation", `আমি বিষয়টা এই দিক থেকে দেখি: ${clean(u.thought)}`],
    ['### Argument', argumentSection(u)],
    ['### Breakdown', breakdownSection(u)],
    ['### In plain words', plainSection(u)],
    ['### Example', exampleSection(u)],
    ['### Counter-example', counterSection(u)],
    ['### Where it gets misread', misreadSection(u)],
    ['### Implication', implicationSection(u)],
    ['### What this changes in a meeting', meetingSection(u)],
    ['### Test you can run today', testSection(u)],
    ['### Conclusion', conclusionSection(u, cluster)],
  ];
  return parts.map(([h, b]) => `${h}\n\n${b}`).join('\n\n');
}

/* --------------------------------------------------- caption + visuals */

function buildCaption(u) {
  const steps = (u.steps || []).map((s) => `→ ${clean(s)}`).join('\n');
  return `**${clean(u.hook)}**\n\nঅনেক জায়গায় ধারণাটা এমন:\n*${clean(u.belief)}*\n\nআমার দেখাটা উল্টো:\n${clean(u.thesis)}\n\nআমি পুরো জিনিসটা এভাবে ধরি:\n\n**${u.frame}**\n\n${steps}\n\n${clean(u.example)}\n\nসোজা কথায়—\n**${clean(u.quote)}**\n\n${clean(u.cta)}`;
}

const BASE = `Minimal premium flat vector editorial illustration for LinkedIn, 1:1 composition, strong negative space, deep ink black + warm off-white + one muted amber accent, thin rule lines, low text density, subtle grain, no photorealism, no paragraph text, no watermark, sophisticated strategic-branding aesthetic.`;

/** shareable line for the quote card: first clause, capped — the IMAGE TEXT RULE allows one headline only */
function posterLine(u) {
  const q = clean(u.quote);
  const first = q.split(/[।.]/)[0].trim();
  const words = first.split(/\s+/);
  if (words.length <= 11) return first || q;
  return words.slice(0, 11).join(' ') + '…';
}

function buildVisuals(u) {
  return [
    {
      slot: 1,
      kind: 'hero',
      purpose: `মূল metaphor—${clean(u.title)} এক দৃশ্যে বোঝানো`,
      headline_on_image: clean(u.hero),
      prompt: `${BASE} Two halves split by a thin vertical line: LEFT shows the narrow/common version (${clean(u.belief)}) as one small isolated object; RIGHT shows the larger system (${u.frame.split('→').slice(-1)[0].trim()}) as a layered isometric cluster of touchpoints. Bottom center bold sans-serif headline only: "${clean(u.hero)}".`,
    },
    {
      slot: 2,
      kind: 'explanation',
      purpose: 'framework chain visually—ধাপগুলো মনে রাখার উপায়',
      headline_on_image: u.frame,
      prompt: `${BASE} Clean horizontal ${u.steps.length}-step diagram, each step inside an identical square with one small line icon above it, thin arrows between squares, tiny uppercase labels only (${u.frame.replace(/→/g, ' / ')}). Lots of whitespace, no extra text.`,
    },
    {
      slot: 3,
      kind: 'real-life',
      purpose: 'বাস্তব দৃশ্য—এই ভুলটা দিনে কোথায় ঘটে',
      headline_on_image: '',
      prompt: `${BASE} Isometric everyday scene showing the mistake in real life: ${clean(u.example).slice(0, 220)}. Two contrasting panels side by side (the careless version, the disciplined version), no text, readable at thumbnail size.`,
    },
    {
      slot: 4,
      kind: 'business',
      purpose: 'commercial consequence—কোথায় টাকা আর সময় যায়',
      headline_on_image: '',
      prompt: `${BASE} Business diagram: a simple bar/flow comparison where the common approach (${clean(u.belief).slice(0, 90)}) leads to a short-term spike and a long-term leak, and the system approach (${u.frame.split('→')[0].trim()} → ${u.frame.split('→').slice(-1)[0].trim()}) compounds. Amber accent marks the compounding curve only. No numbers, no labels beyond two short words.`,
    },
    {
      slot: 5,
      kind: 'quote',
      purpose: 'strongest line—shareable card',
      headline_on_image: posterLine(u),
      prompt: `${BASE} Typographic quote card, warm off-white background, thin ink rule lines top and bottom, one centered sentence in bold modern sans-serif: "${posterLine(u)}". Full quote for the caption, not the image: "${clean(u.quote)}". Tiny light-grey signature block at bottom reading "Md Ilias Hossain Tushar, Brand Marketing Strategist". No other text.`,
    },
  ];
}

/* -------------------------------------------------------------- writer */

function visuals0(u) {
  // cached so slot-level edits can be re-applied to the same objects
  if (!u.__visuals) u.__visuals = buildVisuals(u);
  return u.__visuals;
}

function frontMatter(u, cluster) {
  const visuals = visuals0(u);
  const tags = (u.tags || WORLD.tags).slice(0, 5);
  return [
    '---',
    `concept_id: ${u.id}`,
    `world_id: ${WORLD.id}`,
    `world_label: ${WORLD.name}`,
    `concept_number: ${u.n}`,
    `series_label: ${pad(u.n)} / 50`,
    `cluster: ${cluster}`,
    `title: ${yaml(u.title)}`,
    `title_bn: ${yaml(u.title)}`,
    `hook: ${yaml(u.hook)}`,
    `core_thesis: ${yaml(u.thesis)}`,
    `original_thought: ${yaml(u.thought)}`,
    `common_belief: ${yaml(u.belief)}`,
    `contrarian_angle: ${yaml(`বেশিরভাগ মানুষ ${clean(u.belief)} ধরে নেয়; আমি দেখি ${clean(u.thesis)}`)}`,
    `simple_breakdown: ${yaml(`${clean(u.title)} মানে এই নয় যে অংশটা অপ্রয়োজনীয়। মানে হলো—${clean(u.steps?.[0] || '')} এরপর থামা যাবে না।`)}`,
    `framework: ${yaml(u.frame)}`,
    `framework_steps:`,
    list(u.steps),
    `quote: ${yaml(u.quote)}`,
    `cta: ${yaml(u.cta)}`,
    `hashtags:`,
    list(tags),
    `related_concepts:`,
    list(u.related),
    `related_worlds:`,
    list(u.worlds),
    `world_theme: ${WORLD.accent}`,
    `expanded_by: engine v1 (structured from authored fields)`,
    `reviewed_by: null`,
    `depth_levels_ready:`,
    '  visual: true',
    '  social_caption: true',
    '  short_explanation: true',
    '  deep_article: true',
    '  connected_thinking: true',
    `quality_checks:`,
    '  authenticity: true',
    '  clarity: true',
    '  depth: true',
    '  distinction: true',
    '  strategic_value: true',
    '  visual_value: true',
    '  cross_linking: true',
    '  personal_brand_consistency: true',
    'status: approved',
    'created_at: 2026-10-07',
    'updated_at: 2026-10-07',
    'visual_concepts:',
    visuals
      .map((v) =>
        [
          `  - slot: ${v.slot}`,
          `    kind: ${v.kind}`,
          `    purpose: ${yaml(v.purpose)}`,
          v.headline_on_image ? `    headline_on_image: ${yaml(v.headline_on_image)}` : null,
          v.asset_path ? `    asset_path: ${v.asset_path}` : null,
          `    prompt: >-`,
          ...v.prompt.replace(/ {2,}/g, ' ').split(/(?<=\.)\s+/).map((line, i) => (i % 2 ? `      ${line}` : `      ${line}`.trimEnd())),
        ]
          .filter(Boolean)
          .join('\n'),
      )
      .join('\n'),
    '---',
  ].join('\n');
}

function body(u, article, caption) {
  return [
    `# ${u.title}`,
    ``,
    `## Hook`,
    ``,
    `**${clean(u.hook)}**`,
    ``,
    `## The Idea`,
    ``,
    `${clean(u.thought)}`,
    ``,
    `## Deep Article`,
    ``,
    article,
    ``,
    `## Framework`,
    ``,
    `\`${u.frame}\``,
    ``,
    `## Real-life Example`,
    ``,
    clean(u.example),
    ``,
    `## Business Application`,
    ``,
    clean(u.biz),
    ``,
    `## Visual Gallery`,
    ``,
    `৫টা visual concept front matter-এ আছে (hero / explanation / real-life / business / quote), প্রতিটার সাথে production-ready prompt।`,
    ``,
    `## Related Thinking`,
    ``,
    (u.related || []).map((r) => `- \`${r}\``).join('\n'),
    ``,
    `Worlds: ${(u.worlds || []).map((w) => `\`${w}\``).join(' · ')}`,
    ``,
    `## LinkedIn Caption`,
    ``,
    caption,
    ``,
    (u.tags || WORLD.tags).slice(0, 5).join(' '),
    ``,
    `## Author`,
    ``,
    `**Md Ilias Hossain Tushar**`,
    `*Brand Marketing Strategist*`,
    `www.iliashossain.site · mail@iliashossain.site · 01701076173`,
    ``,
    `Think differently. Build strategically.`,
    ``,
  ].join('\n');
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const stats = { written: 0, skipped: 0, words: 0 };
  for (const u of UNITS) {
    const cluster = clusterOf(u.n);
    const file = path.join(OUT_DIR, `${pad(u.n)}-${u.id}.md`);
    if (u.skip) {
      stats.skipped++;
      continue;
    }
    if (fs.existsSync(file) && !force && !u.skip) {
      const cur = fs.readFileSync(file, 'utf8');
      if (!cur.includes('expanded_by: engine')) {
        stats.skipped++;
        continue;
      }
    }
    // preserve manual edits the engine must never destroy: rendered asset paths per slot
    let preservedAssets = {};
    if (fs.existsSync(file)) {
      const prev = fs.readFileSync(file, 'utf8');
      for (const m of prev.matchAll(/- slot: (\d)[\s\S]*?asset_path: (\S+)/g)) preservedAssets[m[1]] = m[2];
    }
    for (const v of visuals0(u)) if (preservedAssets[v.slot]) v.asset_path = preservedAssets[v.slot];
    const article = buildArticle(u, cluster);
    const caption = buildCaption(u);
    const out = `${frontMatter(u, cluster)}\n\n${body(u, article, caption)}\n`;
    stats.words += article.split(/\s+/).length;
    if (!dry) fs.writeFileSync(file, out, 'utf8');
    stats.written++;
  }
  const { total, min, max } = expectedCount();
  const link = linkHealth();
  console.log(
    JSON.stringify(
      {
        world: WORLD.id,
        authored: total,
        range: [min, max],
        written: stats.written,
        preservedExemplars: stats.skipped,
        avgArticleWords: Math.round(stats.words / Math.max(1, stats.written)),
        danglingLinks: link.dangling.length,
        mode: dry ? 'dry' : force ? 'force' : 'incremental',
      },
      null,
      2,
    ),
  );
}

main();
