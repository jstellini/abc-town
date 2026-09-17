// Screens, progress and the letter → games → reveal flow.

const App = (() => {
  const KEY = 'abc-town-progress-v1';
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  let progress = load();
  let current = null;

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
    Fx.clear();
    if (name === 'town') Town.enter(opts); else Town.leave();
    if (name === 'home') buildHome();
    if (name !== 'intro' && name !== 'reveal') Voice.stop();
  }

  // ---------- home: the letter grid ----------
  let homeKey = null;
  function buildHome() {
    const grid = $('#letter-grid');
    $('#town-count').textContent = unlockedCount();
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
        + (isUnlocked(c.letter) ? `<img class="tile-char" src="${c.img}" alt="${c.name}" draggable="false"><span class="tile-star">⭐</span>` : '') + `</span>`;
      if (i === 21) t.style.gridColumnStart = 2; // centre the last row (V–Z)
      t.style.animationDelay = (i * 25) + 'ms';
      t.addEventListener('click', () => { Sfx.tap(); openLetter(c); });
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
    const seq = [OTHER_GAMES[(2 * n) % OTHER_GAMES.length], OTHER_GAMES[(2 * n + 1) % OTHER_GAMES.length], 'build'];
    show('game');
    const stillPlaying = () => current === c && $('#screen-game').classList.contains('active');
    const step = i => Games.play(seq[i], c, () => {
      if (!stillPlaying()) return;
      if (i === seq.length - 1) { reveal(); return; }
      toast('Great job! 🎉');
      Sfx.fanfare();
      setTimeout(() => { if (stillPlaying()) step(i + 1); }, 1500);
    });
    step(0);
  }

  // ---------- reveal ----------
  function reveal() {
    const c = current;
    const firstTime = !isUnlocked(c.letter);
    progress.unlocked[c.letter] = true;
    save();
    $('#reveal-letter').textContent = c.letter;
    $('#reveal-letter').style.setProperty('--c', c.color);
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
    $('#btn-start').addEventListener('click', () => {
      Sfx.unlock(); Voice.init();
      Sfx.correct();
      show('home');
      setTimeout(() => Voice.say('Welcome to A B C Town! Pick a letter!', { key: 'welcome' }), 300);
    });
    $$('[data-go]').forEach(b => b.addEventListener('click', () => { Sfx.tap(); show(b.dataset.go); }));
    $('#btn-town').addEventListener('click', () => { Sfx.tap(); show('town'); });
    $('#btn-play').addEventListener('click', () => { Sfx.tap(); startGames(); });
    $('#intro-card').addEventListener('click', () => { Sfx.tap(); Voice.say(introPhrase(current), { key: `${current.letter}-intro` }); });
    $('#intro-char').addEventListener('click', () => { Sfx.boing(); $('#intro-char').classList.remove('wobble'); void $('#intro-char').offsetWidth; $('#intro-char').classList.add('wobble'); });
    $('#btn-reveal-town').addEventListener('click', () => { Sfx.tap(); show('town', { focus: current.letter }); });
    $('#btn-reveal-home').addEventListener('click', () => { Sfx.tap(); show('home'); });
    $('#reveal-char').addEventListener('click', () => { Sfx.giggle(); Voice.say(`${current.name}!`, { key: `${current.letter}-reveal-tap` }); $('#reveal-char').classList.remove('wobble'); void $('#reveal-char').offsetWidth; $('#reveal-char').classList.add('wobble'); });

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
