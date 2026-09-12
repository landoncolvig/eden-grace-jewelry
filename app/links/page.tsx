import type { Metadata } from 'next';
import Image from 'next/image';
import Logo from '@/components/logo';
import styles from './links.module.css';

// HERO: Jenna's portrait is encircled by a loose strand of hand-drawn beads.

const SOCIALS = {
  instagram: 'https://www.instagram.com/edengracejewelryco/',
  tiktok: 'https://www.tiktok.com/@eden.grace.jewelr',
  website: 'https://edengracejewelry.com/',
};

export const metadata: Metadata = {
  title: 'Find Eden Grace Jewelry Co.',
  description:
    'Shop Eden Grace Jewelry Co. and follow the latest handmade pieces on Instagram and TikTok.',
  alternates: { canonical: '/links/' },
  openGraph: {
    type: 'website',
    url: '/links/',
    title: 'Find Eden Grace Jewelry Co.',
    description: 'Handmade gemstone necklaces, shop updates, and new pieces.',
    images: ['/og/default.jpg'],
  },
};

function ArrowIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

function WebsiteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r=".8" className={styles.filledIcon} />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14.5 4v10.1a4.5 4.5 0 1 1-3.8-4.45" />
      <path d="M14.5 4c.65 2.55 2.25 4.05 4.8 4.5" />
    </svg>
  );
}

function BeadStrand() {
  const beads = [
    { x: 8, y: 66, size: 12, color: '#98474b' },
    { x: 11, y: 43, size: 9, color: '#d7bd9c' },
    { x: 20, y: 23, size: 13, color: '#5c7563' },
    { x: 35, y: 10, size: 9, color: '#ba863f' },
    { x: 51, y: 5, size: 14, color: '#f1ddd0' },
    { x: 68, y: 11, size: 10, color: '#98474b' },
    { x: 82, y: 25, size: 12, color: '#5c7563' },
    { x: 90, y: 46, size: 9, color: '#ba863f' },
    { x: 92, y: 69, size: 13, color: '#d7bd9c' },
  ];

  return (
    <div className={styles.strand} aria-hidden="true">
      <svg viewBox="0 0 100 100"><path d="M7 73C6 37 23 8 49 5c29-3 47 27 44 69" /></svg>
      {beads.map((bead, index) => (
        <span key={index} style={{ left: `${bead.x}%`, top: `${bead.y}%`, width: bead.size, height: bead.size, background: bead.color }} />
      ))}
    </div>
  );
}

export default function LinksPage() {
  return (
    <div className={`link-card-page ${styles.page}`}>
      <div className={styles.grain} aria-hidden="true" />
      <main className={styles.card}>
        <header className={styles.hero}>
          <div className={styles.portraitWrap}>
            <BeadStrand />
            <Image className={styles.portrait} src="/portrait/jenna-sm.webp" alt="Jenna, founder and maker of Eden Grace Jewelry Co." width={320} height={320} priority />
            <span className={styles.clasp} aria-hidden="true" />
          </div>
          <div className={styles.wordmark}>
            <Logo size={34} className={styles.logo} />
            <span>Eden Grace</span>
          </div>
          <p className={styles.company}>Jewelry Co.</p>
          <h1>Made by hand.<br />Chosen with heart.</h1>
          <p className={styles.intro}>Beaded gemstone necklaces, strung by hand in small batches and made to order.</p>
        </header>

        <nav className={styles.actions} aria-label="Eden Grace links">
          <a className={`${styles.link} ${styles.primary}`} href={SOCIALS.website}>
            <span className={styles.icon}><WebsiteIcon /></span>
            <span className={styles.linkCopy}><strong>Shop the collection</strong><small>edengracejewelry.com</small></span>
            <span className={styles.arrow}><ArrowIcon /></span>
          </a>
          <a className={styles.link} href={SOCIALS.instagram} target="_blank" rel="noreferrer">
            <span className={styles.icon}><InstagramIcon /></span>
            <span className={styles.linkCopy}><strong>Instagram</strong><small>@edengracejewelryco</small></span>
            <span className={styles.arrow}><ArrowIcon /></span>
          </a>
          <a className={styles.link} href={SOCIALS.tiktok} target="_blank" rel="noreferrer">
            <span className={styles.icon}><TikTokIcon /></span>
            <span className={styles.linkCopy}><strong>TikTok</strong><small>@eden.grace.jewelr</small></span>
            <span className={styles.arrow}><ArrowIcon /></span>
          </a>
        </nav>

        <footer className={styles.footer}><span className={styles.footerRule} /><p>Bedford, Texas</p></footer>
      </main>
    </div>
  );
}
