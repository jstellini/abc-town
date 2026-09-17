// Screens, progress and the letter → games → reveal flow.

const App = (() => {
  const KEY = 'abc-town-progress-v1';
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  let progress = load();
  let current = null;

  // Navigation fires on pointerdown, not click. On iOS a click lands well after
  // touchend, and index.html's double-tap-zoom guard swallows the synthetic click
  // of a quick second tap entirely – so the letter tiles felt laggy and sometimes
  // dropped a tap, while the minigames (already pointerdown) felt fine.
  // No preventDefault: WebKit would suppress :active, which is the press feedback.
  const tap = (el, fn) => el && el.addEventListener('pointerdown', e => {
    if (!e.isPrimary || e.button) return;
    fn(e);
  });

  function load() {
    try { const p = JSON.parse(localStorage.getItem(KEY)); if (p && p.unlocked) return p; } catch (e) { /* fresh start */ }
    return { unlocked: {} };
  }
  function applyCase() { Case.set(progress.case || 'upper'); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch (e) { /* private mode etc. */ } }
  function isUnlocked(letter) { return !!progress.unlocked[letter]; }
  function unlockedCount() { return Object.keys(progress.unlocked).length; }

  function show(name, opts) {
    $$('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + name));
    if (name !== 'game') Games.stop();
    if (name !== 'wordgame') Words.stop();
    Fx.clear();
    if (name === 'town') Town.enter(opts); else Town.leave();
    if (name === 'home') buildHome();
    if (name === 'words') Words.openHub();
    if (name !== 'intro' && name !== 'reveal') Voice.stop();
  }

  // ---------- home: the letter grid ----------
  let homeKey = null;
  const ALL_COLLECTED = () => unlockedCount() >= CHARACTERS.length;
  function buildHome() {
    const grid = $('#letter-grid');
    $('#town-count').textContent = unlockedCount();
    // Above the homeKey early return – the lock has to track the count even on
    // visits where the tiles themselves don't need rebuilding.
    $('#btn-words').classList.toggle('locked', !ALL_COLLECTED());
    $('#words-lock').textContent = ALL_COLLECTED() ? '' : `${unlockedCount()}/${CHARACTERS.length}`;
    // Only rebuild the tiles when the collection changed – re-creating 26 images on every visit
    // makes Safari re-decode them and they can paint late.
    const key = CHARACTERS.map(c => isUnlocked(c.letter) ? c.letter : '.').join('');
    if (key === homeKey) return;
    homeKey = key;
    grid.innerHTML = '';
    CHARACTERS.forEach((c, i) => {
      const t = document.createElement('button');
      t.className = 'tile' + (isUnlocked(c.letter) ? ' done' : '');
      t.style.setProperty('--c', c.color);
      t.innerHTML = `<span class="tile-pop"><span class="tile-letter"><span class="up">${c.letter}</span><span class="low">${c.letter.toLowerCase()}</span></span>`
        // The -w wrappers carry the animation so the filtered element inside can
        // rasterise once and only a transform animates. Filter and animation on
        // the same element means a fresh offscreen blur every frame, 52 of them.
        + (isUnlocked(c.letter) ? `<span class="tile-char-w"><img class="tile-char" src="${c.img}" alt="${c.name}" draggable="false"></span><span class="tile-star-w"><span class="tile-star">⭐</span></span>` : '') + `</span>`;
      if (i === 21) t.style.gridColumnStart = 2; // centre the last row (V–Z)
      t.style.animationDelay = (i * 25) + 'ms';
      tap(t, () => { Sfx.tap(); openLetter(c); });
      grid.appendChild(t);
    });
  }

  // ---------- intro ----------
  function introPhrase(c) {
    return `${c.letter}. ${c.letter} says ${c.sound}. ${c.sound}, ${c.sound}, ${c.name}!`;
  }
  function openLetter(c) {
    current = c;
    $('#intro-card .up').textContent = c.letter;
    $('#intro-card .low').textContent = c.letter.toLowerCase();
    $('#intro-card').style.setProperty('--c', c.color);
    const holder = $('#intro-char');
    holder.classList.toggle('locked', !isUnlocked(c.letter));
    holder.querySelector('img').src = c.img;
    holder.querySelector('img').alt = c.name;
    show('intro');
    setTimeout(() => Voice.say(introPhrase(c), { key: `${c.letter}-intro` }), 250);
  }

  // ---------- games ----------
  function toast(text, ms = 1500) {
    const el = $('#game-toast');
    el.textContent = text;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), ms);
  }
  // Every letter plays the next two games from this rotation (the position is
  // saved with progress), then Build-a-Letter to finish.
  const OTHER_GAMES = ['find', 'pop', 'magnet', 'train', 'ice', 'paint', 'monster'];
  function startGames() {
    const c = current;
    const n = progress.plays || 0;
    progress.plays = n + 1; save();
    // Mixed mode builds the letter twice, big then little, so the child assembles
    // both shapes of the same letter back to back.
    const builds = Case.get() === 'mixed'
      ? [{ type: 'build', form: c.letter }, { type: 'build', form: c.letter.toLowerCase() }]
      : [{ type: 'build' }];
    const seq = [
      { type: OTHER_GAMES[(2 * n) % OTHER_GAMES.length] },
      { type: OTHER_GAMES[(2 * n + 1) % OTHER_GAMES.length] },
      ...builds,
    ];
    show('game');
    const stillPlaying = () => current === c && $('#screen-game').classList.contains('active');
    const step = i => Games.play(seq[i].type, c, () => {
      if (!stillPlaying()) return;
      if (i === seq.length - 1) { reveal(); return; }
      toast('Great job! 🎉');
      Sfx.fanfare();
      setTimeout(() => { if (stillPlaying()) step(i + 1); }, 1500);
    }, { form: seq[i].form });
    step(0);
  }

  // ---------- reveal ----------
  function reveal() {
    const c = current;
    const firstTime = !isUnlocked(c.letter);
    progress.unlocked[c.letter] = true;
    save();
    // Show the letter in whichever form the case mode is teaching – both, side by
    // side like the intro card, when that is big and little together.
    const rl = $('#reveal-letter'), mixed = Case.get() === 'mixed';
    rl.classList.toggle('two', mixed);
    if (mixed) rl.innerHTML = `<span class="up">${c.letter}</span><span class="low">${c.letter.toLowerCase()}</span>`;
    else rl.textContent = Case.label(c.letter);
    rl.style.setProperty('--c', c.color);
    $('#reveal-char img').src = c.img;
    $('#reveal-name').textContent = c.name;
    $('#reveal-badge').textContent = firstTime ? 'New friend!' : 'Welcome back!';
    show('reveal');
    Sfx.fanfare();
    Fx.confetti();
    setTimeout(() => Fx.confetti(80), 700);
    setTimeout(() => Voice.say(`${c.letter} is for ${c.name}!`, { key: `${c.letter}-reveal` }), 600);
  }

  // ---------- grown-ups panel ----------
  function openParent() {
    $('#pp-count').textContent = unlockedCount();
    $('#pp-voice-name').textContent = Voice.voiceName();
    $$('#pp-case .seg-btn').forEach(b => b.classList.toggle('sel', b.dataset.case === Case.get()));
    $('#parent-panel').classList.remove('hidden');
  }
  function holdToOpen(btn, ms, fn) {
    const wrap = btn.closest('.parent-btn-wrap');
    const ring = wrap && wrap.querySelector('.hold-ring circle');
    const hint = wrap && wrap.querySelector('.hint-bubble');
    let timer = 0;
    let hintTimer = 0;
    const cancel = () => {
      clearTimeout(timer);
      btn.classList.remove('holding');
      if (ring) { ring.style.transition = 'none'; ring.style.strokeDashoffset = ring.getAttribute('stroke-dasharray') || getComputedStyle(ring).strokeDasharray; }
      if (hint) { hint.classList.remove('show'); clearTimeout(hintTimer); hintTimer = setTimeout(() => hint.classList.add('hidden'), 150); }
    };
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      // Capture the pointer so a small finger wobble during the hold doesn't
      // fire pointerleave and cancel it before `ms` elapses.
      try { btn.setPointerCapture(e.pointerId); } catch (err) { /* unsupported */ }
      btn.classList.add('holding');
      if (hint) { clearTimeout(hintTimer); hint.classList.remove('hidden'); void hint.offsetWidth; hint.classList.add('show'); }
      if (ring) {
        const len = getComputedStyle(ring).strokeDasharray;
        ring.style.transition = 'none';
        ring.style.strokeDashoffset = len;
        void ring.getBoundingClientRect(); // flush before animating
        ring.style.transition = `stroke-dashoffset ${ms}ms linear`;
        ring.style.strokeDashoffset = '0';
      }
      timer = setTimeout(() => { cancel(); fn(); }, ms);
    });
    ['pointerup', 'pointercancel'].forEach(ev => btn.addEventListener(ev, cancel));
  }

  // Nudge phone/tablet users still in the browser chrome to install the app –
  // standalone mode avoids Safari's UI eating screen space and reloading state.
  function checkA2HS() {
    const note = $('#a2hs-note');
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    let dismissed = false;
    try { dismissed = localStorage.getItem('abc-town-a2hs-dismissed') === '1'; } catch (e) { /* private mode etc. */ }
    if (!standalone && !dismissed) note.classList.remove('hidden');
    $('#a2hs-close').addEventListener('click', () => {
      note.classList.add('hidden');
      try { localStorage.setItem('abc-town-a2hs-dismissed', '1'); } catch (e) { /* private mode etc. */ }
    });
  }

  function init() {
    Fx.init();
    applyCase();
    checkA2HS();
    tap($('#btn-start'), () => {
      Sfx.unlock(); Voice.init();
      Sfx.correct();
      show('home');
      setTimeout(() => Voice.say('Welcome to A B C Town! Pick a letter!', { key: 'welcome' }), 300);
    });
    $$('[data-go]').forEach(b => tap(b, () => { Sfx.tap(); show(b.dataset.go); }));
    tap($('#btn-town'), () => { Sfx.tap(); show('town'); });
    // Left enabled while locked: saying what's still needed beats a dead button.
    tap($('#btn-words'), () => {
      if (!ALL_COLLECTED()) { Sfx.boing(); Voice.say('Collect all the letters first, then Word Town will open!', { key: 'words-locked' }); return; }
      Sfx.tap(); show('words');
    });
    tap($('#btn-play'), () => { Sfx.tap(); startGames(); });
    tap($('#intro-card'), () => { Sfx.tap(); Voice.say(introPhrase(current), { key: `${current.letter}-intro` }); });
    tap($('#intro-char'), () => { Sfx.boing(); $('#intro-char').classList.remove('wobble'); void $('#intro-char').offsetWidth; $('#intro-char').classList.add('wobble'); });
    tap($('#btn-reveal-town'), () => { Sfx.tap(); show('town', { focus: current.letter }); });
    tap($('#btn-reveal-home'), () => { Sfx.tap(); show('home'); });
    tap($('#reveal-char'), () => { Sfx.giggle(); Voice.say(`${current.name}!`, { key: `${current.letter}-reveal-tap` }); $('#reveal-char').classList.remove('wobble'); void $('#reveal-char').offsetWidth; $('#reveal-char').classList.add('wobble'); });

    holdToOpen($('#btn-parent'), 1200, openParent);
    $('#pp-close').addEventListener('click', () => $('#parent-panel').classList.add('hidden'));
    $('#pp-voice').addEventListener('click', () => Voice.say(introPhrase(CHARACTERS[0]), { key: `${CHARACTERS[0].letter}-intro` }));
    $$('#pp-case .seg-btn').forEach(b => b.addEventListener('click', () => {
      Sfx.tap();
      progress.case = b.dataset.case; save(); applyCase();
      $$('#pp-case .seg-btn').forEach(q => q.classList.toggle('sel', q === b));
    }));
    $('#pp-unlock').addEventListener('click', () => { CHARACTERS.forEach(c => progress.unlocked[c.letter] = true); save(); buildHome(); $('#pp-count').textContent = unlockedCount(); });
    // The case setting is a grown-up's preference, not progress – it survives a reset.
    $('#pp-reset').addEventListener('click', () => { if (confirm('Reset all progress?')) { progress = { unlocked: {}, case: progress.case }; save(); buildHome(); $('#pp-count').textContent = 0; } });

    // Keep iOS from scrolling / zooming the page under the game.
    document.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('contextmenu', e => e.preventDefault());
  }

  document.addEventListener('DOMContentLoaded', init);
  return { isUnlocked, show };
})();
