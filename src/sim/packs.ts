/**
 * Sets of emoji to fill the ladder with.
 *
 * The reference videos are the same machine dressed differently — one drops
 * fruit, one drops gems, one drops planets — so the dressing is the cheapest
 * variety this thing has. A pack is eleven glyphs in size order, smallest
 * first, because the ladder is a size ladder: a pea has to be a rank below a
 * melon or the merges read backwards.
 *
 * Each glyph carries the colour of its halo. Emoji paint themselves, so the
 * halo is the only colour the page controls, and a red glow under a green
 * glyph looks like a mistake.
 */

export interface Pack {
  name: string;
  /** Eleven `[glyph, halo]` pairs, smallest first. */
  items: readonly (readonly [string, string])[];
}

export const PACKS: readonly Pack[] = [
  {
    name: 'fruit',
    items: [
      ['🍓', '#e8384f'],
      ['🍊', '#f97316'],
      ['🥝', '#84cc16'],
      ['🍋', '#eab308'],
      ['🍎', '#ef4444'],
      ['🍑', '#fb923c'],
      ['🍐', '#a3e635'],
      ['🥭', '#f59e0b'],
      ['🍍', '#facc15'],
      ['🍈', '#86efac'],
      ['🍉', '#22c55e'],
    ],
  },
  {
    name: 'gems',
    items: [
      ['🔸', '#f59e0b'],
      ['🔹', '#38bdf8'],
      ['🔶', '#f97316'],
      ['🔷', '#3b82f6'],
      ['🟠', '#fb923c'],
      ['🟡', '#facc15'],
      ['🟢', '#22c55e'],
      ['🔵', '#2563eb'],
      ['🟣', '#a855f7'],
      ['💎', '#67e8f9'],
      ['👑', '#fbbf24'],
    ],
  },
  {
    name: 'planets',
    items: [
      ['☄️', '#f97316'],
      ['🌑', '#6b7280'],
      ['⭐', '#facc15'],
      ['🌟', '#fbbf24'],
      ['🌙', '#fde68a'],
      ['🌕', '#fef3c7'],
      ['🪐', '#f59e0b'],
      ['🌎', '#3b82f6'],
      ['🔥', '#fb923c'],
      ['🌞', '#f97316'],
      ['💥', '#fbbf24'],
    ],
  },
  {
    name: 'animals',
    items: [
      ['🐜', '#d6d3d1'],
      ['🐝', '#facc15'],
      ['🐞', '#ef4444'],
      ['🦋', '#38bdf8'],
      ['🐸', '#22c55e'],
      ['🐭', '#a8a29e'],
      ['🐰', '#f5f5f4'],
      ['🐱', '#fbbf24'],
      ['🐶', '#d97706'],
      ['🐷', '#f9a8d4'],
      ['🐻', '#f59e0b'],
    ],
  },
  {
    name: 'sweets',
    items: [
      ['🍬', '#f472b6'],
      ['🍭', '#fb7185'],
      ['🧁', '#fbcfe8'],
      ['🍪', '#d97706'],
      ['🍩', '#f9a8d4'],
      ['🍫', '#b45309'],
      ['🍰', '#fda4af'],
      ['🎂', '#fbbf24'],
      ['🍮', '#fcd34d'],
      ['🍨', '#fde68a'],
      ['🍧', '#a5f3fc'],
    ],
  },
  {
    name: 'sea',
    items: [
      ['🐚', '#fbcfe8'],
      ['🦐', '#fb7185'],
      ['🦀', '#ef4444'],
      ['🐡', '#fbbf24'],
      ['🐠', '#f97316'],
      ['🐟', '#38bdf8'],
      ['🦑', '#f9a8d4'],
      ['🐙', '#c084fc'],
      ['🦭', '#9ca3af'],
      ['🐬', '#60a5fa'],
      ['🐳', '#2563eb'],
    ],
  },
  {
    name: 'sport',
    items: [
      ['🏓', '#ef4444'],
      ['🎾', '#d9f99d'],
      ['⚾', '#f5f5f4'],
      ['🥎', '#fde047'],
      ['🏐', '#e5e7eb'],
      ['⚽', '#f5f5f4'],
      ['🏀', '#f97316'],
      ['🏈', '#d97706'],
      ['🎱', '#94a3b8'],
      ['🎳', '#a855f7'],
      ['🛞', '#94a3b8'],
    ],
  },
  {
    name: 'faces',
    items: [
      ['😐', '#facc15'],
      ['🙂', '#fbbf24'],
      ['😉', '#fde047'],
      ['😎', '#f59e0b'],
      ['🤓', '#fdba74'],
      ['🥳', '#f472b6'],
      ['🤠', '#d97706'],
      ['😈', '#a855f7'],
      ['👻', '#e5e7eb'],
      ['🤡', '#fb7185'],
      ['🤖', '#9ca3af'],
    ],
  },
];

/**
 * Everything the packs know, for the roll that ignores them.
 *
 * A pack is a theme; this is the other thing the button can do — eleven glyphs
 * that have no business being in the same bowl, which is its own kind of funny
 * and is what "different combinations" asks for.
 */
const LOOSE: readonly (readonly [string, string])[] = PACKS.flatMap((pack) => pack.items).concat([
  ['🌵', '#22c55e'],
  ['🍄', '#ef4444'],
  ['🔥', '#f97316'],
  ['💧', '#38bdf8'],
  ['⚡', '#facc15'],
  ['❄️', '#a5f3fc'],
  ['🌈', '#c084fc'],
  ['🎈', '#fb7185'],
  ['🎁', '#ef4444'],
  ['🧿', '#3b82f6'],
  ['🕹️', '#cbd5e1'],
  ['💀', '#e5e7eb'],
  ['👽', '#86efac'],
  ['🤖', '#9ca3af'],
  ['🚀', '#f5f5f4'],
  ['🪨', '#d6d3d1'],
  ['🧩', '#f59e0b'],
  ['🔔', '#fbbf24'],
]);

export interface Dealt {
  name: string;
  faces: { glyph: string; color: string }[];
}

export const MIXED = 'a bit of everything';

/**
 * Deals a set for the ladder.
 *
 * `roll` is any number — the button hands it `Math.random()`. Most of the time
 * it deals a theme; now and then it deals eleven unrelated glyphs, drawn without
 * repeating so the ladder never merges a thing into itself.
 */
export function dealPack(roll: number, avoid?: string): Dealt {
  // Never twice running. Two mixed deals do differ, but a button that answers
  // with the same label twice reads as a button that did nothing.
  const mixed = roll > 0.78 && avoid !== MIXED;
  if (!mixed) {
    const choices = PACKS.filter((pack) => pack.name !== avoid);
    // Not `roll * length`: the mixed branch hands this the top of the range as
    // well, and scaling that straight would deal the first two or three themes
    // twice as often as the rest.
    const pack = choices[Math.floor(roll * 1e6) % choices.length];
    return {
      name: pack.name,
      faces: pack.items.map(([glyph, color]) => ({ glyph, color })),
    };
  }

  const pool = [...LOOSE];
  const faces: Dealt['faces'] = [];
  // Seeded off the roll itself, so the whole deal comes from the one number.
  let state = Math.floor(roll * 0xffffffff) >>> 0;
  for (let i = 0; i < PACKS[0].items.length; i += 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const [glyph, color] = pool.splice(state % pool.length, 1)[0];
    faces.push({ glyph, color });
  }
  return { name: MIXED, faces };
}
