/**
 * TTF -> three.js typeface JSON.
 *
 * three's TextGeometry cannot read a .ttf or .woff2. It wants the old
 * "typeface" JSON shape: per-glyph outline commands as a flat string, in font
 * units, at a fixed resolution. There is no runtime converter that works
 * offline, so the conversion happens here, once, and the result is committed
 * to /public/fonts. The storefront is a static export served off GitHub Pages,
 * so anything the browser needs at runtime has to already be in the repo.
 *
 * The command order below is not arbitrary. three's FontLoader reads the
 * endpoint first and the control points after it, then re-orders them when it
 * calls quadraticCurveTo/bezierCurveTo. Emit them in path order and every
 * curve comes out inside out.
 *
 * Usage (opentype.js is not a project dependency, this runs by hand):
 *   npm install --no-save opentype.js
 *   node scripts/make-typeface.mjs <font.ttf> <out.json>
 */

import fs from 'node:fs';
import opentype from 'opentype.js';

// Twelve characters of a first name, plus the punctuation that shows up in
// one. Shipping the full latin set would triple the file for glyphs nobody
// can type into a 12-character box.
const CHARSET = [
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'abcdefghijklmnopqrstuvwxyz',
  '0123456789',
  " &'-.,!?+",
  'ÁÀÂÄÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝ',
  'áàâäãåçéèêëíìîïñóòôöõúùûüýÿ',
  'ØøÆæŒœßÐðÞþ',
].join('');

// opentype 2.x nests the name table by platform rather than flattening it, so
// the family name and the license notice are one level deeper than they used
// to be. Windows first, since every Google font ships that record.
function names(font) {
  const n = font.names;
  return n.windows ?? n.macintosh ?? n.unicode ?? n;
}

function convert(font, familyName) {
  // facetype.js's scale: normalize the em square to a 1000-unit resolution,
  // times the 100/72 point factor the format was written against.
  const scale = (1000 * 100) / ((font.unitsPerEm || 2048) * 72);
  const round = (n) => Math.round(n * scale);

  const glyphs = {};
  for (const char of CHARSET) {
    const glyph = font.charToGlyph(char);
    if (!glyph || glyph.index === 0) continue;

    let o = '';
    for (const cmd of glyph.path.commands) {
      // opentype emits cubics as 'C'; the typeface format calls them 'b'.
      const type = cmd.type.toLowerCase() === 'c' ? 'b' : cmd.type.toLowerCase();
      o += type + ' ';
      if (cmd.x !== undefined) o += `${round(cmd.x)} ${round(cmd.y)} `;
      if (cmd.x1 !== undefined) o += `${round(cmd.x1)} ${round(cmd.y1)} `;
      if (cmd.x2 !== undefined) o += `${round(cmd.x2)} ${round(cmd.y2)} `;
    }

    glyphs[char] = {
      ha: round(glyph.advanceWidth),
      x_min: round(glyph.xMin ?? 0),
      x_max: round(glyph.xMax ?? 0),
      o: o.trim(),
    };
  }

  const head = font.tables.head;
  const post = font.tables.post || {};

  return {
    glyphs,
    familyName,
    ascender: round(font.ascender),
    descender: round(font.descender),
    underlinePosition: round(post.underlinePosition ?? 0),
    underlineThickness: round(post.underlineThickness ?? 0),
    boundingBox: {
      xMin: round(head.xMin),
      xMax: round(head.xMax),
      yMin: round(head.yMin),
      yMax: round(head.yMax),
    },
    resolution: 1000,
    // The OFL requires the copyright and license notice to travel with the
    // font data, including a converted derivative like this one.
    original_font_information: {
      copyright: names(font).copyright?.en,
      font_family_name: names(font).fontFamily?.en,
      designer: names(font).designer?.en,
      license: names(font).license?.en,
      license_url: names(font).licenseURL?.en,
    },
    cssFontWeight: 'normal',
    cssFontStyle: 'normal',
  };
}

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('usage: node scripts/make-typeface.mjs <font.ttf> <out.json>');
  process.exit(1);
}

const font = opentype.parse(fs.readFileSync(input).buffer);
const data = convert(font, names(font).fontFamily?.en ?? 'Converted');
fs.writeFileSync(output, JSON.stringify(data));

const kb = (fs.statSync(output).size / 1024).toFixed(1);
console.log(`${Object.keys(data.glyphs).length} glyphs -> ${output} (${kb} KB)`);
