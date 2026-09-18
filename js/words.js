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
    { id: 'build', title: 'Build the word', icon: '🧩', make: buildWordGame },
    { id: 'make', title: 'Make a word', icon: '✏️', make: makeWordGame },
    { id: 'basket', title: 'Which basket?', icon: '🧺', make: basketGame },
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
    // Reset the header card here rather than in each game, so one game can't
    // leave its styling behind for the next.
    const t = $('#word-target');
    t.className = 'target-card';
    t.onclick = null;
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

  // ---------- Game 2: Build the word ----------
  // A picture and its word: three slots ghosting the word, and a tray of letter
  // tiles. Tap a tile and it flies into the next empty slot.
  //
  // The picture is the point of the round – it says which word this is without
  // the child having to read the ghosts or hold the spoken word in their head,
  // and it is still there to look at halfway through. So the words come from the
  // three-letter PICTURE_WORDS rather than all of TRAIN_WORDS.
  //
  // Every clip this game speaks already exists: {L}-tick for each letter as it
  // lands and word-<word> for the finished word, the same pair the town train
  // says (Town.startTrain). Only the "Build the word!" prompt is new.
  function buildWordGame(onDone) {
    const ROUNDS = 3;
    const el = $('#word-area');
    const words = shuffle(PICTURE_WORDS.filter(p => p.word.length === 3)).slice(0, ROUNDS);
    let round = 0, running = true, timers = [];
    // Voice.say shares one Audio element and pauses whatever is playing, so
    // every delayed line goes through here and is cancelled together.
    const later = (fn, ms) => { const t = setTimeout(() => { if (running) fn(); }, ms); timers.push(t); return t; };
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

    function ask() {
      const { word, pic } = words[round];
      const letters = [...word.toUpperCase()];
      // Words are written lowercase, so a mixed-mode ghost never reads "cAt" –
      // the mixing happens in the tray, and Case.same decides what fits.
      const ghosts = Case.get() === 'mixed' ? letters.map(L => L.toLowerCase()) : letters.map(L => Case.glyph(L));
      // A distractor sharing a letter with the word would be silently correct.
      const spare = shuffle(ALL_LETTERS.filter(L => !letters.includes(L))).slice(0, 2);
      const all = [...letters, ...spare];
      // Case.glyphs gives the mode's own even upper/lower split; we want that
      // pattern, applied to each tile's own letter.
      const lower = Case.glyphs('A', all.length).map(g => g === 'a');
      const tray = shuffle(all.map((L, i) => ({ letter: L, glyph: lower[i] ? L.toLowerCase() : L, spent: false })));

      let next = 0, wrong = 0, busy = false;
      $('#word-prompt').textContent = 'Build the word';
      setStars(round, ROUNDS);
      const card = $('#word-target');
      card.className = 'target-card word';
      card.textContent = ghosts.join('');
      card.style.setProperty('--c', CHAR_BY_LETTER[letters[0]].color);
      replay(card, 'pulse');
      // A three-year-old can't read the ghosts, so the word itself has to be
      // said – the prompt alone doesn't state the task.
      const say = () => { Voice.say('Build the word!', { key: 'words-build' }); later(() => Voice.say(`${word}!`, { key: `word-${word}` }), 1200); };
      card.onclick = say;
      say();

      el.className = 'word-area build';
      el.innerHTML = `<div class="word-pic">${pic}</div>
        <div class="word-slots">${ghosts.map((g, i) => `<div class="wslot${i === 0 ? ' next' : ''}"><span class="wghost">${g}</span></div>`).join('')}</div>
        <div class="word-tray"></div>`;
      const slots = Array.from(el.querySelectorAll('.wslot'));
      const trayEl = el.querySelector('.word-tray');
      // Tapping the picture is how a child asks "what is it again?".
      el.querySelector('.word-pic').addEventListener('pointerdown', e => { e.preventDefault(); Sfx.tap(); Voice.say(`${word}!`, { key: `word-${word}` }); });

      tray.forEach((tile, i) => {
        const b = document.createElement('button');
        b.className = 'wtile';
        b.textContent = tile.glyph;
        b.style.setProperty('--c', CHAR_BY_LETTER[tile.letter].color);
        b.style.animationDelay = (i * 70) + 'ms';
        b.addEventListener('pointerdown', e => { e.preventDefault(); tap(tile, b); });
        tile.el = b;
        trayEl.appendChild(b);
      });

      function tap(tile, node) {
        // next >= slots.length once the word is finished: the leftover tiles stay
        // on screen for a couple of seconds and a child will absolutely tap them.
        if (!running || busy || tile.spent || next >= slots.length) return;
        if (Case.same(tile.glyph, ghosts[next])) { place(tile, node); return; }
        // A letter that IS in the word, just not this slot, isn't really a
        // mistake – nudge the cursor rather than counting it against them.
        if (letters.includes(tile.letter)) { replay(slots[next], 'nudge'); return; }
        wrong++;
        Sfx.boing();
        replay(node, 'wobble');
        if (wrong === 1) Voice.say('Not quite. Try again!', { key: 'words-try' });
        if (wrong >= 2) tray.forEach(t => { if (!t.spent && Case.same(t.glyph, ghosts[next])) t.el.classList.add('hint'); });
      }

      function place(tile, node) {
        busy = true;
        tile.spent = true;
        const slot = slots[next];
        // Fly the tile to its slot, then let the slot's own glyph show through –
        // the finished word always reads cleanly, whichever case was tapped.
        const from = node.getBoundingClientRect(), to = slot.getBoundingClientRect();
        const fly = node.cloneNode(true);
        fly.className = 'wtile wfly';
        fly.style.setProperty('--c', node.style.getPropertyValue('--c'));
        fly.style.left = from.left + 'px'; fly.style.top = from.top + 'px';
        fly.style.width = from.width + 'px'; fly.style.height = from.height + 'px';
        document.body.appendChild(fly);
        node.classList.add('spent');
        tray.forEach(t => t.el.classList.remove('hint'));
        requestAnimationFrame(() => {
          fly.style.transform = `translate(${to.left + to.width / 2 - from.left - from.width / 2}px,${to.top + to.height / 2 - from.top - from.height / 2}px) scale(${to.height / from.height})`;
        });
        later(() => {
          fly.remove();
          slot.classList.add('filled');
          slot.classList.remove('next');
          slot.style.setProperty('--c', CHAR_BY_LETTER[tile.letter].color);
          Sfx.click(); Sfx.sparkle();
          Voice.say(`${tile.letter}!`, { key: `${tile.letter}-tick` });
          next++;
          busy = false;
          if (next < slots.length) { slots[next].classList.add('next'); return; }
          solved();
        }, 360);
      }

      function solved() {
        el.classList.add('done');
        Sfx.correct();
        const r = el.querySelector('.word-slots').getBoundingClientRect();
        Fx.burst(r.left + r.width / 2, r.top + r.height / 2, CHAR_BY_LETTER[letters[0]].color, 26);
        setStars(round + 1, ROUNDS);
        // After the last {L}-tick, not racing it – they share one Audio element.
        later(() => Voice.say(`${word}!`, { key: `word-${word}` }), 700);
        round++;
        later(() => (round >= ROUNDS ? win() : ask()), 2600);
      }
    }

    function win() {
      el.className = 'word-area done';
      el.innerHTML = '';
      $('#word-prompt').textContent = 'Word Town';
      Sfx.fanfare(); Fx.confetti(70);
      timers.push(setTimeout(() => Fx.confetti(50), 600));
      Voice.say('Brilliant! You did it!', { key: 'words-done' });
      // Tracked, not a bare setTimeout: backing out mid-fanfare must not then
      // bounce the child to the hub from a game they already left.
      timers.push(setTimeout(() => { running = false; onDone(); }, 2400));
    }

    ask();
    return { stop() { running = false; clearTimers(); document.querySelectorAll('.wfly').forEach(n => n.remove()); } };
  }

  // Every picture word by name, for the games that show one.
  const PIC = Object.fromEntries(PICTURE_WORDS.map(p => [p.word, p.pic]));

  // ---------- Game 3: Make a word ----------
  // A word family: "at" waits in the middle with a rack of front letters under
  // it. Tap one, it snaps on, the picture lands on the shelf and the voice says
  // the new word – cat, hat, bat.
  //
  // Unlike the other three this is a machine to play with rather than a question
  // to get right: every tile in the rack makes a real word, so there is nothing
  // to get wrong, and the skill – swapping the sound on the front of a word you
  // already know – is the one that actually starts children reading.
  //
  // Which is why WORD_FAMILIES has to hold real words with pictures and clips:
  // a made-up word would have nothing to show and nothing to say.
  function makeWordGame(onDone) {
    const FAMILIES = 2;
    const el = $('#word-area');
    const families = shuffle(WORD_FAMILIES.slice()).slice(0, FAMILIES);
    const TOTAL = families.reduce((n, f) => n + f.starts.length, 0);
    let family = 0, made = 0, running = true, timers = [];
    const later = (fn, ms) => { const t = setTimeout(() => { if (running) fn(); }, ms); timers.push(t); return t; };
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

    function ask() {
      const { rime, starts } = families[family];
      const words = starts.map(s => s + rime);
      // Words are written lowercase, so mixed mode keeps the word lowercase and
      // mixes the case of the RACK instead – the same rule Build-the-word uses.
      const show = c => (Case.get() === 'mixed' ? c.toLowerCase() : Case.glyph(c.toUpperCase()));
      const rimeGlyphs = [...rime].map(show);
      const lower = Case.glyphs('A', starts.length).map(g => g === 'a');
      const rack = starts.map((c, i) => ({ letter: c.toUpperCase(), word: c + rime, glyph: lower[i] ? c : c.toUpperCase(), made: false }));

      let done = 0, busy = false;
      $('#word-prompt').textContent = 'Make a word';
      setStars(made, TOTAL);
      const card = $('#word-target');
      card.className = 'target-card word';
      card.textContent = '_' + rimeGlyphs.join('');
      card.style.setProperty('--c', '#ff8a00');
      replay(card, 'pulse');
      const say = () => Voice.say('Make a word! Tap a letter!', { key: 'words-make' });
      card.onclick = say;
      say();

      el.className = 'word-area make';
      el.innerHTML = `<div class="word-shelf">${words.map(() => '<div class="shelf-frame"></div>').join('')}</div>
        <div class="word-slots">
          <div class="wslot gap next"></div>
          ${rimeGlyphs.map(g => `<div class="wslot given"><span class="wghost">${g}</span></div>`).join('')}
        </div>
        <div class="word-tray"></div>`;
      const shelf = Array.from(el.querySelectorAll('.shelf-frame'));
      const gap = el.querySelector('.wslot.gap'), trayEl = el.querySelector('.word-tray');

      rack.forEach((tile, i) => {
        const b = document.createElement('button');
        b.className = 'wtile';
        b.textContent = tile.glyph;
        b.style.setProperty('--c', CHAR_BY_LETTER[tile.letter].color);
        b.style.animationDelay = (i * 70) + 'ms';
        b.addEventListener('pointerdown', e => { e.preventDefault(); tap(tile, b); });
        tile.el = b;
        trayEl.appendChild(b);
      });

      function tap(tile, node) {
        if (!running || busy) return;
        // A letter already used just says its word again: tapping the one you
        // liked twice is playing with it, not a mistake.
        if (tile.made) { Sfx.tap(); Voice.say(`${tile.word}!`, { key: `word-${tile.word}` }); return; }
        busy = true;
        tile.made = true;
        const from = node.getBoundingClientRect(), to = gap.getBoundingClientRect();
        const fly = node.cloneNode(true);
        fly.className = 'wtile wfly';
        fly.style.setProperty('--c', node.style.getPropertyValue('--c'));
        fly.style.left = from.left + 'px'; fly.style.top = from.top + 'px';
        fly.style.width = from.width + 'px'; fly.style.height = from.height + 'px';
        document.body.appendChild(fly);
        node.classList.add('used');
        requestAnimationFrame(() => {
          fly.style.transform = `translate(${to.left + to.width / 2 - from.left - from.width / 2}px,${to.top + to.height / 2 - from.top - from.height / 2}px) scale(${to.height / from.height})`;
        });
        later(() => {
          fly.remove();
          gap.className = 'wslot filled';
          gap.style.setProperty('--c', CHAR_BY_LETTER[tile.letter].color);
          gap.innerHTML = `<span class="wghost">${show(tile.letter)}</span>`;
          Sfx.click();
          Voice.say(`${tile.word}!`, { key: `word-${tile.word}` });
          // The picture lands on the shelf in the order the words were made, so
          // the shelf reads as a collection rather than a score.
          const frame = shelf[done];
          frame.textContent = PIC[tile.word] || '⭐';
          frame.classList.add('full');
          const c = centre(frame); Fx.burst(c.x, c.y, CHAR_BY_LETTER[tile.letter].color, 16);
          Sfx.sparkle();
          made++; done++;
          setStars(made, TOTAL);
          if (done >= words.length) { finished(); return; }
          // Empty the slot again: the machine is ready for the next letter.
          later(() => {
            gap.className = 'wslot gap next';
            gap.innerHTML = '';
            gap.style.removeProperty('--c');
            busy = false;
          }, 1300);
        }, 360);
      }

      function finished() {
        el.classList.add('done');
        Sfx.fanfare();
        Fx.confetti(40);
        family++;
        later(() => (family >= families.length ? win() : ask()), 2400);
      }
    }

    function win() {
      el.className = 'word-area done';
      el.innerHTML = '';
      $('#word-prompt').textContent = 'Word Town';
      Sfx.fanfare(); Fx.confetti(70);
      timers.push(setTimeout(() => Fx.confetti(50), 600));
      Voice.say('Brilliant! You did it!', { key: 'words-done' });
      timers.push(setTimeout(() => { running = false; onDone(); }, 2400));
    }

    ask();
    return { stop() { running = false; clearTimers(); document.querySelectorAll('.wfly').forEach(n => n.remove()); } };
  }

  // ---------- Game 4: Which basket? ----------
  // Two baskets, each marked with a letter, and pictures to sort into them one at
  // a time. The lineup games ask "which of these is the answer"; this one hands
  // over a thing and asks where it belongs, and the baskets fill up as it goes.
  function basketGame(onDone) {
    const GOAL = 6;
    const el = $('#word-area');
    // Two letters with enough pictures between them, never two that sound alike:
    // "cat" and "key" both start with the same sound, and a child sorting by ear
    // would be right and marked wrong.
    const byLetter = {};
    PICTURE_WORDS.forEach(p => { (byLetter[p.word[0].toUpperCase()] = byLetter[p.word[0].toUpperCase()] || []).push(p); });
    const rich = Object.keys(byLetter).filter(L => byLetter[L].length >= GOAL / 2);
    const [a, b] = shuffle(rich.slice()).reduce((pairIn, L) => {
      if (pairIn.length === 2) return pairIn;
      // Not the same sound, and not the same colour either: the letter colours
      // repeat every seven letters, and two baskets in the same purple are one
      // basket as far as a three-year-old is concerned.
      const clash = pairIn.some(o => CHAR_BY_LETTER[o].sound === CHAR_BY_LETTER[L].sound
        || CHAR_BY_LETTER[o].color === CHAR_BY_LETTER[L].color || CLASH[o] === L);
      return clash ? pairIn : [...pairIn, L];
    }, []);
    const items = shuffle([
      ...shuffle(byLetter[a].slice()).slice(0, GOAL / 2).map(p => ({ ...p, letter: a })),
      ...shuffle(byLetter[b].slice()).slice(0, GOAL / 2).map(p => ({ ...p, letter: b })),
    ]);
    let round = 0, done = 0, running = true, timers = [];
    const later = (fn, ms) => { const t = setTimeout(() => { if (running) fn(); }, ms); timers.push(t); return t; };
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

    $('#word-prompt').textContent = 'Which basket?';
    const card = $('#word-target');
    card.className = 'target-card word';
    card.textContent = Case.label(a) + Case.label(b);
    card.style.setProperty('--c', CHAR_BY_LETTER[a].color);
    el.className = 'word-area sorting';
    el.innerHTML = `<div class="sort-stage"></div>
      <div class="sort-row">${[a, b].map(L => `<button class="sort-basket" data-l="${L}" style="--c:${CHAR_BY_LETTER[L].color}">
          <span class="sort-load"></span><span class="sort-letter">${Case.label(L)}</span>
        </button>`).join('')}</div>`;
    const stage = el.querySelector('.sort-stage');
    const baskets = Array.from(el.querySelectorAll('.sort-basket'));

    function ask() {
      const item = items[round];
      let wrong = 0, busy = false;
      setStars(done, GOAL);
      stage.innerHTML = `<div class="sort-item"><span>${item.pic}</span></div>`;
      const node = stage.querySelector('.sort-item');
      const say = () => Voice.say(`${item.word}!`, { key: `word-${item.word}` });
      card.onclick = say;
      later(say, 350);
      later(() => { if (round === 0) Voice.say('Which basket does it go in?', { key: 'words-basket' }); }, 1300);

      baskets.forEach(basket => {
        basket.onpointerdown = e => {
          e.preventDefault();
          if (!running || busy) return;
          if (basket.dataset.l !== item.letter) {
            wrong++;
            Sfx.boing();
            replay(basket, 'wobble');
            if (wrong === 1) Voice.say('Not quite. Try again!', { key: 'words-try' });
            if (wrong >= 2) baskets.forEach(o => o.classList.toggle('hint', o.dataset.l === item.letter));
            return;
          }
          busy = true;
          baskets.forEach(o => o.classList.remove('hint'));
          drop(node, basket, item);
        };
      });
    }

    function drop(node, basket, item) {
      const from = node.getBoundingClientRect(), to = basket.getBoundingClientRect();
      node.classList.add('flying');
      node.style.transform = `translate(${to.left + to.width / 2 - from.left - from.width / 2}px,${to.top + to.height * 0.35 - from.top - from.height / 2}px) scale(.45)`;
      Sfx.whoosh();
      later(() => {
        node.remove();
        const load = basket.querySelector('.sort-load');
        const bit = document.createElement('span');
        bit.textContent = item.pic;
        bit.style.setProperty('--rot', (Math.random() * 24 - 12).toFixed(1) + 'deg');
        load.appendChild(bit);
        replay(basket, 'catch');
        Sfx.click(); Sfx.sparkle();
        const c = centre(basket); Fx.burst(c.x, c.y - to.height * 0.2, CHAR_BY_LETTER[item.letter].color, 16);
        done++; round++;
        setStars(done, GOAL);
        later(() => (done >= GOAL ? win() : ask()), 900);
      }, 420);
    }

    function win() {
      el.className = 'word-area done';
      el.innerHTML = '';
      $('#word-prompt').textContent = 'Word Town';
      Sfx.fanfare(); Fx.confetti(70);
      timers.push(setTimeout(() => Fx.confetti(50), 600));
      Voice.say('Brilliant! You did it!', { key: 'words-done' });
      timers.push(setTimeout(() => { running = false; onDone(); }, 2400));
    }

    ask();
    return { stop() { running = false; clearTimers(); } };
  }

  return { GAMES, openHub, play, stop };
})();
