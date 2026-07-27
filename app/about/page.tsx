import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Jenna makes beaded necklaces one at a time, strung by hand in Bedford, Texas.',
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
      <div className="grid items-start gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <div className="overflow-hidden rounded-[28px] bg-paper ring-1 ring-rule">
          {/*
            The lower half of this photograph is deliberately out of focus.
            Jenna's son is in it, and the page is public. A blurred rectangle
            over a child's face is a censor bar that tells everyone exactly
            where to look; a blur that ramps in with depth reads as a wide
            aperture and destroys the same pixels. Measured: 5% of the original
            detail survives in that band. See scratchpad/about_photo.py.
          */}
          <Image
            src="/portrait/jenna.webp"
            alt="Jenna in the front yard on a spring afternoon"
            width={1800}
            height={1834}
            priority
            className="w-full"
          />
        </div>

        <div>
          <p className="font-spec text-[0.62rem] uppercase tracking-[0.24em] text-ink-faint">
            Who makes these
          </p>
          <h1 className="mt-4 font-display text-4xl leading-[1.08] sm:text-5xl">
            Hi, I&rsquo;m Jenna.
          </h1>

          <div className="mt-6 space-y-4 leading-relaxed text-ink-soft">
            <p>
              I make beaded necklaces at a table in Bedford, Texas, mostly in the
              hours either side of a toddler&rsquo;s nap. It started because I
              wanted a particular strand and could not find it anywhere, so I
              bought a bead board and worked out how to make it myself.
            </p>
            <p>
              Everything here is strung one bead at a time on nylon-coated steel
              wire and finished by hand. I lay a piece out on the board first,
              move things around until the colour runs the way I want, and only
              then string it. That is why no two come out the same, and it is
              also why they take a few days rather than a few minutes.
            </p>
            <p>
              The stones are natural, so they vary. A green aventurine strand
              will have beads that lean grey and beads that lean deep green,
              and I think that is the good part. If you want something specific,
              or a word on one, tell me and I will make that one instead.
            </p>
          </div>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/#pieces"
              className="rounded-xl bg-rose px-7 py-3.5 text-sm text-white transition-colors hover:bg-rose-deep"
            >
              See the pieces
            </Link>
            <Link
              href="/product/the-delicate-monogram"
              className="rounded-xl border border-ink px-7 py-3.5 text-sm transition-colors hover:bg-ink hover:text-bench"
            >
              Add a monogram
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
