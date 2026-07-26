'use client';

import { useState, useId } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_WORD, MAX_WORD_LENGTH, NecklacePiece } from './piece-3d';

// Ten, because that is what the catalog's `word` add-on accepts. Letting the
// hero take more would hand the configurator a name it has to truncate.
const MAX_CHARS = MAX_WORD_LENGTH;

/**
 * The hero, and the thesis of the whole storefront: the piece is made to order,
 * so let the buyer place the order by making the piece. Rather than photograph
 * a finished necklace, they set their own word and watch the discs appear on
 * the strand.
 *
 * It is rendered as a real object rather than as type, because what is being
 * sold is nacre and glass rather than lettering: the colour shift across a
 * mother-of-pearl disc only exists while the piece is moving, which is exactly
 * the thing a still photograph of it cannot show. It arrives as a lazily
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

        {/* The piece itself: the strand, with a letter disc hanging off it for
            every character typed below. The height is capped rather than
            derived from the aspect ratio, because on a phone an uncapped hero
            pushes the input off the screen, and the input is the point. */}
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
              className="mt-5 w-full rounded-xl bg-rose px-5 py-3.5 text-sm text-white transition-colors hover:bg-rose-deep"
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
