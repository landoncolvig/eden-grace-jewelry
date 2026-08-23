'use client';

import { useState, type FormEvent } from 'react';
import { API_BASE } from '@/lib/shop';
import { trackSignUp } from '@/lib/analytics';

type State = 'idle' | 'sending' | 'done' | 'error';

/**
 * The only way a visitor who does not buy leaves a way to be reached.
 *
 * The address goes to the Cloud Function, which writes it into the Square
 * customer directory, the same place a checkout puts a buyer. One list, and
 * Jenna can send to it from Square without exporting anything.
 */
/**
 * The footer sits on the dark band and the homepage block sits on cream, so
 * the palette is a prop rather than two copies of this form. Nothing else
 * differs between them.
 */
const TONE = {
  dark: {
    label: 'text-bench/65',
    body: 'text-bench/65',
    done: 'text-bench/75',
    field: 'border-bench/25 text-bench placeholder:text-bench/40 focus:border-bench/60',
    button: 'bg-bench text-ink',
    error: 'text-bench/85',
    fine: 'text-bench/45',
  },
  light: {
    label: 'text-ink-faint',
    body: 'text-ink-soft',
    done: 'text-ink-soft',
    field: 'border-control text-ink placeholder:text-ink-faint focus:border-rose',
    button: 'bg-rose text-white',
    error: 'text-flag',
    fine: 'text-ink-faint',
  },
} as const;

export default function EmailSignup({
  source = 'footer',
  tone = 'dark',
  headingLevel = 'h2',
}: {
  source?: string;
  tone?: keyof typeof TONE;
  headingLevel?: 'h2' | 'h3';
}) {
  const t = TONE[tone];
  const Heading = headingLevel;
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');
  const [message, setMessage] = useState('');

  // Bots fill every field they find. A human never sees this one, so anything
  // arriving with it set is discarded server-side before Square is called.
  const [trap, setTrap] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (state === 'sending') return;

    setState('sending');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source, company: trap }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `signup failed: ${res.status}`);

      setState('done');
      setEmail('');
      trackSignUp(source);
    } catch (err) {
      setState('error');
      setMessage(
        err instanceof Error && err.message.startsWith('That does not look')
          ? err.message
          : 'That did not go through. Try again in a moment.',
      );
    }
  }

  if (state === 'done') {
    return (
      <div className="text-sm">
        <Heading className={`font-spec text-[0.7rem] uppercase tracking-[0.16em] ${t.label}`}>
          First look
        </Heading>
        <p className={`mt-3 leading-relaxed ${t.done}`} role="status">
          You&rsquo;re on the list. Jenna will send a note when new strands go up.
        </p>
      </div>
    );
  }

  return (
    <div className="text-sm">
      <Heading className={`font-spec text-[0.7rem] uppercase tracking-[0.16em] ${t.label}`}>
        First look
      </Heading>
      <p className={`mt-3 leading-relaxed ${t.body}`}>
        New strands are made in small batches. Leave your email and Jenna will
        tell you when the next one goes up.
      </p>

      <form onSubmit={submit} className="mt-4">
        <div className="flex items-stretch gap-2">
          <label htmlFor={`signup-email-${source}`} className="sr-only">
            Email address
          </label>
          <input
            id={`signup-email-${source}`}
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (state === 'error') setState('idle');
            }}
            placeholder="you@example.com"
            autoComplete="email"
            className={`min-w-0 flex-1 rounded-xl border bg-transparent px-3 py-2 text-sm outline-none ${t.field}`}
          />
          <button
            type="submit"
            disabled={state === 'sending'}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-opacity hover:opacity-85 disabled:opacity-50 ${t.button}`}
          >
            {state === 'sending' ? 'Adding…' : 'Join'}
          </button>
        </div>

        <input
          type="text"
          name={`company-${source}`}
          value={trap}
          onChange={(e) => setTrap(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute left-[-9999px] h-px w-px opacity-0"
        />

        {state === 'error' && (
          <p className={`mt-2 text-sm ${t.error}`} role="alert">
            {message}
          </p>
        )}

        <p className={`mt-2 font-spec text-[0.7rem] leading-relaxed ${t.fine}`}>
          New pieces and restocks. No more than a few times a month, and every
          email has an unsubscribe link.
        </p>
      </form>
    </div>
  );
}
