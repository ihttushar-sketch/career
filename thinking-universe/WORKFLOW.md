# WORKFLOW — Raw Thinking → Complete Thinking Unit

This is the **engine**. Copy-paste this file together with `thinking-core/tushar-thinking-core.yaml` into any AI, plus the raw thought. Output = one publishable unit file.

---

## 0. Four shelves around one main node

The main node is the thinker, not a topic. Capture belongs to one of four shelves, and each shelf has its
own artefact: **Thinking** → a concept in a node · **Cases** → a card in `research/cases/` ·
**Business** → a card in `business/` · **Notes** → unfiled until triage. Same inbox, same gate, same rule:
your words verbatim, everything else a marked question.

```bash
npm run intake -- --triage                    # what you dropped, and where it proposes to live
npm run intake -- --confirm <file> --world <node> --lane <shelf>
```

## 1. Author input (minimum viable) — three doors, one inbox

```text
UI         /intake          shelf (auto) → write one line → save          ← any time, 10 seconds
terminal   npm run intake -- --add --thought "…"          (or --world brand-thinking --lane case)
terminal   npm run intake -- --add --world brand-thinking --thought "…"
file       thinking-universe/inbox/<world>/2026-10-07-<slug>.md
```

```text
WORLD: Brand Thinking
THOUGHT: <one or two lines in your own words>
```

Optional richer input:

```text
WORLD:
RAW THOUGHT:
MY OBSERVATION:
MY ANGLE / FRAMEWORK:
WHO IS WRONG ABOUT THIS:
WHY IT MATTERS BUSINESSWISE:
```

---

## 2. Generation prompt (use verbatim)

> You are the structuring engine for the **Tushar Thinking Universe**.
> Load `thinking-core/tushar-thinking-core.yaml` as the source of truth.
>
> Task: take my raw thought below and produce ONE Thinking Unit file that satisfies every required key in `thinking-unit.schema.json`.
>
> Hard rules:
> 1. **Do not invent beliefs for me.** `core_thesis`, `original_thought`, `quote` must be built only from my own words and existing Thinking Core entries. If you cannot, write `NEEDS_AUTHOR_INPUT`.
> 2. Keep my position exactly as strong as I stated it. Do not soften it into corporate copy. Do not exaggerate it either.
> 3. Structure: `RAW THINKING → CORE THESIS → CONTRARIAN ANGLE → FRAMEWORK → DEEP ARTICLE → CAPTION → VISUALS → CTA`.
> 4. Voice: short declarative lines, Bengali skeleton + English technical nouns, arrow chains for logic, bold only the takeaway, no motivational filler, no invented statistics, max 5 hashtags.
> 5. Deep article 1000–2000+ words with sections: Problem, Common belief, Author's observation, Argument, Breakdown, Example, Counter-example, Business implication, Marketing implication, Brand implication, Conclusion.
> 6. Always write a real **counter-example** — the point where my view may not apply. This keeps the universe honest.
> 7. Produce 5 visual concepts (hero / explanation / real-life / business / quote) each with a production-ready text-to-image prompt following the IMAGE TEXT RULE: 1 strong headline + minimal supporting text only. Image = STOP, caption = THINK, article = UNDERSTAND.
> 8. Produce a LinkedIn caption (hook → misbelief → my definition → framework → plain-words contrast → punchline → CTA question → hashtags).
> 9. Cross-link: at least 2 `related_concepts` (may cross worlds) and 1–3 `related_worlds`. Suggest new links if the thought belongs to another world.
> 10. Append the standard author signature block (name, Brand Marketing Strategist, www.iliashossain.site, mail@iliashossain.site, 01701076173) with a subtle CTA — never a sales pitch.
> 11. End with a self-review: run the 8 quality checks from master doc §30 and print pass/fail plus the top 3 weakest points of the draft.
> 12. Output as a single `.md` file with YAML front matter (schema keys) and the article in the body. Status: `draft` (or `needs_author_input` if any gap remains).
>
> My raw thought:
> """
> <paste>
> """

---

## 3. Approval loop (author does 20% of the work)

```text
THINK  →  DRAFT  →  APPROVE  →  PUBLISH
```

Author review checklist (5 minutes):

- [ ] Is `core_thesis` actually mine, in my strength?
- [ ] Did the AI smuggle in an opinion I don't hold? Delete it.
- [ ] Is the counter-example real or decorative?
- [ ] Does the hook survive as text-only, without the image?
- [ ] Do the 5 image prompts obey "1 headline, minimal text"?
- [ ] Is the CTA a question, not a pitch?

Only flip `status: approved` after the 8/8 quality checks pass and `NEEDS_AUTHOR_INPUT` count is 0 in author-voice fields. Then run `python3 tools/validate.py --strict` — a unit that fails it is not publishable.

---

## 4. Scaling to a new World

Adding a node is 4 steps, no re-architecture:

1. Add entry to `world_registry` in `thinking-core/tushar-thinking-core.yaml` (id, name, thesis, accent).
2. Create `worlds/<world-id>/INDEX.md` with the concept seed table (title / hook / breakdown) — from **your** observations only.
3. Run section 2 per approved seed → one `.md` unit per concept.
4. Update cross-links both directions; the graph is derived from `related_concepts` / `related_worlds`.

Same engine, any world. Nothing about Brand Thinking is special except that it is the prototype.

---

## 4a. The per-node loop, as it actually runs

```bash
npm run intake -- --list                     # what is waiting, per shelf and per node
npm run intake -- --triage                    # captures + the shelf/node they propose
npm run draft                                # pending → shells (structure, never invented beliefs)
# fill NEEDS_AUTHOR_INPUT in thinking-universe/worlds/<world>/NN-<slug>.md
npm run check:strict                         # refuses to let a shell pass as finished
node scripts/link-assets.mjs                 # renders images in assets/<world>/NN_name.png → slot links
```

A node needs no code to open: create the thought, and `inbox/<world>/` and `worlds/<world>/` appear.

## 4b. Real commands in this repo (the workflow is no longer theoretical)

```bash
npm run dev            # preview at :3000 — /intake is the author's door
npm run intake -- --add --world marketing-thinking --thought "…"   # add perception to any node
npm run draft          # inbox entry → Thinking Unit shell
npm test               # 17 integrity tests on content + links + generator + assets
npm run check:strict   # publication gate; author gaps become blockers
# 1) write the thought in data/<world>-units*.mjs
npm run content        # 2) engine expands it to a unit file
npm run index          # 3) series index regenerated from the files
npm run build          # 4) gate + static site
# 5) render a prompt → save as thinking-universe/assets/NN_name.png → npm run link-assets
```

`reviewed_by` in a unit's front matter stays `null` until the author has read it; the gate prints
those as warnings so an unreviewed page can never be mistaken for a signed one.

## 5. Website build notes (for the coding AI)

- File-based content: `worlds/**.md` + YAML front matter = the database. No CMS in prototype.
- Validate every unit against `thinking-unit.schema.json` at build time (fail the build on missing required keys).
- Build the graph at compile time from the link fields; render `Related Thinking` and a universe map on `/`.
- Routes: `/`, `/worlds/[world_id]`, `/concepts/[concept_id]`, `/frameworks`, `/about`.
- Per-world accent token, one shared typographic identity — *Different Worlds. One Thinker.*
- QA gate: `python3 tools/validate.py --strict` in CI and as a pre-commit hook.
- Reusable components: `HookBlock`, `FrameworkChain`, `VisualGallery`, `AuthorSignature`, `RelatedThinking`, `DepthTabs` (image / caption / short / article / connected).
- Every concept page exposes copy-ready `linkedin_caption` + hashtag row for the author's own posting workflow.


---

## 6. The habit, in three lines (master doc §40)

* **Any time:** `/intake` → one line → Save. No shelf, no node, no formatting. Capture is free.
* **Weekly:** `/triage` → confirm shelf + node (one click each) → `npm run draft` → fill only what you know.
* **Before publishing:** `npm run check:strict` → `status: approved` + `reviewed_by: <you>` → `npm run build`.

Everything the engine does not know stays `NEEDS_AUTHOR_INPUT`. That is not a gap in the system; it is the
system working — the shelf that would otherwise be filled with confident nonsense stays visibly empty.


---

## 7. Filling every node, from anywhere

```bash
npm run plan                              # worlds/<node>/PLAN.md — 50 slots, states, graph demand
```

A node is ready when each slot has a reason: `signed off` · `draft shell` · `captured, not drafted` ·
`open · reserved` (another node is already waiting on it) · `open` (a seed question from your own ideas).

**Capture with no computer:**

| Path | Works offline | How it lands |
|---|---|---|
| `/quick` | needs a server | `POST /api/intake` → `inbox/<node>/…` |
| GitHub issue “Capture” | any browser, any phone | Action files it, drafts it, opens a PR — merge = approve |
| a line in chat | yes | I file it in the same format |

```bash
node scripts/capture-from-issue.mjs --selftest        # the phone path's parser, verified
node scripts/open-node.mjs --world money-thinking     # open/refresh a single node
```

Priority is not a guess: `graph demand` in each plan counts how many concepts in other nodes already point
at this one — Marketing 30, Business 20, Human 16. Fill those first and the universe densifies itself.
