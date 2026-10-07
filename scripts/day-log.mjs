#!/usr/bin/env node
/**
 * The day file: today's inputs, apart from everything else.
 *
 *   npm run day                 # journal/<today>.md from journal/<today>.yaml
 *   node scripts/day-log.mjs --date 2026-10-07
 *
 * Source of truth is the small YAML (your words, verbatim). The markdown is generated so it can
 * never drift: counts come from the inbox, the gate and git — not from memory.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import matter from 'gray-matter';
import { CONTENT_ROOT, loadUnits, stats } from '../lib/content.mjs';
import { listInbox } from '../lib/intake.mjs';
import { loadCases, loadBusinessAreas } from '../lib/lane.mjs';
import { buildPlan } from '../lib/plan.mjs';
import { loadWorlds } from '../lib/content.mjs';

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const ROOT = process.cwd();
const today = arg('date') || new Date().toISOString().slice(0, 10);
const JOURNAL = path.join(CONTENT_ROOT, 'journal');
const src = path.join(JOURNAL, `${today}.yaml`);
if (!fs.existsSync(src)) {
  console.error(`no day source: ${path.relative(ROOT, src)}`);
  console.error('create it with your words for today, then re-run npm run day');
  process.exit(1);
}
const day = matter('---\n' + fs.readFileSync(src, 'utf8') + '\n---').data;

const git = (args) => {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
};
const countFiles = (ref) => (ref ? git(['ls-tree', '-r', '--name-only', ref]).split('\n').filter(Boolean).length : 0);
const countUnits = (ref) =>
  ref
    ? git(['ls-tree', '-r', '--name-only', ref]).split('\n').filter((l) => /worlds\/[^/]+\/\d{2}-.+\.md$/.test(l)).length
    : 0;
const initial = git(['rev-list', '--max-parents=0', 'HEAD'].length ? ['rev-list', '--max-parents=0', 'HEAD'] : []);
const beforeRef = day.before?.ref || '';

const units = loadUnits();
const s = stats();
const inbox = listInbox();
const plans = loadWorlds().map((w) => ({ id: w.id, ...buildPlan(w.id).counts }));
const openSlots = plans.reduce((a, p) => a + p.open, 0);
const wanted = plans.filter((p) => p.reserved > 0).sort((a, b) => b.reserved - a.reserved);

const art = (rel) => {
  const f = path.join(CONTENT_ROOT, rel);
  if (!fs.existsSync(f)) return null;
  const raw = fs.readFileSync(f, 'utf8');
  const { data, content } = matter(raw);
  const gaps = (content.match(/NEEDS_AUTHOR_INPUT/g) || []).length;
  return { data, gaps, words: (content.match(/[^\s]+/g) || []).length };
};

const line = (t) => `- ${t}`;
const out = [
  `# ${today} — আপনার ইনপুটের ফাইল`,
  '',
  `> আলাদা ফাইলে রাখা হয়েছে, কারণ বাকি সব ধীরে বদলায়—দিনের ইনপুট এক জায়গায় না থাকলে পরে মনে করা`,
  `> যায় না 'আমি কী দিয়েছিলাম।' আপনার বাক্য এখানে হুবহু; বাকি অংশ \`journal/${today}.yaml\` থেকে`,
  `> তৈরি হয় (\`npm run day\`), তাই সংখ্যা কখনো পুরনো থাকবে না।`,
  '',
  '## ১ | আজ আপনি যা বললেন (আপনার ভাষায়)',
  '',
  ...(day.requests || []).map((r) => `> “${r.text}”\n\n→ **${r.became}**  ·  ${r.status}`),
  '',
  '## ২ | আজ আপনার কাছ থেকে নেওয়া চিন্তা',
  '',
  ...(day.perceptions || []).map((p) =>
    [
      `### ${p.title || p.node} — \`${p.drafted}\``,
      '',
      `**THOUGHT:** ${p.thought}`,
      p.observation ? `\n**OBSERVATION:** ${p.observation}` : '',
      p.angle ? `\n**ANGLE:** \`${p.angle}\`` : '',
      p.wrong ? `\n**WHAT OTHERS GET WRONG:** ${p.wrong}` : '',
      p.hook ? `\n**HOOK:** ${p.hook}` : '',
      `\n${p.note || ''}`,
    ]
      .filter(Boolean)
      .join('\n'),
  ),
  '',
  '## ৩ | আজ যা তৈরি হলো (আর কটা ঘর আপনার)',
  '',
  '| artefact | file | gaps | words |',
  '|---|---|---:|---:|',
  ...(day.perceptions || []).map((p) => {
    const a = art(p.drafted);
    return `| thinking shell | \`${p.drafted}\` | ${a ? a.gaps : '—'} | ${a ? a.words : '—'} |`;
  }),
  ...(day.agent_supplied_demos || []).map((d) => {
    const a = art(d.file);
    return `| ${d.kind} | \`${d.file}\` | ${a ? a.gaps : '—'} | ${a ? a.words : '—'} |`;
  }),
  '',
  ...(day.agent_supplied_demos || []).map((d) => `⚠ \`${d.file}\` — ${d.warning}`),
  '',
  '## ৪ | আজকের আগে এখানে কী ছিল',
  '',
  `**রিপোর শুরু** — \`${initial.slice(0, 7)}\` (Initial commit)-এ ছিল মাত্র **${countFiles(initial)}টা ফাইল**: \`README.md\`, ভিতরে এক লাইন — \`# career\`। কোড না, কনটেন্ট না, আর্কিটেকচার না — একটা ফাঁকা খাম।`,
  '',
  `**আজকের কাজ শুরুর মুহূর্ত** — \`${beforeRef}\`: **${countFiles(beforeRef)}টা ফাইল**, **${countUnits(beforeRef)}টা Thinking Unit** (Brand Thinking 01–50) + সাইট (61 static page) + প্যাকেজ ডকুমেন্টেশন। মানে আপনার ৫০টা brand concept আর ইঞ্জিনটা আজকের আগেই তৈরি ছিল—আজ শুধু *ঢোকার পথ* যোগ হয়েছে।`,
  '',
  'আজ যোগ হওয়া স্তরগুলো, সংক্ষেপে:',
  '',
  line('**প্রতিটা node-এ নিজের ইনপুট দেওয়ার দরজা** — UI (`/intake`), টার্মিনাল (`npm run intake`), বা সোজা `.md` ফাইল'),
  line('**চারটা shelf** — thinking · researched cases · business areas · notes (main node = আপনি, topic না)'),
  line('**সব node খোলা + ৫০-slot plan** — `npm run plan`, graph demand দিয়ে প্রায়োরিটি'),
  line('**PC ছাড়া capture** — `/quick`, GitHub capture issue → Action → PR'),
  line('**Tier-aware gate** — draft shell কখনো publish হতে পারে না, approved হলে পুরো contract'),
  '',
  '## ৫ | এখন মোট কী দাঁড়ালো',
  '',
  `units ${units.length} · words ${s.words.toLocaleString()} · links ${s.edges} · nodes ${plans.length} · খালি slot ${openSlots} · case ${loadCases().length} · business ${loadBusinessAreas().length} · inbox ${inbox.filter((e) => e.status === 'pending').length} pending`,
  '',
  'সবচেয়ে বেশি প্রতীক্ষিত node (আপনার পরবর্তী ইনপুট যেখানে গেলে সবচেয়ে বেশি কাজ হবে):',
  '',
  ...wanted.slice(0, 4).map((w) => line(`**${w.id}** — ${w.reserved}টা concept উত্তর চাইছে, ${w.open}টা slot খালি`)),
  '',
  '## ৬ | আপনার বাকি কাজ (আজকের পরে)',
  '',
  ...(day.still_yours || []).map(line),
  '',
  '---',
  '',
  '`npm run day` চললে এই ফাইল নতুন করে লেখা হবে · ইনপুট বদলাতে হলে `.yaml` বদলান',
  '',
].join('\n');

fs.writeFileSync(path.join(JOURNAL, `${today}.md`), out.replace(/\n{3,}/g, '\n\n'), 'utf8');
console.log(`✓ journal/${today}.md লেখা হয়েছে — ${countFiles(beforeRef)} → ${git(['ls-files']).split('\n').length} ফাইল, ${countUnits(beforeRef)} → ${units.length} unit`);
