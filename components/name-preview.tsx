'use client';

import { useState, useId } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_WORD, NecklacePiece } from './piece-3d';

const MAX_CHARS = 12;

/**
 * The hero, and the thesis of the whole storefront: a name necklace is a
 * lettering object, so the most characteristic thing this shop can show is
 * type. Rather than photograph a finished piece, let the buyer set their own
 * word and watch it become the product.
 *
 * The piece is rendered as real geometry, extruded and lit, because the thing
 * being sold is metal rather than lettering: what a buyer is deciding is
 * whether their word looks good with an edge on it. It arrives as a lazily
 * loaded canvas over the flat treatment, which is what shows on a machine that
 * cannot draw it. See components/piece-3d.
 *
 * The typed name carries through to the configurator as a query parameter, so
 * the hero is the first step of the order rather than a separate toy.
 */
export default function NamePreview() {
  const [name, setName] = useState('');
  const router = useRouter();
  const inputId = useId();

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
          Necklaces strung by hand,
          <br />
          one bead at a time.
        </h1>

        {/* The piece itself, hung from a chain so it reads as jewelry rather
            than as a font sample. The height is capped rather than derived from
            the aspect ratio: on a phone an uncapped hero pushes the input, and
            the input is the point. */}
        <div className="mt-12 sm:mt-16">
          <NecklacePiece
            name={name}
            className="mx-auto h-[220px] w-full max-w-2xl sm:h-[300px]"
          />

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
                placeholder={DEFAULT_WORD}
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
              Mother-of-pearl letters, $42. Ships in 7 to 10 days.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
