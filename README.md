# career → Tushar Thinking Universe

The running implementation of **Md Ilias Hossain Tushar's** thinking system: a Next.js site whose content
layer is 50 schema-validated Thinking Units in one node (Brand Thinking), generated from authored fields and
gated by tests.

```
npm install
npm run dev            # http://localhost:3000 → /intake adds thinking to any node
npm run intake -- --add --world marketing-thinking --thought "…"
npm run draft          # pending thoughts → unit shells (NEEDS_AUTHOR_INPUT marks the gaps)
npm test               # 17 integrity tests
npm run check          # publication gate (schema + publish rules)
npm run build          # gate + 61 static pages
```

## Layout

| Path | Role |
|------|------|
| `/intake` | **the author's door for every node** — add a perception in the UI, it lands in that node's inbox |
| `thinking-universe/inbox/<world>/` | pending thoughts, one file each; `npm run draft` turns them into shells |
| `data/` | batch-authored concepts (Brand Thinking's 50) — 50 authored concepts (hook, thought, belief, thesis, framework, examples, counter-example, implications, quote, CTA, hero line, links) |
| `scripts/build-content.mjs` | engine: authored fields → complete unit files (never overwrites hand edits) |
| `thinking-universe/worlds/brand-thinking/*.md` | 50 Thinking Units — front matter = schema contract, body = article + caption |
| `thinking-universe/thinking-core/tushar-thinking-core.yaml` | the brain: philosophy, beliefs, frameworks, language rules, AI contract |
| `thinking-universe/thinking-unit.schema.json` | content contract enforced by `scripts/check-content.mjs` and `tests/` |
| `thinking-universe/Tushar_Thinking_Universe_Master.md` | 38-section architecture (start with §00 if you are an AI) |
| `app/` | universe map, world pages with search + cluster filters, concept pages, idea graph, framework library |
| `tests/content.test.mjs` | 50 concepts present · schema valid · hooks unique · no dangling links · author wording preserved · asset links survive regeneration |

## The rule this project is built on

> **AI expands the author's thinking; it never replaces it.**
> Thinking first. Content second. Design third.

Current state: **node 01 complete** (50 concepts, 52k words, 250 image prompts, 104 cross-links, 5 rendered heroes)
· awaiting author sign-off (`reviewed_by`) · **Marketing Thinking seeded** — first shell drafted from the author's own
sentence through the intake door, nothing invented.

**Different Worlds. One Thinker.** — www.iliashossain.site · mail@iliashossain.site · 01701076173
