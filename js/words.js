// Word Town: a hub of word games, unlocked once all 26 characters are collected.
//
// These games are about SETS of characters rather than one target letter, so they
// live here rather than being bent into Games.play(type, ch, onDone).
//
// Everything here is framed as SPELLING – "which name starts with the letter A" –
// never as sound. Three characters would make a sound-framed question wrong:
// Xylophone starts with X but says /z/, Ice Cream is a long i rather than the
// short 'ih' the letter game teaches, and Queen is 'kwuh'. For the same reason no
// game here plays a {L}-intro clip, which carries the phonic sound.

const Words = (() => {
  let active = null;

  const $ = s => document.querySelector(s);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const centre = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  const replay = (node, cls) => { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); };

  // The hub. Adding a game is one entry here plus its function.
  const GAMES = [
    { id: 'starts', title: 'Who starts with…?', icon: '🔤', make: startsGame },
  ];

  function openHub() {
    const menu = $('#words-menu');
    menu.innerHTML = '';
    GAMES.forEach((g, i) => {
      const b = document.createElement('button');
      b.className = 'word-tile';
      b.innerHTML = `<span class="word-tile-icon">${g.icon}</span><span class="word-tile-title">${g.title}</span>`;
      b.style.animationDelay = (i * 60) + 'ms';
      b.addEventListener('click', () => { Sfx.tap(); play(g.id); });
      menu.appendChild(b);
    });
    setTimeout(() => Voice.say('Welcome to Word Town! Pick a game!', { key: 'words-hub' }), 250);
  }

  function play(id) {
    const game = GAMES.find(g => g.id === id);
    if (!game) return;
    stop();
    App.show('wordgame');
    active = game.make(() => { active = null; App.show('words'); });
  }

  function stop() {
    if (active) { active.stop(); active = null; }
    $('#word-area').innerHTML = '';
  }

  function setStars(n, total) {
    $('#word-stars').innerHTML = Array.from({ length: total }, (_, i) => `<span class="star${i < n ? ' on' : ''}">★</span>`).join('');
  }
  function setTarget(letter, color) {
    const t = $('#word-target'), label = Case.label(letter);
    t.textContent = label;
    t.classList.toggle('two', label.length > 1);
    t.style.setProperty('--c', color);
    replay(t, 'pulse');
  }

  // Xylophone says /z/, so it and Zipper are an unfair pair to put side by side.
  const CLASH = { X: 'Z', Z: 'X' };
  // The lineup: the answer plus n-1 wrong friends. Same-sounding letters (C/K) and
  // the X/Z pair are kept apart – the question is about spelling, but a child
  // reasoning by ear shouldn't be punished for it.
  function lineup(target, n) {
    const others = CHARACTERS.filter(c => c.letter !== target.letter && App.isUnlocked(c.letter));
    const kind = others.filter(c => c.sound !== target.sound && CLASH[c.letter] !== target.letter && CLASH[target.letter] !== c.letter);
    const pool = kind.length >= n - 1 ? kind : others;
    return shuffle([target, ...shuffle(pool.slice()).slice(0, n - 1)]);
  }

  // ---------- Game 1: Who starts with A? ----------
  // A lineup of friends; tap the one whose NAME starts with the target letter.
  function startsGame(onDone) {
    const ROUNDS = 4;
    const el = $('#word-area');
    const pool = CHARACTERS.filter(c => App.isUnlocked(c.letter));
    const targets = shuffle(pool.slice()).slice(0, ROUNDS);
    let round = 0, running = true, timer = 0;

    function ask() {
      const target = targets[round];
      const cards = lineup(target, round === 0 ? 3 : 4);
      let wrong = 0;
      $('#word-prompt').textContent = 'Who starts with';
      setTarget(target.letter, target.color);
      setStars(round, ROUNDS);
      const say = () => Voice.say(`Which name starts with the letter ${target.letter}?`, { key: `${target.letter}-starts` });
      say();
      $('#word-target').onclick = say;

      el.className = 'word-area';
      el.innerHTML = '';
      cards.forEach((c, i) => {
        const b = document.createElement('button');
        b.className = 'word-card';
        b.style.setProperty('--c', c.color);
        b.style.animationDelay = (i * 90) + 'ms';
        b.innerHTML = `<img src="${c.img}" alt="${c.name}" draggable="false"><span class="word-name">${c.name}</span>`;
        b.addEventListener('pointerdown', e => { e.preventDefault(); tap(c, b); });
        el.appendChild(b);
      });

      function tap(c, node) {
        if (!running || el.classList.contains('settled')) return;
        if (c.letter === target.letter) {
          el.classList.add('settled');
          node.classList.add('right');
          Array.from(el.children).forEach(n => { if (n !== node) n.classList.add('dim'); });
          Sfx.correct(); Sfx.sparkle();
          const p = centre(node); Fx.burst(p.x, p.y, c.color, 20);
          setStars(round + 1, ROUNDS);
          // "A is for Apple!" – an existing clip, and a spelling claim, so it is
          // true for every letter including X, I and Q.
          Voice.say(`${c.letter} is for ${c.name}!`, { key: `${c.letter}-reveal` });
          round++;
          timer = setTimeout(() => { if (running) (round >= ROUNDS ? win() : ask()); }, 1900);
        } else {
          wrong++;
          Sfx.boing();
          replay(node, 'wobble');
          if (wrong === 1) Voice.say('Not quite. Try again!', { key: 'words-try' });
          // Same forgiving idiom as the letter games: after two misses, show them.
          if (wrong >= 2) Array.from(el.children).forEach((n, i) => { if (cards[i].letter === target.letter) n.classList.add('hint'); });
        }
      }
    }

    function win() {
      running = false;
      el.className = 'word-area done';
      el.innerHTML = '';
      $('#word-prompt').textContent = 'Word Town';
      Sfx.fanfare(); Fx.confetti(70);
      setTimeout(() => Fx.confetti(50), 600);
      Voice.say('Brilliant! You did it!', { key: 'words-done' });
      timer = setTimeout(onDone, 2400);
    }

    ask();
    return { stop() { running = false; clearTimeout(timer); $('#word-target').onclick = null; } };
  }

  return { GAMES, openHub, play, stop };
})();
