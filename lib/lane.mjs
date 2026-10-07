import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { CONTENT_ROOT, loadWorlds, unitsByWorld } from './content.mjs';

/**
 * LANES — the rooms inside the main node.
 *
 * The main node of the universe is the thinker himself, not a topic. Around him sit
 * different kinds of raw material, and each kind needs a different shelf:
 *
 *   thinking → a concept shell inside a world            (worlds/<world>/NN-slug.md)
 *   case     → a researched real-world case             (research/cases/NN-slug.md)
 *   business → a business area / offer / client reality (business/NN-slug.md)
 *   note     → captured but unfiled; waits for triage  (inbox/notes/*.md)
 *
 * The author should never have to know the shelf before writing. `routeText()` proposes
 * a lane and a world from the words themselves; a human confirms in one keystroke.
 * A proposal is a filing suggestion — never a claim about what he meant.
 */

export const LANES = {
  thinking: {
    id: 'thinking',
    label: 'Thinking',
    one_line: 'আপনার own position — একটা concept-এ বাড়বে।',
    fields: [
      ['thought', 'THOUGHT'],
      ['observation', 'OBSERVATION'],
      ['angle', 'MY ANGLE / FRAMEWORK'],
      ['wrong', 'WHAT OTHERS GET WRONG'],
      ['why', 'WHY IT MATTERS'],
      ['example', 'REAL EXAMPLE'],
      ['title', 'TITLE'],
      ['hook', 'HOOK'],
    ],
    questions: [
      'মূল কথাটা কী, আপনার ভাষায়?',
      'বাস্তবে কী দেখেছেন যা অন্যরা দেখে না?',
      'ধাপের শিকল আছে? (A → B → C)',
      'সাধারণ ধারণাটা কোথায় ভুল?',
      'এটা বোঝা না বোঝায় business-এর কী ফেরে?',
    ],
  },
  case: {
    id: 'case',
    label: 'Researched case',
    one_line: 'এটা আসলে ঘটেছে — proof হিসেবে concept-এ কাজে লাগবে।',
    fields: [
      ['subject', 'COMPANY / SUBJECT'],
      ['what', 'WHAT HAPPENED'],
      ['did', 'WHAT THEY DID'],
      ['evidence', 'EVIDENCE / NUMBERS'],
      ['read', 'MY READ'],
      ['proves', 'WHAT IT PROVES'],
      ['source', 'SOURCE'],
    ],
    questions: [
      'কোন company / brand এর কথা বলছেন?',
      'আসলে কী ঘটেছিল?',
      'তারা কী করেছিল (decision, action)?',
      'সংখ্যা / প্রমাণ কী? (না জানলে NEEDS_AUTHOR_INPUT)',
      'আপনার read কী — কেন কাজ করেছে বা করেনি?',
      'এটা কোন position-কে proof দেয়?',
    ],
  },
  business: {
    id: 'business',
    label: 'Business area',
    one_line: 'আপনি কী করেন, কার জন্য, কী বদলায় — offer-এর thinking।',
    fields: [
      ['name', 'AREA / OFFER'],
      ['who', 'WHO IT IS FOR'],
      ['before', 'WHAT THEY BELIEVE BEFORE'],
      ['moves', 'WHAT ACTUALLY MOVES THE NEEDLE'],
      ['role', 'MY PART'],
      ['proof', 'PROOF / RESULT'],
      ['price', 'WHAT MAKES IT WORTH IT'],
    ],
    questions: [
      'কোন area / offer নিয়ে বলছেন?',
      'এটা কার জন্য? (segment, stage)',
      'আসার আগে client কী বোঝে?',
      'সত্যিটাতে needleটা কী নাড়ে?',
      'আপনার roleটা কী?',
      'প্রমাণ / result আছে?',
    ],
  },
  note: {
    id: 'note',
    label: 'Quick note',
    one_line: 'যেকোনো সময় যেকোনো কথা — shelf পরে ঠিক হবে।',
    fields: [['thought', 'NOTE']],
    questions: ['শুধু লিখুন। ভাগ-বাঁটনাইন।'],
  },
};

export const LANE_IDS = Object.keys(LANES);
export const INBOX_ROOT = path.join(CONTENT_ROOT, 'inbox');
export const CASES_DIR = path.join(CONTENT_ROOT, 'research', 'cases');
export const BUSINESS_DIR = path.join(CONTENT_ROOT, 'business');

const norm = (s = '') =>
  String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const tokens = (s = '') => norm(s).split(' ').filter((w) => w.length > 3);

/** vocabulary per world: node names, thesis, cluster titles, concept titles */
function worldVocab() {
  return loadWorlds().map((w) => {
    const units = unitsByWorld(w.id);
    const boost = new Set([
      ...tokens(w.name),
      ...tokens(w.thesis),
      ...tokens(w.name_bn || ''),
      ...units.flatMap((u) => [...tokens(u.title), ...tokens(u.cluster_name), ...tokens(u.simple_breakdown)]),
    ]);
    return { id: w.id, name: w.name, target: w.target, unitCount: w.unitCount, vocab: boost, titles: units.map((u) => u.title) };
  });
}

function similarity(a = '', b = '') {
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  if (!A.size || !B.size) return 0;
  let shared = 0;
  for (const t of A) if (B.has(t)) shared++;
  return shared / Math.min(A.size, B.size);
}

/**
 * Propose where a piece of raw text belongs. Deterministic, explainable, and it never
 * edits the text. `confidence: low` means: ask the author, don't file it.
 */
export function routeText(text = '') {
  const body = norm(text);
  // NFKD (used for tokenising) decomposes Bengali vowel signs, so substring cues must be
  // matched against the raw lowercased text or every Bangla cue silently stops matching.
  const spoken = String(text).toLowerCase().replace(/\s+/g, ' ');
  const words = tokens(body);
  const hits = new Set(words);

  const laneSignals = [
    ['case', [['case study', 3], ['research', 2], ['company', 2], ['brand name', 2], ['উদাহরণ', 2], ['কেস', 3], ['ঘটেছিল', 2], ['করেছিল', 2], ['তারা', 1], ['rebrand', 3], ['campaign', 2], ['market share', 2], ['লাভ', 1], ['রetail', 1]]],
    ['business', [['client', 2], ['offer', 2], ['package', 2], ['price', 2], ['retainer', 3], ['service', 2], ['invoice', 2], ['কাজ', 1], ['আয়', 2], ['গ্রাহক', 3], ['সার্ভিস', 2], ['চুক্তি', 3], ['proposal', 2]]],
    ['thinking', [['ভুল', 2], ['ধারণা', 2], ['মনে হয়', 1], ['বরং', 2], ['asli', 1], ['আসলে', 2], ['system', 1], ['মানে', 2], ['না, ', 1], ['position', 2], ['belief', 2], ['framework', 2], ['→', 3]]],
  ];
  const laneScores = Object.fromEntries(LANE_IDS.map((l) => [l, 0]));
  const laneWhy = {};
  for (const [lane, pats] of laneSignals) {
    for (const [p, w] of pats) {
      if (spoken.includes(p) || body.includes(norm(p))) {
        laneScores[lane] += w;
        (laneWhy[lane] ||= []).push(`"${p}" +${w}`);
      }
    }
  }
  if ((spoken.includes('→') || spoken.includes('->')) && laneScores.thinking < 3) laneScores.thinking += 3;
  // the note shelf is the author's own choice, or a fallback for scraps too short to file;
  // it is never proposed over a real lane, because "file nothing" is the least useful answer
  if (words.length < 4) laneScores.note += 4;
  if (laneScores.thinking === 0 && laneScores.case === 0 && laneScores.business === 0) laneScores.note += 2;

  const lane = LANE_IDS.filter((x) => x !== 'note').sort((a, b) => laneScores[b] - laneScores[a])[0] || 'note';
  const top = laneScores[lane];
  const second = LANE_IDS.map((l) => laneScores[l]).sort((a, b) => b - a)[1] || 0;

  const worlds = worldVocab();
  const scored = worlds
    .map((w) => {
      let score = 0;
      const matched = [];
      for (const t of w.vocab) {
        if (hits.has(t)) {
          score += 1;
          matched.push(t);
        }
      }
      for (const title of w.titles) {
        const sim = similarity(title, body);
        if (sim > 0.34) {
          score += 2;
          matched.push(`≈${title}`);
        }
      }
      if (scored0(w, body)) {
        score += 4;
        matched.push(`${w.id} (name)`);
      }
      return { id: w.id, name: w.name, score, matched: [...new Set(matched)].slice(0, 6), unitCount: w.unitCount, target: w.target };
    })
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  const spread = best.score - (scored[1]?.score || 0);
  const confidence = !top && !best.score ? 'none' : top >= 2 && best.score >= 2 && spread >= 1 ? 'medium' : 'low';

  return {
    lane,
    lane_scores: Object.fromEntries(LANE_IDS.map((l) => [l, laneScores[l]])),
    lane_why: laneWhy[lane] || [],
    world: best.score === 0 ? null : best.id,
    world_candidates: scored.filter((s) => s.score > 0).slice(0, 3),
    confidence,
    needs_confirm: confidence !== 'medium',
    note:
      confidence === 'medium'
        ? 'filing suggestion only — your words are untouched'
        : 'too little to file safely: confirm the shelf yourself',
  };
}
const scored0 = (w, body) => norm(w.name).split(' ').some((p) => p.length > 3 && body.includes(p));

/* ------------------------------------------------------------------ files */

export const laneInboxDir = (lane = 'thinking', world = 'unfiled') =>
  path.join(INBOX_ROOT, lane === 'thinking' ? world : lane);

export function laneFileFor(lane, slug, created) {
  const dir = lane === 'case' ? CASES_DIR : lane === 'business' ? BUSINESS_DIR : null;
  if (!dir) return null;
  const existing = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.md') && !f.startsWith('_')) : [];
  const n = existing.length + 1;
  const pad = String(n).padStart(2, '0');
  return { dir, file: path.join(dir, `${pad}-${slug}.md`), rel: path.relative(CONTENT_ROOT, path.join(dir, `${pad}-${slug}.md`)), number: n, created };
}

/** one lane artefact (case card / business card) with the author's words verbatim */
export function buildLaneFile({ lane, fields = {}, slug, id, worldLinks = [], created }) {
  const def = LANES[lane];
  const GAP = 'NEEDS_AUTHOR_INPUT';
  const val = (k) => String(fields[k] || '').trim();
  const sections =
    lane === 'case'
      ? [
          ['What happened', val('what') || `${GAP} — ${def.questions[1]}`],
          ['What they did', val('did') || `${GAP} — decision আর action গুলা বসান`],
          ['Evidence / numbers', val('evidence') || `${GAP} — সংখ্যা ছাড়া case proof হতে পারে না`],
          ['My read', val('read') || `${GAP} — আপনার own পড়া, অন্য কারো না`],
          ['What it proves', val('proves') || `${GAP} — কোন position-টা এটা দাঁড় করায়`],
        ]
      : [
          ['What it is', val('name') || `${GAP} — area / offer-টার এক লাইনের পরিচয়`],
          ['Who it is for', val('who') || `${GAP} — segment আর stage`],
          ['What they believe before', val('before') || `${GAP} — client আসার আগে কী বোঝে`],
          ['What actually moves the needle', val('moves') || `${GAP} — সত্যিটা কী`],
          ['My part', val('role') || `${GAP} — আপনি ঠিক কোন অংশটা ধরান`],
          ['Proof / result', val('proof') || `${GAP} — উদাহরণ বা সংখ্যা`],
        ];

  const yq = (v) => `"${String(v || '').replace(/"/g, "'").replace(/\s+/g, ' ').trim().slice(0, 110)}"`;
  const title =
    lane === 'case'
      ? `${val('subject') || 'Case'} — ${val('proves') || val('what') || GAP}`
      : val('name') || GAP;

  const fm = [
    '---',
    `${lane === 'case' ? 'case_id' : 'area_id'}: ${id}`,
    `kind: ${lane}`,
    `title: ${yq(title)}`,
    lane === 'case' ? `company: ${yq(val('subject') || GAP)}` : `offer_type: ${val('offer_type') || 'service'}`,
    `world_links: ${worldLinks.length ? `[${worldLinks.join(', ')}]` : GAP}`,
    `created: ${created}`,
    'source: author capture (verbatim)',
    'status: draft',
    'expanded_by: lane drafter v1 (structure only, no claims invented)',
    'reviewed_by: null',
    `needs_author_input: ${sections.filter(([, v]) => String(v).startsWith(GAP)).length}`,
    '---',
  ];

  const body = [
    fm.join('\n'),
    '',
    ...sections.flatMap(([h, v]) => [`## ${h}`, '', v, '']),
    lane === 'case' && val('source') ? ['## Source', '', val('source'), ''].flat() : [`## Source`, '', GAP + ' — কোথা থেকে পড়লেন (link/নোট)', ''],
    `## Where it belongs`,
    '',
    worldLinks.length
      ? worldLinks.map((w) => `- node: \`${w}\``).join('\n')
      : `${GAP} — কোন node-এর concept এটা support করবে, confirm করুন`,
    '',
    `> Real Example line (for the concept this case feeds):`,
    `> ${lane === 'case' ? val('what') || GAP : val('moves') || GAP}`,
    '',
  ].flat();

  return body.join('\n');
}

function readLaneDir(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .sort()
    .map((f) => {
      const file = path.join(dir, f);
      const { data, content } = matter(fs.readFileSync(file, 'utf8'));
      const sections = {};
      let cur = null;
      for (const line of content.split('\n')) {
        const m = /^##\s+(.*)$/.exec(line);
        if (m) {
          cur = m[1].trim();
          sections[cur] = '';
          continue;
        }
        if (cur) sections[cur] = (sections[cur] + '\n' + line).trim();
      }
      const gaps = (content.match(/NEEDS_AUTHOR_INPUT/g) || []).length;
      return { ...data, __file: file, __rel: path.relative(CONTENT_ROOT, file), __sections: sections, __gaps: gaps, __words: content.split(/\s+/).filter(Boolean).length, id: f.replace(/^\d+-/, '').replace(/\.md$/, '') };
    });
}

export const loadCases = () => readLaneDir(CASES_DIR);
export const loadBusinessAreas = () => readLaneDir(BUSINESS_DIR);

/** light contract for lane artefacts — drafts may be unfinished, approved may not */
export function validateLaneFiles({ strict = false } = {}) {
  const out = [];
  const rows = [
    ['case', loadCases()],
    ['business', loadBusinessAreas()],
  ];
  const seen = new Set();
  for (const [kind, items] of rows) {
    for (const it of items) {
      const issues = [];
      const key = `${kind}:${it.id}`;
      if (seen.has(key)) issues.push('duplicate id');
      seen.add(key);
      if (!it.status) issues.push('missing status');
      if (kind === 'case' && !String(it.company || '').trim()) issues.push('missing company');
      if (!String(it.created || '').trim()) issues.push('missing created');
      const secs = Object.keys(it.__sections || {});
      const required = kind === 'case' ? ['What happened', 'My read'] : ['What it is', 'My part'];
      for (const r of required) if (!secs.includes(r)) issues.push(`missing section: ${r}`);
      const published = strict || ['approved', 'published'].includes(String(it.status));
      const gapCount = Number(it.needs_author_input || 0) || it.__gaps || 0;
      if (published) {
        if (gapCount > 0) issues.push(`${gapCount}x NEEDS_AUTHOR_INPUT still open — a card cannot publish itself`);
        const links = Array.isArray(it.world_links) ? it.world_links : it.world_links ? [it.world_links] : [];
        if (!links.length || String(links[0]).includes('NEEDS_AUTHOR_INPUT')) issues.push('must link at least one node');
      }
      if (issues.length) out.push({ kind, id: it.id, file: it.__rel, status: it.status, published, issues });
    }
  }
  return out;
}
