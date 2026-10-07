import Link from 'next/link';
import Graph from '../../components/Graph.jsx';
import { buildGraph, loadWorlds, loadUnits } from '../../lib/content.mjs';

export const metadata = { title: 'Idea graph' };
export const dynamic = 'force-static';

export default function GraphPage() {
  const graph = buildGraph();
  const worlds = loadWorlds();
  const units = loadUnits();
  const byWorld = worlds.filter((w) => units.some((u) => u.world_id === w.id));
  const threads = graph.worldThreads || [];
  const totalEdges = graph.edges.length;
  const crossCount = graph.edges.filter((e) => e.cross).length;
  const hubs = [...graph.degree].sort((a, b) => b.degree - a.degree).slice(0, 8);

  return (
    <div className="wrap">
      <section className="hero" style={{ display: 'block' }}>
        <div className="mono eyebrow">Relationship layer</div>
        <h1 style={{ fontSize: 'clamp(34px,5vw,58px)' }}>Ideas connect to ideas</h1>
        <p className="lede" style={{ marginTop: 14, maxWidth: '58ch' }}>
          {graph.nodes.length} concepts, {totalEdges} links inside Brand Thinking, {crossCount} links already reaching a
          filled neighbour world and {threads.reduce((s, t) => s + t.count, 0)} declared threads into worlds that are not
          open yet. The graph is not a decoration — it is the reason this is a universe and not a blog.
        </p>
      </section>

      <section className="section">
        <div className="row" style={{ marginBottom: 14 }}>
          <span className="mono dim">solid = same world · dashed amber = cross-world · filled circle = deep article</span>
          <span className="mono dim">hover a node to isolate its neighbourhood</span>
        </div>
        <div className="graph-box">
          <Graph graph={graph} worlds={byWorld} />
        </div>
      </section>

      <section className="section">
        <div className="grid-2">
          <div>
            <div className="section-head" style={{ margin: '0 0 8px' }}>
              <h3>Most connected concepts</h3>
            </div>
            <ul className="list-plain">
              {hubs.map((h) => {
                const u = units.find((x) => x.concept_id === h.id);
                return (
                  <li key={h.id}>
                    <b>{h.degree} links</b>
                    <span>
                      <Link href={`/concepts/${h.id}`} style={{ fontWeight: 700 }}>
                        {u?.title || h.id}
                      </Link>
                      <span className="dim" style={{ display: 'block', fontSize: 14 }}>{u?.hook}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <div className="section-head" style={{ margin: '0 0 8px' }}>
              <h3>Where Brand Thinking reaches</h3>
            </div>
            <ul className="list-plain">
              {threads
                .map(({ world: w, count: n }) => (
                  <li key={w}>
                    <b>{w.replace(/-/g, ' ')}</b>
                    <span>
                      {n} inbound link{n > 1 ? 's' : ''} from Brand Thinking —{' '}
                      <span className="dim">
                        {n >= 6 ? 'strong overlap; a future node worth filling early' : 'a thread worth pulling when this world opens'}
                      </span>
                    </span>
                  </li>
                ))}
            </ul>
            <div className="notice" style={{ marginTop: 18 }}>
              <b>Reading the graph</b>
              Cross-world links decide which node gets filled next. Marketing Thinking, Human Thinking and Business
              Thinking are already being cited by the Brand series — that is the scaling order the data suggests.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
