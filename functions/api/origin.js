/**
 * The ship-from address.
 *
 * Kept out of the repository on purpose. The storefront repo is public so
 * GitHub Pages can serve it, and this is a private residence: committed, it
 * would be indexed, scraped, and permanent in git history. Only the Cloud
 * Function needs it, and only for two things, rating a parcel and printing a
 * return address, so it is injected as a secret at deploy time.
 *
 * Set it with:
 *   printf '{"name":"Eden Grace Jewelry Co.","street1":"...","city":"...","state":"TX","zip":"76021"}' \
 *     | gcloud secrets create jj-origin --data-file=-
 *
 * and wire it in deploy.sh as ORIGIN_JSON=jj-origin:latest.
 */

let cached = null;

function getOrigin() {
  if (cached) return cached;

  const raw = process.env.ORIGIN_JSON;
  if (!raw) {
    throw new Error(
      'ORIGIN_JSON is not configured. The function cannot rate or label a ' +
        'parcel without a ship-from address. See functions/api/origin.js.',
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('ORIGIN_JSON is not valid JSON.');
  }

  // A missing ZIP silently produces wrong zones rather than an error, and a
  // missing street silently prints a broken return address, so both are
  // checked rather than assumed.
  for (const field of ['name', 'street1', 'city', 'state', 'zip']) {
    if (!parsed[field] || String(parsed[field]).trim() === '') {
      throw new Error(`ORIGIN_JSON is missing "${field}".`);
    }
  }
  if (!/^\d{5}$/.test(String(parsed.zip))) {
    throw new Error('ORIGIN_JSON zip must be five digits.');
  }

  cached = {
    name: parsed.name,
    street1: parsed.street1,
    street2: parsed.street2 || '',
    city: parsed.city,
    state: parsed.state,
    zip: String(parsed.zip),
    country: 'US',
  };
  return cached;
}

/**
 * True when a usable origin is configured. Rating falls back to a flat rate
 * without one; buying a label refuses outright, because a label with a broken
 * return address is worse than no label.
 */
function hasOrigin() {
  try {
    getOrigin();
    return true;
  } catch {
    return false;
  }
}

module.exports = { getOrigin, hasOrigin };
