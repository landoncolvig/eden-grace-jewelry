'use client';

import { useState, useId } from 'react';
import { useRouter } from 'next/navigation';

const MAX_CHARS = 12;

/**
 * The hero, and the thesis of the whole storefront: a name necklace is a
 * lettering object, so the most characteristic thing this shop can show is
 * type. Rather than photograph a finished piece, let the buyer set their own
 * word and watch it become the product.
 *
 * The typed name carries through to the configurator as a query parameter, so
 * the hero is the first step of the order rather than a separate toy.
 */
export default function NamePreview() {
  const [name, setName] = useState('');
  const router = useRouter();
  const inputId = useId();

  const shown = name.trim() || 'Jenna';
  const isPlaceholder = name.trim().length === 0;

  // The script face gets wider per character than a text face, so long names
  // have to be pulled in or they run past the chain.
  const fontSize = shown.length <= 5 ? 92 : shown.length <= 8 ? 74 : 58;

  function start() {
    const q = name.trim() ? `?name=${encodeURIComponent(name.trim())}` : '';
    router.push(`/product/name-necklace${q}`);
  }

  return (
    <section className="relative overflow-hidden border-b border-rule">
      <div className="mx-auto max-w-6xl px-5 pb-16 pt-14 sm:px-8 sm:pb-20 sm:pt-20">
        <p className="font-spec text-[0.62rem] uppercase tracking-[0.24em] text-ink-faint">
          Made to order
        </p>
        <h1 className="mt-4 max-w-2xl font-display text-4xl leading-[1.08] sm:text-6xl">
          Necklaces cut by hand,
          <br />
          one word at a time.
        </h1>

        {/* The piece itself. An SVG chain with the name hanging from it, so the
            preview reads as jewelry rather than as a font sample. */}
        <div className="mt-12 sm:mt-16">
          <div className="relative mx-auto w-full max-w-2xl">
            <svg
              viewBox="0 0 640 260"
              className="w-full"
              role="img"
              aria-label={`A necklace reading ${shown}`}
            >
              <defs>
                <linearGradient id="chain" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8a6d3f" />
                  <stop offset="50%" stopColor="#d8b982" />
                  <stop offset="100%" stopColor="#8a6d3f" />
                </linearGradient>
              </defs>

              {/* Chain: a catenary-ish curve running off both edges, so the
                  piece reads as being worn rather than laid flat. */}
              <path
                d="M -10 18 C 120 18, 150 132, 320 132 C 490 132, 520 18, 650 18"
                fill="none"
                stroke="url(#chain)"
                strokeWidth="3"
                strokeLinecap="round"
              />
              {/* Clasp ring at the low point where the pendant hangs. */}
              <circle cx="320" cy="132" r="5.5" fill="none" stroke="url(#chain)" strokeWidth="2.5" />

              <text
                x="320"
                y="212"
                textAnchor="middle"
                className="font-script"
                fontSize={fontSize}
                fill="#b08d57"
                opacity={isPlaceholder ? 0.34 : 1}
                style={{ transition: 'opacity 220ms ease, font-size 220ms ease' }}
              >
                {shown}
              </text>
            </svg>
          </div>

          {/* The control sits directly under the piece and is styled as a ruled
              line rather than a boxed input, so it reads as part of the object. */}
          <div className="mx-auto mt-8 max-w-md">
            <label
              htmlFor={inputId}
              className="font-spec text-[0.62rem] uppercase tracking-[0.22em] text-ink-faint"
            >
              Set your word
            </label>
            <div className="mt-2 flex items-end gap-3 border-b border-ink pb-2">
              <input
                id={inputId}
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, MAX_CHARS))}
                maxLength={MAX_CHARS}
                placeholder="Jenna"
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent font-display text-2xl outline-none placeholder:text-ink-faint"
              />
              <span className="font-spec text-xs tabular-nums text-ink-faint">
                {name.length}/{MAX_CHARS}
              </span>
            </div>

            <button
              onClick={start}
              className="mt-5 w-full rounded-sm bg-ink px-5 py-3.5 text-sm text-bench transition-colors hover:bg-brass-deep"
            >
              Make this one
            </button>
            <p className="mt-3 text-center text-xs text-ink-soft">
              14k gold fill, from $68. Ships in 10 to 14 days.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
