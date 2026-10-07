import './globals.css';
import Link from 'next/link';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';

export const metadata = {
  title: {
    default: 'Tushar Thinking Universe',
    template: '%s · Tushar Thinking Universe',
  },
  description:
    'Observe. Question. Think. Connect. Build. — One thinker, many worlds. Brand Thinking, Marketing Thinking, Reality of Life, Love, Science.',
  openGraph: {
    title: 'Tushar Thinking Universe',
    description: 'Your Thinking In → Structured Knowledge Out. Different Worlds. One Thinker.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
