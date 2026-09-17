// Which form of a letter the minigames show.
//   upper  A only          – where a new player starts
//   lower  a only          – the same games, lowercase
//   mixed  both at once    – the hard tier: the child has to treat A and a as
//                            one letter, matching either against the target.
//
// Every game still tracks its target as the uppercase letter and speaks the
// uppercase voice keys ("Find the letter A" sounds the same either way); only
// the drawn glyph and the sameness test change.

const Case = (() => {
  const MODES = ['upper', 'lower', 'mixed'];
  let mode = 'upper';

  // One display form. Mixed flips a coin, so a stream of spawns (pop, monster)
  // shows both forms on its own.
  function glyph(letter) {
    const u = letter.toUpperCase();
    return (mode === 'lower' || (mode === 'mixed' && Math.random() < 0.5)) ? u.toLowerCase() : u;
  }

  // `n` display forms of the same letter. Mixed splits them evenly instead of
  // flipping n coins, so a round of four targets is never secretly all one case.
  function glyphs(letter, n) {
    const u = letter.toUpperCase(), l = u.toLowerCase();
    if (mode === 'upper') return Array(n).fill(u);
    if (mode === 'lower') return Array(n).fill(l);
    const half = Math.floor(n / 2);
    const out = [...Array(half).fill(u), ...Array(n - half).fill(l)];
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  }

  // The whole point of mixed mode: A and a are the same letter.
  const same = (a, b) => a.toUpperCase() === b.toUpperCase();

  return {
    modes: MODES,
    get: () => mode,
    set(m) { if (MODES.includes(m)) mode = m; },
    glyph, glyphs, same,

    // What a "this is what you're looking for" marker shows: 'A', 'a' or 'Aa'.
    label(letter) {
      const u = letter.toUpperCase();
      return mode === 'upper' ? u : mode === 'lower' ? u.toLowerCase() : u + u.toLowerCase();
    },
    // The same thing inside a sentence: "A's", "a's", "A's and a's".
    phrase(letter) {
      const u = letter.toUpperCase(), l = u.toLowerCase();
      return mode === 'upper' ? `${u}'s` : mode === 'lower' ? `${l}'s` : `${u}'s and ${l}'s`;
    },
  };
})();
