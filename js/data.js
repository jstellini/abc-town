// Character data for ABC Town.
//
// `sound` is what the text-to-speech engine is asked to say for the letter's
// phonic sound. TTS engines are approximate here – tune these by ear on the
// iPad (e.g. try "a" vs "ah", "sss" vs "ss") and the change applies everywhere.
//
// `react` is the animation the character does when tapped in the town square.
// `tag` is the little symbol shown in its bubble while reacting.

const LETTER_COLORS = ['#ff3b3b', '#ff8a00', '#ffc400', '#3ecf3e', '#2196f3', '#8e44ff', '#ff4fa3'];

const CHARACTERS = [
  { letter: 'A', name: 'Apple',        file: 'apple',       sound: 'ah',   react: 'spin',      tag: '⭐' },
  { letter: 'B', name: 'Banana',       file: 'banana',      sound: 'buh',  react: 'slip',      tag: '🍌' },
  { letter: 'C', name: 'Cookie',       file: 'cookie',      sound: 'kuh',  react: 'dash',      tag: '🍪' },
  { letter: 'D', name: 'Drum',         file: 'drum',        sound: 'duh',  react: 'drum',      tag: '🥁' },
  { letter: 'E', name: 'Egg',          file: 'egg',         sound: 'eh',   react: 'cartwheel', tag: '💥' },
  { letter: 'F', name: 'Flower',       file: 'flower',      sound: 'fff',  react: 'wiggle',    tag: '🌸' },
  { letter: 'G', name: 'Glasses',      file: 'glasses',     sound: 'guh',  react: 'look',      tag: '🔍' },
  { letter: 'H', name: 'Hat',          file: 'hat',         sound: 'huh',  react: 'nod' ,      tag: '🎩' },
  { letter: 'I', name: 'Ice Cream',    file: 'icecream',    sound: 'ih',   react: 'sprinkle',  tag: '🍒' },
  { letter: 'J', name: 'Jam Jar',      file: 'jamjar',      sound: 'juh',  react: 'hug',       tag: '💕' },
  { letter: 'K', name: 'Key',          file: 'key',         sound: 'kuh',  react: 'nod',       tag: '💡' },
  { letter: 'L', name: 'Lollipop',     file: 'lollipop',    sound: 'lll',  react: 'dance',     tag: '🎵' },
  { letter: 'M', name: 'Mug',          file: 'mug',         sound: 'mmm',  react: 'sleep',     tag: '💤' },
  { letter: 'N', name: 'Nest',         file: 'nest',        sound: 'nnn',  react: 'hug',       tag: '🐣' },
  { letter: 'O', name: 'Octopus',      file: 'octopus',     sound: 'oh',   react: 'wiggle',    tag: '🌀' },
  { letter: 'P', name: 'Potato',       file: 'potato',      sound: 'puh',  react: 'snore',     tag: '💤' },
  { letter: 'Q', name: 'Queen',        file: 'queen',       sound: 'kwuh', react: 'nod',       tag: '👑' },
  { letter: 'R', name: 'Robot',        file: 'robot',       sound: 'rrr',  react: 'robot',     tag: '⚙️' },
  { letter: 'S', name: 'Sun',          file: 'sun',         sound: 'sss',  react: 'glow',      tag: '✨' },
  { letter: 'T', name: 'Toaster',      file: 'toaster',     sound: 'tuh',  react: 'jump',      tag: '🍞' },
  { letter: 'U', name: 'Umbrella',     file: 'umbrella',    sound: 'uh',   react: 'rain',      tag: '☔' },
  { letter: 'V', name: 'Volcano',      file: 'volcano',     sound: 'vvv',  react: 'rumble',      tag: '🔥' },
  { letter: 'W', name: 'Water Bottle', file: 'waterbottle', sound: 'wuh',  react: 'dance',     tag: '💧' },
  { letter: 'X', name: 'Xylophone',    file: 'xylophone',   sound: 'ks',   react: 'music',     tag: '🎶' },
  { letter: 'Y', name: 'Yo-yo',        file: 'yoyo',        sound: 'yuh',  react: 'boomerang', tag: '🪀' },
  { letter: 'Z', name: 'Zipper',       file: 'zipper',      sound: 'zzz',  react: 'zip',       tag: '⚡' },
];

CHARACTERS.forEach((c, i) => { c.color = LETTER_COLORS[i % LETTER_COLORS.length]; c.img = `assets/characters/${c.file}.svg`; });

const CHAR_BY_LETTER = Object.fromEntries(CHARACTERS.map(c => [c.letter, c]));
const ALL_LETTERS = CHARACTERS.map(c => c.letter);

// Build-a-Letter pieces: each uppercase letter as 2–4 chunky strokes (SVG path
// data in a 100×100 box, drawn with a thick round-capped stroke). Adding or
// splitting a stroke here changes how many pieces the child assembles.
const LETTER_STROKES = {
  A: ['M20 90 L50 12', 'M50 12 L80 90', 'M32 62 H68'],
  B: ['M25 12 V90', 'M25 12 H54 A19 19 0 0 1 54 50 H25', 'M25 50 H58 A20 20 0 0 1 58 90 H25'],
  C: ['M78 29 A34 34 0 0 0 18 51', 'M18 51 A34 34 0 0 0 78 73'],
  D: ['M25 12 V90', 'M25 12 H46 A39 39 0 0 1 46 90 H25'],
  E: ['M25 12 V90', 'M25 12 H78', 'M25 51 H68', 'M25 90 H78'],
  F: ['M25 12 V90', 'M25 12 H78', 'M25 51 H66'],
  G: ['M78 29 A34 34 0 0 0 18 51', 'M18 51 A34 34 0 0 0 81 68', 'M82 69 V52 H54'],
  H: ['M22 12 V90', 'M78 12 V90', 'M22 51 H78'],
  I: ['M50 12 V90', 'M28 12 H72', 'M28 90 H72'],
  J: ['M62 12 V68', 'M62 68 A20 20 0 0 1 22 68', 'M36 12 H84'],
  K: ['M25 12 V90', 'M74 12 L28 55', 'M42 44 L78 90'],
  L: ['M25 12 V90', 'M25 90 H78'],
  M: ['M18 90 V12', 'M18 12 L50 62', 'M50 62 L82 12', 'M82 12 V90'],
  N: ['M22 90 V12', 'M22 12 L78 90', 'M78 90 V12'],
  O: ['M16 51 A34 34 0 0 1 84 51', 'M84 51 A34 34 0 0 1 16 51'],
  P: ['M25 12 V90', 'M25 12 H56 A20 20 0 0 1 56 54 H25'],
  Q: ['M16 51 A34 34 0 0 1 84 51', 'M84 51 A34 34 0 0 1 16 51', 'M62 66 L86 92'],
  R: ['M25 12 V90', 'M25 12 H56 A20 20 0 0 1 56 54 H25', 'M50 54 L78 90'],
  S: ['M74 24 A21 19 0 1 0 50 51', 'M50 51 A21 19 0 1 1 26 78'],
  T: ['M50 12 V90', 'M20 12 H80'],
  U: ['M22 12 V58', 'M22 58 A28 28 0 0 0 78 58', 'M78 58 V12'],
  V: ['M20 12 L50 90', 'M50 90 L80 12'],
  W: ['M14 12 L32 90', 'M32 90 L50 32', 'M50 32 L68 90', 'M68 90 L86 12'],
  X: ['M22 12 L78 90', 'M78 12 L22 90'],
  Y: ['M22 12 L50 52', 'M78 12 L50 52', 'M50 52 V90'],
  Z: ['M22 12 H78', 'M78 12 L22 90', 'M22 90 H78'],
};
