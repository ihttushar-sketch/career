import Link from 'next/link';

const LINKS = [
  { href: '/', label: 'Universe' },
  { href: '/worlds', label: 'Worlds' },
  { href: '/frameworks', label: 'Frameworks' },
  { href: '/graph', label: 'Graph' },
  { href: '/intake', label: '+ Add thinking' },
  { href: '/about', label: 'About' },
];

export default function Nav({ active = '' }) {
  return (
    <header className="nav">
      <div className="wrap nav-in">
        <Link href="/" className="brand">
          <span className="dot" aria-hidden />
          Thinking Universe
          <span className="mono dim" style={{ letterSpacing: '0.14em' }}>
            Tushar
          </span>
        </Link>
        <nav className="nav-links">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} data-active={active === l.href ? '1' : undefined}>
              {l.label}
            </Link>
          ))}
          <Link className="nav-cta" href="/about#contact">
            Work with me
          </Link>
        </nav>
      </div>
    </header>
  );
}
