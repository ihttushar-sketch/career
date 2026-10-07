import Link from 'next/link';
import { marked } from 'marked';
import CopyBlock from '../../../components/CopyBlock.jsx';
import {
  loadUnits,
  getUnit,
  unitsByWorld,
  relatedUnits,
  assetUrl,
  author,
  getWorld,
} from '../../../lib/content.mjs';

export const dynamic = 'force-static';

marked.setOptions({ gfm: true, breaks: false });

export function generateStaticParams() {
  return loadUnits().map((u) => ({ id: u.concept_id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const u = getUnit(id);
  if (!u) return { title: 'Concept' };
  return {
    title: `${String(u.concept_number).padStart(2, '0')} ${u.title}`,
    description: u.hook,
    openGraph: { title: u.title, description: u.hook },
  };
}

export default async function ConceptPage({ params }) {
  const { id } = await params;
  const u = getUnit(id);
  if (!u) return <MissingConcept id={id} />;
  const world = getWorld(u.world_id);
  const sibs = unitsByWorld(u.world_id);
  const prev = sibs.find((x) => x.concept_number === u.concept_number - 1);
  const next = sibs.find((x) => x.concept_number === u.concept_number + 1);
  const rel = relatedUnits(u);
  const a = author();
  const B = u.__byHeading || {};
  const rendered = (u.visual_concepts || [])
    .map((v) => ({ ...v, src: assetUrl(u, v.asset_path) }))
    .filter((v) => v.src);
  const hero = rendered.find((v) => v.kind === 'hero') || rendered[0] || null;
  const heroSrc = hero?.src || null;
  const body = `### The Idea\n\n${B['the idea'] || ''}\n\n### Deep Article\n\n${(B['deep article'] || '').replace(/^###\s*/gm, '#### ')}`;
  const html = marked.parse(body.trim());
  const captionHtml = marked.parse((B['linkedin caption'] || '').replace(/^\*\*(.+?)\*\*\n\n/, '**$1**\n\n'));
  const captionText = [
    `**${u.hook}**`,
    '',
    B['linkedin caption']?.split('\n').slice(2).join('\n').trim() || '',
    '',
    `— ${a.name}`,
    `${a.role} · ${a.website} · ${a.email} · ${a.phone}`,
  ].join('\n');

  return (
    <div className="wrap" style={{ ['--accent']: world?.accent === 'amber' ? '#b8742a' : 'var(--accent)' }}>
      <div className="crumbs mono">
        <Link href="/">Universe</Link> / <Link href={`/worlds/${u.world_id}`}>{u.world_label || u.world_id}</Link> /{' '}
        <span>
          {String(u.concept_number).padStart(2, '0')}
        </span>
      </div>

      <section className="article-head">
        <div className="num">
          {u.series_label || `${u.concept_number} / 50`} · {u.world_label}
        </div>
        <h1>{u.title}</h1>
        <p className="hookline">{u.hook}</p>
        <div className="chain">
          {String(u.framework || '')
            .split('→')
            .map((s, i, arr) => (
              <span key={s} style={{ display: 'contents' }}>
                <b>{s.trim()}</b>
                {i < arr.length - 1 ? <span>→</span> : null}
              </span>
            ))}
        </div>
        <div className="row">
          <div className="pill-row">
            <span className="tag" data-kind={u.__depth}>
              {u.__depth === 'full' ? 'deep article' : u.__depth === 'expanded' ? 'expanded' : 'structured'}
            </span>
            <span className="tag">{u.status}</span>
            <span className="tag">{u.__words} words</span>
            <span className="tag">{(u.visual_concepts || []).length} visuals</span>
          </div>
          <div className="row" style={{ gap: 8 }}>
            {prev ? <Link className="btn" href={`/concepts/${prev.concept_id}`}>← {String(prev.concept_number).padStart(2, '0')}</Link> : null}
            {next ? <Link className="btn" href={`/concepts/${next.concept_id}`}>{String(next.concept_number).padStart(2, '0')} →</Link> : null}
          </div>
        </div>
      </section>

      <section className="section" style={{ borderTop: 0, paddingTop: 26 }}>
        <div className="grid-2">
          <div className="panel">
            <div className="mono">Core thesis</div>
            <p style={{ margin: '10px 0 0', fontSize: 17 }}>{u.core_thesis}</p>
          </div>
          <div className="panel">
            <div className="mono">Author's own words</div>
            <p className="serif" style={{ margin: '10px 0 0', fontSize: 16.5 }}>
              “{u.original_thought}”
            </p>
            <p className="mono dim" style={{ margin: '12px 0 0', letterSpacing: '0.08em' }}>
              {u.expanded_by ? `structured by ${u.expanded_by}` : 'hand-written exemplar'}
            </p>
          </div>
        </div>

        {u.contrarian_angle ? (
          <div className="notice">
            <b>Contrarian angle</b>
            {u.contrarian_angle}
          </div>
        ) : null}

        <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
      </section>

      {(heroSrc || u.visual_concepts?.length) ? (
        <section className="section">
          <div className="section-head">
            <h2>Visual system</h2>
            <p>Image = stop · caption = think · article = understand. Prompts are production-ready; copy, render, post.</p>
          </div>
          {heroSrc ? (
            <figure className="figure" style={{ margin: '0 0 22px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={heroSrc} alt={hero?.headline_on_image || u.title} width={1280} height={1280} loading="lazy" />
              <figcaption className="cap">
                Rendered {rendered.length > 1 ? `${rendered.length} visuals` : 'hero'} — {hero?.headline_on_image || u.title}
              </figcaption>
            </figure>
          ) : null}
          {rendered.length > 1 ? (
            <div className="grid-2" style={{ marginBottom: 22 }}>
              {rendered
                .filter((v) => v !== hero)
                .map((v) => (
                  <figure className="figure" key={`img-${v.slot}`} style={{ margin: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.src} alt={v.headline_on_image || `${u.title} — ${v.kind}`} loading="lazy" />
                    <figcaption className="cap">{v.purpose}</figcaption>
                  </figure>
                ))}
            </div>
          ) : null}
          <div className="grid-2">
            {(u.visual_concepts || []).map((v) => (
              <div className="vcard" key={v.slot}>
                <h4>
                  {String(v.slot).padStart(2, '0')} · {v.kind}
                </h4>
                <p>{v.purpose}</p>
                {v.headline_on_image ? (
                  <p>
                    <b>{v.headline_on_image}</b>
                  </p>
                ) : null}
                <CopyBlock text={v.prompt} label="copy prompt">
                  <div className="prompt">{v.prompt}</div>
                </CopyBlock>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="section">
        <div className="section-head">
          <h2>Framework</h2>
          <p>The chain the whole concept rests on — repeatable from memory.</p>
        </div>
        <ol style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
          {(u.framework_steps || []).map((s, i) => (
            <li key={s} style={{ display: 'grid', gridTemplateColumns: '34px 1fr', gap: 14, padding: '13px 0', borderTop: i ? '1px solid var(--rule-2)' : '1px solid var(--rule)' }}>
              <span className="mono" style={{ color: 'var(--accent)' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span style={{ fontSize: 16 }}>{s}</span>
            </li>
          ))}
        </ol>
        <div className="grid-2" style={{ marginTop: 22 }}>
          <div className="panel">
            <div className="mono">Real-life example</div>
            <p style={{ margin: '10px 0 0', fontSize: 15.5 }}>{B['real-life example'] || u.real_life_example}</p>
          </div>
          <div className="panel">
            <div className="mono">Business application</div>
            <p style={{ margin: '10px 0 0', fontSize: 15.5 }}>{B['business application'] || u.business_example}</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Publish-ready caption</h2>
          <p>Signature is consistent; the CTA is a question, never a pitch.</p>
        </div>
        <CopyBlock text={`${captionText}\n\n${(u.hashtags || []).join(' ')}`} label="copy for LinkedIn">
          <div className="prose caption-body" dangerouslySetInnerHTML={{ __html: captionHtml }} />
        </CopyBlock>
        <div className="row" style={{ marginTop: 14 }}>
          <div className="pill-row">
            {(u.hashtags || []).map((h) => (
              <span className="chip" key={h}>
                {h}
              </span>
            ))}
          </div>
          <span className="mono dim">max 5 · relevance over reach</span>
        </div>
      </section>

      <section className="section">
        <div className="grid-2">
          <div>
            <div className="section-head" style={{ margin: '0 0 10px' }}>
              <h3>Related thinking</h3>
            </div>
            <ul className="list-plain">
              {rel.map((r) => (
                <li key={r.concept_id}>
                  <b>{r.world_label || r.world_id} {String(r.concept_number).padStart(2, '0')}</b>
                  <span>
                    <Link href={r.__url} style={{ fontWeight: 700 }}>
                      {r.title}
                    </Link>
                    <span className="dim" style={{ display: 'block', fontSize: 14 }}>
                      {r.hook}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="section-head" style={{ margin: '0 0 10px' }}>
              <h3>Cross-world reach</h3>
            </div>
            <p className="dim" style={{ fontSize: 15 }}>
              This concept belongs to more than one world. The universe is a graph, not a list — ideas that connect are
              ideas that compound.
            </p>
            <div className="pill-row">
              {(u.related_worlds || []).map((w) => (
                <span className="chip" key={w} data-on="1" style={{ textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--sans)', fontSize: 13.5 }}>
                  {w.replace(/-/g, ' ')}
                </span>
              ))}
            </div>
            <div className="panel" style={{ marginTop: 18 }}>
              <div className="mono">Signature</div>
              <p style={{ margin: '10px 0 0' }}>
                <b>{a.name}</b>
                <br />
                <span className="dim">{a.role}</span>
                <br />
                <span className="mono dim">{a.website} · {a.email} · {a.phone}</span>
              </p>
              <p className="serif" style={{ margin: '14px 0 0', fontSize: 17 }}>
                {u.cta}
              </p>
            </div>
          </div>
        </div>
        <div className="pager">
          {prev ? (
            <Link href={`/concepts/${prev.concept_id}`}>
              <span className="mono">← previous · {prev.series_label}</span>
              <b>{prev.title}</b>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/concepts/${next.concept_id}`} className="next">
              <span className="mono">next · {next.series_label} →</span>
              <b>{next.title}</b>
            </Link>
          ) : (
            <span className="next" />
          )}
        </div>
      </section>
    </div>
  );
}

function MissingConcept({ id }) {
  return (
    <div className="wrap" style={{ padding: '90px 24px' }}>
      <h1>Concept not found</h1>
      <p className="lede" style={{ marginTop: 14 }}>
        <code>{id}</code> is not a thinking unit yet. It exists in the series index, but a page opens only once the
        author's position for it has been written.
      </p>
      <Link className="btn" style={{ marginTop: 18, display: 'inline-block' }} href="/worlds/brand-thinking">
        Back to the series
      </Link>
    </div>
  );
}
