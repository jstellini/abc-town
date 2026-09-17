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
  { letter: 'C', name: 'Cookie',       file: 'cookie',      sound: 'kuh',  react: 'hop',       tag: '🍪' },
  { letter: 'D', name: 'Drum',         file: 'drum',        sound: 'duh',  react: 'drum',      tag: '🥁' },
  { letter: 'E', name: 'Egg',          file: 'egg',         sound: 'eh',   react: 'cartwheel', tag: '💥' },
  { letter: 'F', name: 'Flower',       file: 'flower',      sound: 'fff',  react: 'wiggle',    tag: '🌸' },
  { letter: 'G', name: 'Glasses',      file: 'glasses',     sound: 'guh',  react: 'look',      tag: '🔍' },
  { letter: 'H', name: 'Hat',          file: 'hat',         sound: 'huh',  react: 'nod' ,      tag: '🎩' },
  { letter: 'I', name: 'Ice Cream',    file: 'icecream',    sound: 'ih',   react: 'sprinkle',  tag: '🍒' },
  { letter: 'J', name: 'Jam Jar',      file: 'jamjar',      sound: 'juh',  react: 'hug',       tag: '💕' },
  { letter: 'K', name: 'Key',          file: 'key',         sound: 'kuh',  react: 'nod',       tag: '💡' },
  { letter: 'L', name: 'Lollipop',     file: 'lollipop',    sound: 'lll',  react: 'dance',     tag: '🎵' },
  { letter: 'M', name: 'Moon',         file: 'moon',        sound: 'mmm',  react: 'sleep',     tag: '💤' },
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
  { letter: 'Y', name: 'Yo-yo',        file: 'yoyo',        sound: 'yuh',  react: 'sway',      tag: '🪀' },
  { letter: 'Z', name: 'Zipper',       file: 'zipper',      sound: 'zzz',  react: 'zip',       tag: '⚡' },
];

CHARACTERS.forEach((c, i) => { c.color = LETTER_COLORS[i % LETTER_COLORS.length]; c.img = `assets/characters/${c.file}.svg`; });

const CHAR_BY_LETTER = Object.fromEntries(CHARACTERS.map(c => [c.letter, c]));
const ALL_LETTERS = CHARACTERS.map(c => c.letter);

// Build-a-Letter pieces: each letter as 2–4 chunky strokes (SVG path data in a
// 100×100 box, drawn with a thick round-capped stroke). Adding or splitting a
// stroke here changes how many pieces the child assembles.
//
// Uppercase sits between y=12 (cap top) and y=90 (baseline).
// Lowercase uses its own metrics, so every lowercase letter lines up with the
// others: y=10 ascender top, y=42 x-height top, y=80 baseline, y=94 descender
// bottom. Round letters are r=19 about y=61, the middle of the x-height band.
// Lowercase strokes are drawn a little thinner (see `.build.lower` in the CSS),
// since the same width across a 38-tall x-height would swallow the letter.
const LETTER_STROKES = {
  A: ['M20 90 L50 12', 'M50 12 L80 90', 'M32 62 H68'],
  B: ['M25 12 V90', 'M25 12 H58.5 A19.5 19.5 0 0 1 58.5 51 H25', 'M25 51 H58.5 A19.5 19.5 0 0 1 58.5 90 H25'],
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

  // Single-storey a and g – the shapes children are taught to write, and the
  // ones the Andika letter font draws.
  a: ['M63 61 A19 19 0 1 1 25 61 A19 19 0 1 1 63 61', 'M63 42 V80'],
  b: ['M33 10 V80', 'M33 61 A19 19 0 1 1 71 61 A19 19 0 1 1 33 61'],
  c: ['M64.5 48.7 A19 19 0 0 0 31 61', 'M31 61 A19 19 0 0 0 64.5 73.3'],
  d: ['M67 61 A19 19 0 1 1 29 61 A19 19 0 1 1 67 61', 'M67 10 V80'],
  e: ['M31 61 H69', 'M69 61 A19 19 0 1 0 58 78'],
  f: ['M68 15 Q54 13 54 30 V80', 'M32 42 H70'],
  g: ['M67 61 A19 19 0 1 1 29 61 A19 19 0 1 1 67 61', 'M67 42 V82 Q67 94 49 93'],
  h: ['M33 10 V80', 'M33 58 A17 17 0 0 1 67 58 V80'],
  i: ['M50 23 V25', 'M50 42 V80'],
  j: ['M56 23 V25', 'M56 42 V82 Q56 94 38 93'],
  k: ['M33 10 V80', 'M68 42 L38 64', 'M48 57 L70 80'],
  // A plain stem, split in two so there is still something to assemble. The
  // halves are the same shape, so either piece snaps into either slot.
  l: ['M50 10 V45', 'M50 45 V80'],
  m: ['M28 42 V80', 'M28 56 A12 12 0 0 1 52 56 V80', 'M52 56 A12 12 0 0 1 76 56 V80'],
  n: ['M33 42 V80', 'M33 58 A17 17 0 0 1 67 58 V80'],
  o: ['M31 61 A19 19 0 0 1 69 61', 'M69 61 A19 19 0 0 1 31 61'],
  p: ['M33 42 V94', 'M33 61 A19 19 0 1 1 71 61 A19 19 0 1 1 33 61'],
  q: ['M67 61 A19 19 0 1 1 29 61 A19 19 0 1 1 67 61', 'M67 42 V94'],
  r: ['M36 42 V80', 'M36 56 A20 20 0 0 1 64 47'],
  s: ['M62 46 A14 11 0 1 0 50 61', 'M50 61 A14 11 0 1 1 38 76'],
  t: ['M46 26 V80', 'M30 42 H68'],
  u: ['M33 42 V64', 'M33 64 A17 17 0 0 0 67 64', 'M67 42 V80'],
  v: ['M32 42 L50 80', 'M50 80 L68 42'],
  w: ['M24 42 L38 80', 'M38 80 L50 50', 'M50 50 L62 80', 'M62 80 L76 42'],
  x: ['M32 42 L68 80', 'M68 42 L32 80'],
  y: ['M32 42 L52 80', 'M68 42 L44 94'],
  z: ['M32 42 H68', 'M68 42 L32 80', 'M32 80 H68'],
};

// Three-letter words the town train spells out on its carriages (see Town startTrain).
// Each has a "word-<word>" voice clip; tools/generate_voice.py reads this list.
const TRAIN_WORDS = [
  'cat', 'dog', 'sun', 'hat', 'bus', 'cup', 'pig', 'bed', 'box', 'jam', 'key', 'egg', 'fox', 'hen',
  'bug', 'van', 'map', 'mud', 'pen', 'zip', 'yak', 'web', 'kid', 'jet', 'owl', 'ant', 'toy', 'car',
  'cow', 'bat', 'log', 'nut', 'red', 'fan', 'lip', 'tub', 'wig', 'zoo', 'six', 'vet', 'ice', 'arm',
  'leg', 'hug', 'mop', 'pot', 'bee', 'sea', 'sky', 'run',
];

// Picture words for Word Town's Finish-the-word: a word and the picture that
// gives it away. The game hides the word's first letter and shows the picture, so
// a word only earns its place here if a three-year-old can name it from the
// picture alone – and the emoji has to be old enough for the iPad's iOS.
// Each word needs a "word-<word>" voice clip, so after adding one run
// `python tools/generate_voice.py --missing` (the script reads this list as well
// as TRAIN_WORDS).
const PICTURE_WORDS = [
  { word: 'ant',    pic: '🐜' }, { word: 'arm',    pic: '💪' }, { word: 'bat',    pic: '🦇' },
  { word: 'bed',    pic: '🛏️' }, { word: 'bee',    pic: '🐝' }, { word: 'box',    pic: '📦' },
  { word: 'bug',    pic: '🐛' }, { word: 'bus',    pic: '🚌' }, { word: 'car',    pic: '🚗' },
  { word: 'cat',    pic: '🐱' }, { word: 'cow',    pic: '🐄' }, { word: 'cup',    pic: '🥤' },
  { word: 'dog',    pic: '🐶' }, { word: 'egg',    pic: '🥚' }, { word: 'fish',   pic: '🐟' },
  { word: 'five',   pic: '5️⃣' }, { word: 'fox',    pic: '🦊' }, { word: 'frog',   pic: '🐸' },
  { word: 'goat',   pic: '🐐' }, { word: 'hat',    pic: '🎩' }, { word: 'hen',    pic: '🐔' },
  { word: 'ice',    pic: '🧊' }, { word: 'jam',    pic: '🍯' }, { word: 'jet',    pic: '✈️' },
  { word: 'key',    pic: '🔑' }, { word: 'kid',    pic: '🧒' }, { word: 'leaf',   pic: '🍃' },
  { word: 'leg',    pic: '🦵' }, { word: 'lip',    pic: '👄' }, { word: 'map',    pic: '🗺️' },
  { word: 'nut',    pic: '🥜' }, { word: 'owl',    pic: '🦉' }, { word: 'pen',    pic: '🖊️' },
  { word: 'pig',    pic: '🐷' }, { word: 'pot',    pic: '🍲' }, { word: 'quack',  pic: '🦆' },
  { word: 'queen',  pic: '👑' }, { word: 'ring',   pic: '💍' }, { word: 'sea',    pic: '🌊' },
  { word: 'six',    pic: '6️⃣' }, { word: 'sky',    pic: '🌤️' }, { word: 'sun',    pic: '☀️' },
  { word: 'toy',    pic: '🧸' }, { word: 'tub',    pic: '🛁' }, { word: 'van',    pic: '🚐' },
  { word: 'web',    pic: '🕸️' }, { word: 'zip',    pic: '🤐' }, { word: 'zoo',    pic: '🦁' },
];
