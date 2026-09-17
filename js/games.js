// The minigames: find, pop, magnet (fridge hunt), build (assemble the letter), train, ice (smash blocks),
// paint, monster (feed the letter monster).
// Games.play(type, character, onDone) runs one; Games.stop() aborts it.

const Games = (() => {
  let active = null;

  const $ = s => document.querySelector(s);
  const area = () => $('#game-area');
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const centre = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };

  function setStars(n, total) {
    $('#game-stars').innerHTML = Array.from({ length: total }, (_, i) => `<span class="star${i < n ? ' on' : ''}">★</span>`).join('');
  }
  // `label` overrides what the target card shows – Build and Paint pass their own,
  // since they stay uppercase while the rest of the games follow the case mode.
  function setPrompt(text, letter, color, label = Case.label(letter)) {
    $('#game-prompt').textContent = text;
    const t = $('#game-target');
    t.textContent = label;
    t.classList.toggle('two', label.length > 1);
    t.style.setProperty('--c', color);
    t.classList.remove('pulse'); void t.offsetWidth; t.classList.add('pulse');
  }
  function distractors(letter, n) {
    const out = [];
    while (out.length < n) {
      const l = pick(ALL_LETTERS);
      // In mixed mode 'a' is a *right* answer when the target is 'A', so the
      // target's other case must never turn up as a wrong one.
      if (Case.same(l, letter) || out.some(o => Case.same(o, l))) continue;
      out.push(Case.glyph(l));
    }
    return out;
  }
  // A floating letter: outer element is positioned by transform, inner one carries animations.
  function makeFloater(cls, letter, color, size) {
    const el = document.createElement('div');
    el.className = cls;
    el.style.width = el.style.height = size + 'px';
    el.style.setProperty('--c', color);
    el.innerHTML = `<div class="inner"><span>${letter}</span></div>`;
    return el;
  }

  // ---------- Game 1: Find the letter ----------
  // Six letters drift around; tap the target. Three rounds to win.
  function findGame(ch, onDone) {
    const L = ch.letter, ROUNDS = 3;
    const el = area(); el.className = 'game-area find';
    setPrompt('Find the letter', L, ch.color); setStars(0, ROUNDS);
    Voice.say(`Find the letter ${L}!`, { key: `${L}-find` });
    $('#game-target').onclick = () => Voice.say(`Find the letter ${L}!`, { key: `${L}-find` });

    let round = 0, wrong = 0, items = [], raf = 0, last = 0, running = true;
    const W = () => el.clientWidth, H = () => el.clientHeight;
    const R = Math.min(W(), H()) * 0.12;

    function place() {
      // Try random spots until one doesn't overlap the others.
      for (let tries = 0; tries < 60; tries++) {
        const x = rand(R * 1.1, W() - R * 1.1), y = rand(R * 1.1, H() - R * 1.1);
        if (items.every(o => Math.hypot(o.x - x, o.y - y) > R * 2.4)) return { x, y };
      }
      return { x: rand(R, W() - R), y: rand(R, H() - R) };
    }
    function spawn() {
      el.innerHTML = ''; items = []; wrong = 0;
      const letters = shuffle([Case.glyph(L), ...distractors(L, 5)]);
      const colors = shuffle(LETTER_COLORS.slice());
      letters.forEach((ltr, i) => {
        const node = makeFloater('balloon', ltr, colors[i % colors.length], R * 2);
        const { x, y } = place();
        const o = { el: node, x, y, vx: rand(-60, 60), vy: rand(-60, 60), ltr, popped: false };
        node.addEventListener('pointerdown', e => { e.preventDefault(); tap(o); });
        el.appendChild(node); items.push(o);
        node.style.transform = `translate3d(${x - R}px,${y - R}px,0)`;
        setTimeout(() => node.classList.add('in'), i * 70);
      });
    }
    function tap(o) {
      if (!running || o.popped) return;
      if (Case.same(o.ltr, L)) {
        o.popped = true; round++;
        setStars(round, ROUNDS);
        Sfx.correct(); Sfx.sparkle();
        const c = centre(o.el); Fx.burst(c.x, c.y, ch.color);
        o.el.classList.add('pop');
        Voice.say(round >= ROUNDS ? `${L}! Well done!` : `${L}!`, { key: round >= ROUNDS ? `${L}-find-done` : `${L}-tick` });
        if (round >= ROUNDS) { running = false; setTimeout(finish, 1100); }
        else setTimeout(() => running && spawn(), 900);
      } else {
        wrong++; Sfx.wrong();
        o.el.classList.remove('shake'); void o.el.offsetWidth; o.el.classList.add('shake');
        // After two misses, make the right answer glow.
        if (wrong >= 2) items.find(b => Case.same(b.ltr, L)).el.classList.add('hint');
      }
    }
    function frame(t) {
      if (!running) return;
      const dt = Math.min(0.05, (t - last) / 1000) || 0; last = t;
      const w = W(), h = H();
      for (const o of items) {
        if (o.popped) continue;
        o.x += o.vx * dt; o.y += o.vy * dt;
        if (o.x < R) { o.x = R; o.vx = Math.abs(o.vx); } else if (o.x > w - R) { o.x = w - R; o.vx = -Math.abs(o.vx); }
        if (o.y < R) { o.y = R; o.vy = Math.abs(o.vy); } else if (o.y > h - R) { o.y = h - R; o.vy = -Math.abs(o.vy); }
        o.el.style.transform = `translate3d(${o.x - R}px,${o.y - R}px,0)`;
      }
      raf = requestAnimationFrame(frame);
    }
    function finish() { cancelAnimationFrame(raf); onDone(); }
    spawn(); raf = requestAnimationFrame(frame);
    return { stop() { running = false; cancelAnimationFrame(raf); } };
  }

  // ---------- Game 2: Pop the bubbles ----------
  // Bubbles float up; pop the ones showing the target letter. Five pops to win.
  function popGame(ch, onDone) {
    const L = ch.letter, GOAL = 5;
    const el = area(); el.className = 'game-area pop';
    setPrompt('Pop the bubbles', L, ch.color); setStars(0, GOAL);
    Voice.say(`Pop the bubbles with the letter ${L}!`, { key: `${L}-pop` });
    $('#game-target').onclick = () => Voice.say(`Pop the bubbles with the letter ${L}!`, { key: `${L}-pop` });

    let items = [], score = 0, running = true, raf = 0, last = 0, spawnT = 0.6, sinceTarget = 1, time = 0;
    const W = () => el.clientWidth, H = () => el.clientHeight;
    const S = Math.min(W(), H()) * 0.24;

    function spawn() {
      // Never two targets in a row, never more than two distractors in a row.
      const isTarget = sinceTarget >= 2 || (sinceTarget >= 1 && Math.random() < 0.5);
      sinceTarget = isTarget ? 0 : sinceTarget + 1;
      const ltr = isTarget ? Case.glyph(L) : distractors(L, 1)[0];
      const node = makeFloater('bubble-float', ltr, pick(LETTER_COLORS), S);
      const o = { el: node, bx: rand(S * 0.6, W() - S * 0.6), x: 0, y: H() + S, vy: -(H() * 0.10 + rand(0, H() * 0.08)), phase: rand(0, 6.28), amp: rand(15, 40), ltr, popped: false };
      node.addEventListener('pointerdown', e => { e.preventDefault(); tap(o); });
      el.appendChild(node); items.push(o);
      Sfx.bubble();
    }
    function tap(o) {
      if (!running || o.popped) return;
      if (Case.same(o.ltr, L)) {
        o.popped = true; score++;
        setStars(score, GOAL);
        Sfx.pop(); Sfx.sparkle();
        const c = centre(o.el); Fx.burst(c.x, c.y, ch.color, 16);
        o.el.classList.add('pop');
        setTimeout(() => o.el.remove(), 500);
        Voice.say(score >= GOAL ? `${L}! Hooray!` : `${L}!`, { key: score >= GOAL ? `${L}-pop-done` : `${L}-tick` });
        if (score >= GOAL) { running = false; items.forEach(b => b.el.classList.add('fade')); setTimeout(finish, 1200); }
      } else {
        Sfx.boing();
        o.el.classList.remove('jiggle'); void o.el.offsetWidth; o.el.classList.add('jiggle');
      }
    }
    function frame(t) {
      const dt = Math.min(0.05, (t - last) / 1000) || 0; last = t; time += dt;
      if (running) { spawnT += dt; if (spawnT > 1.0) { spawnT = 0; spawn(); } }
      for (const o of items) {
        if (o.popped) continue;
        o.y += o.vy * dt;
        o.x = o.bx + Math.sin(time * 2 + o.phase) * o.amp;
        o.el.style.transform = `translate3d(${o.x - S / 2}px,${o.y - S / 2}px,0)`;
      }
      // Drop bubbles that have floated off the top.
      items = items.filter(o => { if (!o.popped && o.y < -S) { o.el.remove(); return false; } return true; });
      if (running || items.some(o => !o.popped)) raf = requestAnimationFrame(frame);
    }
    function finish() { cancelAnimationFrame(raf); onDone(); }
    raf = requestAnimationFrame(frame);
    return { stop() { running = false; cancelAnimationFrame(raf); } };
  }

  // ---------- shared drag helpers for the three drag games ----------
  // onMove/onEnd receive the pointer's displacement since pointerdown.
  function draggable(node, { onStart, onMove, onEnd }) {
    node.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (onStart(e) === false) return;
      const sx = e.clientX, sy = e.clientY;
      try { node.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events */ }
      const move = ev => onMove(ev.clientX - sx, ev.clientY - sy);
      const up = ev => {
        node.removeEventListener('pointermove', move); node.removeEventListener('pointerup', up); node.removeEventListener('pointercancel', up);
        onEnd(ev.clientX - sx, ev.clientY - sy);
      };
      node.addEventListener('pointermove', move); node.addEventListener('pointerup', up); node.addEventListener('pointercancel', up);
    });
  }
  function setXY(o, x, y) { o.x = x; o.y = y; o.el.style.transform = `translate3d(${x}px,${y}px,0)`; }
  function slideTo(o, x, y, ms = 300) {
    o.el.style.transition = `transform ${ms}ms cubic-bezier(.34,1.56,.64,1)`;
    setXY(o, x, y);
    setTimeout(() => { o.el.style.transition = ''; }, ms);
  }
  function replay(node, cls) { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); }
  let zTop = 10;
  const lift = node => { node.style.zIndex = ++zTop; };

  // ---------- Game 3: Magnet hunt ----------
  // Magnets litter the table; drag every target letter onto the fridge. Four to win.
  function magnetGame(ch, onDone) {
    const L = ch.letter, GOAL = 4;
    const el = area(); el.className = 'game-area hunt';
    setPrompt(`Find all the ${Case.phrase(L)}`, L, ch.color); setStars(0, GOAL);
    const say = () => Voice.say(`Find all the ${L}'s and stick them on the fridge!`, { key: `${L}-magnet` });
    say(); $('#game-target').onclick = say;

    const W = el.clientWidth, H = el.clientHeight, M = H * 0.15;
    el.style.setProperty('--m', M + 'px');
    el.innerHTML = `<div class="fridge"><div class="fridge-handle"></div><div class="slots">${Case.glyphs(L, GOAL).map(g => `<div class="slot">${g}</div>`).join('')}</div></div>`;
    const fridge = el.querySelector('.fridge'), slots = Array.from(el.querySelectorAll('.slot'));
    const ar = el.getBoundingClientRect(), fr = fridge.getBoundingClientRect();
    const tableRight = fr.left - ar.left - M * 0.4;

    let done = 0, wrong = 0, running = true, items = [];
    function place() {
      for (let tries = 0; tries < 80; tries++) {
        const x = rand(M * 0.15, tableRight - M * 1.15), y = rand(M * 0.15, H - M * 1.15);
        if (items.every(o => Math.hypot(o.x - x, o.y - y) > M * 1.2)) return { x, y };
      }
      return { x: rand(M * 0.15, tableRight - M * 1.15), y: rand(M * 0.15, H - M * 1.15) };
    }
    function overFridge(o) {
      const r = o.el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      return cx > fr.left - M * 0.3 && cx < fr.right && cy > fr.top - M * 0.3 && cy < fr.bottom + M * 0.3;
    }
    function drop(o) {
      if (!running) { slideTo(o, o.hx, o.hy); return; }
      if (!overFridge(o)) { slideTo(o, o.hx, o.hy); return; }
      if (Case.same(o.ltr, L)) {
        o.stuck = true; done++;
        const slot = slots[done - 1]; slot.classList.add('filled');
        const sr = slot.getBoundingClientRect();
        slideTo(o, sr.left - ar.left, sr.top - ar.top, 250);
        o.el.classList.add('stuck');
        const c = centre(o.el); Fx.burst(c.x, c.y, ch.color, 14);
        Sfx.clack(); Sfx.sparkle(); setStars(done, GOAL);
        Voice.say(done >= GOAL ? `${L}! You found them all!` : `${L}!`, { key: done >= GOAL ? `${L}-magnet-done` : `${L}-tick` });
        if (done >= GOAL) { running = false; fridge.classList.add('done'); setTimeout(finish, 1400); }
      } else {
        wrong++; Sfx.boing();
        replay(o.el, 'wobble');
        slideTo(o, o.hx, o.hy, 450);
        if (wrong >= 2) items.filter(m => Case.same(m.ltr, L) && !m.stuck).forEach(m => m.el.classList.add('hint'));
      }
    }
    shuffle([...Case.glyphs(L, GOAL), ...distractors(L, 6)]).forEach((ltr, i) => {
      const node = document.createElement('div');
      node.className = 'magnet';
      node.style.setProperty('--c', pick(LETTER_COLORS));
      node.style.setProperty('--rot', rand(-28, 28) + 'deg');
      node.innerHTML = `<div class="inner">${ltr}</div>`;
      const { x, y } = place();
      const o = { el: node, ltr, x, y, hx: x, hy: y, stuck: false };
      setXY(o, x, y); el.appendChild(node); items.push(o);
      setTimeout(() => node.classList.add('in'), i * 60);
      draggable(node, {
        onStart() { if (!running || o.stuck) return false; node.style.transition = ''; node.classList.add('dragging'); lift(node); o.x0 = o.x; o.y0 = o.y; Sfx.tap(); },
        onMove(dx, dy) { setXY(o, o.x0 + dx, o.y0 + dy); },
        onEnd() { node.classList.remove('dragging'); drop(o); },
      });
    });
    function finish() { onDone(); }
    return { stop() { running = false; } };
  }

  // ---------- Game 4: Build a letter ----------
  // The letter's strokes are scattered; drag each onto the grey ghost to assemble it.
  function buildGame(ch, onDone, opts = {}) {
    // One letter on screen, so there is nothing to match against: mixed mode
    // picks a form for the round unless the caller asks for a specific one.
    const L = ch.letter, form = opts.form || Case.glyph(L), strokes = LETTER_STROKES[form];
    const el = area(); el.className = 'game-area build' + (form === L ? '' : ' lower');
    setPrompt('Build the letter', L, ch.color, form); setStars(0, strokes.length);
    const say = () => Voice.say(`Let's build the letter ${L}! Put the pieces together!`, { key: `${L}-build` });
    say(); $('#game-target').onclick = say;

    const W = el.clientWidth, H = el.clientHeight, S = H * 0.6, k = S / 100;
    const hx = (W - S) / 2, hy = (H - S) / 2, pad = H * 0.02;
    el.innerHTML = `<div class="ghost" style="width:${S}px;height:${S}px;transform:translate3d(${hx}px,${hy}px,0)"><svg viewBox="0 0 100 100">${strokes.map(d => `<path d="${d}"/>`).join('')}</svg></div>`;
    const ghost = el.querySelector('.ghost'), ghostPaths = Array.from(ghost.querySelectorAll('path'));

    // Some letters repeat a stroke: E's top and bottom arms, H's two stems, Z's two bars.
    // Those pieces are indistinguishable, so a piece may snap to ANY free slot whose stroke
    // is the same shape as its own -- the letter comes out identical either way, and telling
    // a child the bottom arm doesn't go on the bottom is just wrong.
    // Shapes are compared as a run of sampled points, offset from the first, so only
    // translation counts: X's and V's mirrored diagonals stay firmly non-swappable. The
    // tolerance is a float-noise allowance and nothing more -- true twins score 0, while
    // B's two bowls (5) and E's shorter middle arm (10) are near misses that must stay put,
    // since dropping those in each other's slot would draw a visibly broken letter.
    const SHAPE_TOL = 1.5;
    const shapes = ghostPaths.map(path => {
      const len = path.getTotalLength(), pts = [];
      for (let s = 0; s <= 16; s++) { const q = path.getPointAtLength(len * s / 16); pts.push([q.x, q.y]); }
      const norm = ps => ps.map(q => [q[0] - ps[0][0], q[1] - ps[0][1]]);
      return { bb: path.getBBox(), pts: norm(pts), rev: norm([...pts].reverse()) };
    });
    // Paths can be drawn in either direction (M's stems run opposite ways), so try both.
    function alike(a, b) {
      const dev = pts => a.pts.reduce((m, q, n) => Math.max(m, Math.hypot(q[0] - pts[n][0], q[1] - pts[n][1])), 0);
      return Math.min(dev(b.pts), dev(b.rev)) <= SHAPE_TOL;
    }
    const swaps = strokes.map((_, i) => strokes.map((_, j) => j).filter(j => alike(shapes[i], shapes[j])));
    const filled = strokes.map(() => false);
    // Where piece i's box must sit for its ink to land on slot j.
    const slotX = (i, j) => hx + (shapes[j].bb.x - shapes[i].bb.x) * k;
    const slotY = (i, j) => hy + (shapes[j].bb.y - shapes[i].bb.y) * k;
    function nearestSlot(o) {
      let best = -1, near = S * 0.15;
      for (const j of swaps[o.i]) {
        if (filled[j]) continue;
        const d = Math.hypot(o.x - slotX(o.i, j), o.y - slotY(o.i, j));
        if (d < near) { near = d; best = j; }
      }
      return best;
    }

    // Free zones around the ghost letter (which spans roughly 12–90 of the 100 box).
    const zones = [
      { x: pad, y: pad, w: hx + S * 0.12 - pad * 2, h: H - pad * 2 },
      { x: hx + S * 0.88 + pad, y: pad, w: W - (hx + S * 0.88) - pad * 2, h: H - pad * 2 },
      { x: pad, y: pad, w: W - pad * 2, h: hy + S * 0.10 - pad * 2 },
      { x: pad, y: hy + S * 0.92 + pad, w: W - pad * 2, h: H - (hy + S * 0.92) - pad * 2 },
    ];
    const boxes = [];
    function scatter(pw, ph) {
      const fits = zones.filter(z => z.w >= pw && z.h >= ph);
      const attempt = () => { const z = pick(fits); return { x: rand(z.x, z.x + z.w - pw), y: rand(z.y, z.y + z.h - ph) }; };
      for (let tries = 0; tries < 80 && fits.length; tries++) {
        const p = attempt();
        if (boxes.every(b => p.x + pw + pad < b.x || b.x + b.w + pad < p.x || p.y + ph + pad < b.y || b.y + b.h + pad < p.y)) return p;
      }
      return fits.length ? attempt() : { x: rand(0, W - pw), y: rand(0, H - ph) };
    }

    let placed = 0, running = true, items = [];
    function snap(o, j) {
      o.placed = true; filled[j] = true; placed++;
      o.el.classList.add('placed'); ghostPaths[j].classList.add('hidden');
      slideTo(o, slotX(o.i, j), slotY(o.i, j), 200);
      Sfx.click(); Sfx.sparkle(); setStars(placed, strokes.length);
      const c = centre(o.el.querySelector('.ink')); Fx.burst(c.x, c.y, ch.color, 12);
      if (placed >= strokes.length) {
        running = false; ghost.classList.add('hidden'); el.classList.add('built');
        Sfx.correct(); Fx.burst(W / 2 + el.getBoundingClientRect().left, H / 2 + el.getBoundingClientRect().top, ch.color, 40);
        Voice.say(`${L}! You built the letter ${L}!`, { key: `${L}-build-done` });
        setTimeout(finish, 1700);
      } else Voice.say(`${L}!`, { key: `${L}-tick` });
    }
    strokes.forEach((d, i) => {
      const node = document.createElement('div');
      node.className = 'piece';
      node.style.width = node.style.height = S + 'px';
      node.style.setProperty('--c', ch.color);
      node.style.setProperty('--rot', rand(-14, 14) + 'deg');
      node.innerHTML = `<svg viewBox="0 0 100 100"><path class="hit" d="${d}"/><path class="ink" d="${d}"/></svg>`;
      el.appendChild(node);
      const bb = shapes[i].bb;
      const pw = (bb.width + 16) * k, ph = (bb.height + 16) * k, ox = (bb.x - 8) * k, oy = (bb.y - 8) * k;
      // Tilt around the stroke itself so a tilted piece still sits where its drop position says.
      node.querySelector('svg').style.transformOrigin = `${(bb.x + bb.width / 2) * k}px ${(bb.y + bb.height / 2) * k}px`;
      const p = scatter(pw, ph);
      boxes.push({ x: p.x, y: p.y, w: pw, h: ph });
      const o = { el: node, i, x: p.x - ox, y: p.y - oy, placed: false };
      setXY(o, o.x, o.y); items.push(o);
      setTimeout(() => node.classList.add('in'), 150 + i * 90);
      draggable(node, {
        onStart() { if (!running || o.placed) return false; node.style.transition = ''; node.classList.add('dragging'); lift(node); o.x0 = o.x; o.y0 = o.y; Sfx.tap(); },
        onMove(dx, dy) { setXY(o, o.x0 + dx, o.y0 + dy); },
        onEnd() {
          node.classList.remove('dragging');
          if (!running) return;
          const slot = nearestSlot(o);
          if (slot >= 0) { snap(o, slot); return; }
          // Keep the piece on screen wherever it was dropped.
          const nx = Math.max(-ox, Math.min(W - pw - ox, o.x)), ny = Math.max(-oy, Math.min(H - ph - oy, o.y));
          if (nx !== o.x || ny !== o.y) slideTo(o, nx, ny, 250);
          Sfx.boing();
        },
      });
    });
    function finish() { onDone(); }
    return { stop() { running = false; } };
  }

  // ---------- Game 5: Letter train ----------
  // Carriages wait in the siding; couple the ones with the target letter behind the engine.
  function trainGame(ch, onDone) {
    const L = ch.letter, GOAL = 3;
    const el = area(); el.className = 'game-area train';
    setPrompt('Letter train', L, ch.color); setStars(0, GOAL);
    const say = () => Voice.say(`All aboard the ${L} train! Find the carriages with the letter ${L}!`, { key: `${L}-train` });
    say(); $('#game-target').onclick = say;

    const W = el.clientWidth, H = el.clientHeight;
    const CW = H * 0.2, CH = H * 0.17, EW = H * 0.28, GAP = H * 0.02, trackY = H * 0.8;
    el.style.setProperty('--cw', CW + 'px'); el.style.setProperty('--ch', CH + 'px'); el.style.setProperty('--ew', EW + 'px');
    el.style.setProperty('--track', trackY + 'px');
    // The engine and the empty hitch both advertise the target, so they show
    // both forms ("Aa") in mixed mode – `two` shrinks the type to fit.
    const mark = Case.label(L), two = mark.length > 1 ? ' two' : '';
    el.innerHTML = `<div class="track"></div><div class="train-set">
      <div class="wagon engine${two}" style="--c:${ch.color}"><div class="chimney"></div><div class="cab"></div><div class="body">${mark}</div><div class="wheel l"></div><div class="wheel r"></div></div>
      <div class="hitch${two}"><span>${mark}</span></div></div>`;
    const set = el.querySelector('.train-set'), engine = { el: el.querySelector('.engine') }, hitch = { el: el.querySelector('.hitch') };
    // Engine at the front (right end); carriages couple on behind it, to the left.
    const engineX = H * 0.05 + GOAL * (CW + GAP), rowY = trackY - CH;
    setXY(engine, engineX, rowY);
    const hitchX = i => engineX - (i + 1) * (CW + GAP);
    setXY(hitch, hitchX(0), rowY);

    let attached = 0, wrong = 0, running = true, items = [];
    const parked = shuffle([...Case.glyphs(L, GOAL), ...distractors(L, 3)]);
    const spacing = (W - parked.length * CW) / (parked.length + 1);
    function nearHitch(o) { return Math.abs(o.x - hitch.x) < CW * 0.8 && Math.abs(o.y - hitch.y) < CH * 0.9; }
    function drop(o) {
      if (!running || !nearHitch(o)) { slideTo(o, o.hx, o.hy); return; }
      if (Case.same(o.ltr, L)) {
        o.attached = true; attached++;
        set.appendChild(o.el); o.el.classList.add('attached');
        slideTo(o, hitchX(attached - 1), rowY, 220);
        Sfx.clack(); Sfx.sparkle(); setStars(attached, GOAL);
        const c = centre(o.el); Fx.burst(c.x, c.y, ch.color, 14);
        if (attached >= GOAL) {
          running = false; hitch.el.classList.add('hidden');
          Voice.say(`${L}! Off we go! Choo choo!`, { key: `${L}-train-done` });
          setTimeout(depart, 700);
        } else { Voice.say(`${L}!`, { key: `${L}-tick` }); slideTo(hitch, hitchX(attached), rowY, 220); }
      } else {
        wrong++; Sfx.boing();
        replay(o.el, 'wobble');
        slideTo(o, o.hx, o.hy, 450);
        if (wrong >= 2) items.filter(w => Case.same(w.ltr, L) && !w.attached).forEach(w => w.el.classList.add('hint'));
      }
    }
    parked.forEach((ltr, i) => {
      const node = document.createElement('div');
      node.className = 'wagon';
      node.style.setProperty('--c', pick(LETTER_COLORS));
      node.innerHTML = `<div class="body">${ltr}</div><div class="wheel l"></div><div class="wheel r"></div>`;
      const x = spacing + i * (CW + spacing), y = H * 0.1 + (i % 2) * H * 0.05;
      const o = { el: node, ltr, x, y, hx: x, hy: y, attached: false };
      setXY(o, x, y); el.appendChild(node); items.push(o);
      setTimeout(() => node.classList.add('in'), i * 80);
      draggable(node, {
        onStart() { if (!running || o.attached) return false; node.style.transition = ''; node.classList.add('dragging'); lift(node); o.x0 = o.x; o.y0 = o.y; Sfx.tap(); },
        onMove(dx, dy) { setXY(o, o.x0 + dx, o.y0 + dy); },
        onEnd() { node.classList.remove('dragging'); drop(o); },
      });
    });
    let puffTimer = 0;
    function depart() {
      Sfx.whistle();
      setTimeout(() => Sfx.chug(), 500);
      el.classList.add('go');
      set.style.transition = 'transform 3.2s cubic-bezier(.45,0,.85,.55)';
      set.style.transform = `translate3d(${W + EW}px,0,0)`;
      puffTimer = setInterval(() => {
        const p = document.createElement('div');
        p.className = 'puff';
        p.style.left = (engineX + EW * 0.78) + 'px'; p.style.top = (rowY - CH * 0.55) + 'px';
        set.appendChild(p); setTimeout(() => p.remove(), 1100);
      }, 180);
      setTimeout(finish, 3400);
    }
    function finish() { clearInterval(puffTimer); onDone(); }
    return { stop() { running = false; clearInterval(puffTimer); } };
  }

  // ---------- Game 6: Ice breaker ----------
  // Letters are frozen in ice blocks. Three taps shatter a block; smash three target letters.
  function iceGame(ch, onDone) {
    const L = ch.letter, GOAL = 3, HITS = 3;
    const el = area(); el.className = 'game-area ice';
    setPrompt('Smash the ice', L, ch.color); setStars(0, GOAL);
    const say = () => Voice.say(`The letters are frozen! Tap the ice to smash it and find the letter ${L}!`, { key: `${L}-ice` });
    say(); $('#game-target').onclick = say;

    const W = el.clientWidth, H = el.clientHeight;
    const letters = shuffle([...Case.glyphs(L, GOAL), ...distractors(L, 3)]);
    const cols = 3, rows = 2, B = Math.min(W / (cols + 1), H / (rows + 0.8));
    el.style.setProperty('--b', B + 'px');
    const cx = (W - cols * B) / (cols + 1), cy = (H - rows * B) / (rows + 1);

    let done = 0, wrong = 0, running = true, items = [];
    const CRACKS = '<svg viewBox="0 0 100 100"><path class="k1" d="M52 4 L46 30 L58 44 L50 60"/><path class="k1" d="M46 30 L22 38 L12 30"/><path class="k2" d="M58 44 L82 50 L96 42"/><path class="k2" d="M50 60 L36 78 L40 98"/><path class="k2" d="M50 60 L70 80 L66 96"/><path class="k2" d="M22 38 L10 60"/></svg>';
    function shatter(o) {
      o.el.classList.add('smashed');
      const c = centre(o.el);
      Fx.burst(c.x, c.y, '#e8f7ff', 18);
      for (let i = 0; i < 10; i++) {
        const s = document.createElement('div');
        s.className = 'shard';
        const a = rand(0, Math.PI * 2), d = rand(B * 0.5, B * 1.1);
        s.style.setProperty('--dx', Math.cos(a) * d + 'px');
        s.style.setProperty('--dy', Math.sin(a) * d + B * 0.4 + 'px');
        s.style.setProperty('--r', rand(-360, 360) + 'deg');
        s.style.width = s.style.height = rand(B * 0.1, B * 0.22) + 'px';
        o.el.appendChild(s);
        setTimeout(() => s.remove(), 1000);
      }
    }
    function tap(o) {
      if (!running || o.smashed) return;
      o.hits++;
      replay(o.el, 'hit');
      if (o.hits < HITS) { Sfx.crack(); o.el.classList.add('c' + o.hits); return; }
      o.smashed = true;
      Sfx.shatter(); shatter(o);
      if (Case.same(o.ltr, L)) {
        done++; setStars(done, GOAL);
        Sfx.correct(); Sfx.sparkle();
        const c = centre(o.el); Fx.burst(c.x, c.y, ch.color, 16);
        Voice.say(done >= GOAL ? `${L}! You smashed them all!` : `${L}!`, { key: done >= GOAL ? `${L}-ice-done` : `${L}-tick` });
        if (done >= GOAL) { running = false; setTimeout(finish, 1500); }
      } else {
        wrong++; Sfx.boing();
        setTimeout(() => o.el.classList.add('melt'), 700);
        if (wrong >= 2) items.filter(b => Case.same(b.ltr, L) && !b.smashed).forEach(b => b.el.classList.add('hint'));
      }
    }
    letters.forEach((ltr, i) => {
      const node = document.createElement('div');
      node.className = 'ice-block';
      node.style.setProperty('--c', pick(LETTER_COLORS));
      node.style.setProperty('--rot', rand(-8, 8) + 'deg');
      node.innerHTML = `<div class="cube"><span class="ltr">${ltr}</span>${CRACKS}</div>`;
      const col = i % cols, row = Math.floor(i / cols);
      const x = cx + col * (B + cx) + rand(-cx * 0.3, cx * 0.3), y = cy + row * (B + cy) + rand(-cy * 0.3, cy * 0.3);
      const o = { el: node, ltr, x, y, hits: 0, smashed: false };
      setXY(o, x, y); el.appendChild(node); items.push(o);
      setTimeout(() => node.classList.add('in'), i * 80);
      node.addEventListener('pointerdown', e => { e.preventDefault(); tap(o); });
    });
    function finish() { onDone(); }
    return { stop() { running = false; } };
  }

  // ---------- Game 7: Paint the letter ----------
  // A big outlined letter with dots or stripes inside; pick a paint pot, tap (or swipe) a region.
  function paintGame(ch, onDone) {
    // One letter on screen, so mixed mode just picks a form for this round.
    const L = ch.letter, form = Case.glyph(L);
    let GOAL = 5;
    const el = area(); el.className = 'game-area paint';
    setPrompt('Paint the letter', L, ch.color, form); setStars(0, GOAL);
    const say = () => Voice.say(`Let's paint the letter ${L}! Tap a colour, then tap the letter!`, { key: `${L}-paint` });
    say(); $('#game-target').onclick = say;

    const pattern = pick(['dots', 'spots', 'stripes']);
    const shapes = [];
    if (pattern === 'stripes') {
      for (let k = -4; k < 12; k++) shapes.push(`<rect class="region" x="-60" y="${k * 13}" width="220" height="6.5" transform="rotate(-35 50 50)"/>`);
    } else {
      const step = pattern === 'dots' ? 14 : 22, r = pattern === 'dots' ? 4.5 : 8;
      for (let y = 4; y < 99; y += step) for (let x = 4; x < 99; x += step) shapes.push(`<circle class="region" cx="${x + rand(-3, 3)}" cy="${y + rand(-3, 3)}" r="${r + rand(-1, 1)}"/>`);
    }
    const SIZE = 90;
    const glyph = `x="50" y="50" text-anchor="middle" font-size="${SIZE}"`;
    el.innerHTML = `<div class="pots">${LETTER_COLORS.map((c, i) => `<button class="pot${i ? '' : ' sel'}" style="--c:${c}" aria-label="paint"></button>`).join('')}</div>
      <div class="canvas"><svg viewBox="0 0 100 100">
        <defs><clipPath id="paint-clip"><text ${glyph}>${form}</text></clipPath></defs>
        <g clip-path="url(#paint-clip)"><rect class="region body" x="0" y="0" width="100" height="100"/>${shapes.join('')}</g>
        <text class="outline" ${glyph}>${form}</text>
      </svg></div>
      <button class="paint-done hidden" aria-label="Done">✓</button>`;
    const svg = el.querySelector('svg');

    // Fit the glyph to the box rather than trusting a fixed baseline: lowercase
    // sits higher and g/j/p/q/y hang below it. Measure the INK, not getBBox() --
    // on <text> that returns the font's layout box (ascent to descent), which is
    // just as tall for 'a' as for 'A' and would leave lowercase at half size.
    const outline = el.querySelector('text.outline'), cs = getComputedStyle(outline);
    const ink = (() => {
      const c = document.createElement('canvas').getContext('2d');
      c.font = `${cs.fontWeight || 700} ${SIZE}px ${cs.fontFamily}`;
      c.textAlign = 'center';
      const m = c.measureText(form);
      const up = m.actualBoundingBoxAscent, down = m.actualBoundingBoxDescent;
      if (!(up + down)) return outline.getBBox(); // no ink metrics -- layout box will do
      return { x: 50 - m.actualBoundingBoxLeft, y: 50 - up,
               width: m.actualBoundingBoxLeft + m.actualBoundingBoxRight, height: up + down };
    })();
    const s = Math.min(86 / ink.width, 86 / ink.height);
    const fit = `translate(${50 - s * (ink.x + ink.width / 2)} ${50 - s * (ink.y + ink.height / 2)}) scale(${s})`;
    el.querySelectorAll('svg text').forEach(t => t.setAttribute('transform', fit));

    // Drop pattern pieces that fall outside the letter, and count the ones with a
    // real footprint inside it. A piece clipped to a sliver stays paintable, but
    // must not count towards the goal -- needing one to finish is what made the
    // game impossible to complete.
    let solid = 1; // the background under the pattern; every pattern leaves gaps
    el.querySelectorAll('.region:not(.body)').forEach(node => {
      const m = node.getScreenCTM(), pt = svg.createSVGPoint();
      const circle = node.tagName === 'circle';
      const samples = circle
        ? (([cx, cy, r]) => [[cx, cy], [cx - r, cy], [cx + r, cy], [cx, cy - r], [cx, cy + r]])
            ([+node.getAttribute('cx'), +node.getAttribute('cy'), +node.getAttribute('r') * 0.6])
        : Array.from({ length: 16 }, (_, i) => [-60 + i * 14, +node.getAttribute('y') + 3.25]);
      const hits = samples.filter(([x, y]) => { pt.x = x; pt.y = y; const p = pt.matrixTransform(m); return document.elementFromPoint(p.x, p.y) === node; }).length;
      if (!hits) node.remove();
      else if (hits >= 3) solid++;
    });
    GOAL = Math.max(1, Math.min(GOAL, solid)); setStars(0, GOAL);

    let colour = LETTER_COLORS[0], running = true, down = false;
    const painted = new Set();
    el.querySelectorAll('.pot').forEach(p => p.addEventListener('pointerdown', e => {
      e.preventDefault(); Sfx.tap();
      el.querySelectorAll('.pot').forEach(q => q.classList.remove('sel')); p.classList.add('sel');
      colour = p.style.getPropertyValue('--c');
    }));
    function paint(r, e) {
      if (r.dataset.c === colour) return;
      r.dataset.c = colour; r.style.fill = colour;
      Sfx.splash(); Fx.burst(e.clientX, e.clientY, colour, 8);
      if (painted.has(r)) return;
      painted.add(r);
      if (painted.size <= GOAL) setStars(painted.size, GOAL);
      if (painted.size === GOAL) {
        Sfx.correct(); el.querySelector('.paint-done').classList.remove('hidden');
        Voice.say(`${L}! Beautiful! Tap the big tick when you're finished!`, { key: `${L}-paint-done` });
      }
    }
    const paintAt = e => { const t = document.elementFromPoint(e.clientX, e.clientY); if (t && t.classList && t.classList.contains('region')) paint(t, e); };
    svg.addEventListener('pointerdown', e => { e.preventDefault(); if (!running) return; down = true; paintAt(e); });
    svg.addEventListener('pointermove', e => { if (down && running) paintAt(e); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => svg.addEventListener(ev, () => { down = false; }));
    el.querySelector('.paint-done').addEventListener('click', () => {
      if (!running) return;
      running = false; Sfx.fanfare(); Fx.confetti(60);
      setTimeout(finish, 900);
    });
    function finish() { onDone(); }
    return { stop() { running = false; } };
  }

  // ---------- Game 8: Feed the monster ----------
  // Letter cookies drift across the sky; tap or drag the wanted letter into the monster's mouth.
  // Wrong ones get chewed and spat out. Five snacks to win.
  function monsterGame(ch, onDone) {
    const L = ch.letter, GOAL = 5;
    const el = area(); el.className = 'game-area monster-game';
    setPrompt('Feed the monster', L, ch.color); setStars(0, GOAL);
    const say = () => Voice.say(`The monster is hungry! Feed him the letter ${L}!`, { key: `${L}-monster` });
    say(); $('#game-target').onclick = say;

    const mark = Case.label(L);
    el.innerHTML = `<div class="monster" style="--c:${ch.color}">
        <div class="want${mark.length > 1 ? ' two' : ''}"><span>${mark}</span></div>
        <div class="m-body">
          <div class="horn l"></div><div class="horn r"></div>
          <div class="eye l"><div class="pupil"></div></div><div class="eye r"><div class="pupil"></div></div>
          <div class="mouth"><div class="teeth"></div><div class="tongue"></div></div>
        </div>
        <div class="foot l"></div><div class="foot r"></div>
      </div>`;
    const monster = el.querySelector('.monster'), mouth = el.querySelector('.mouth');
    const W = () => el.clientWidth, H = () => el.clientHeight;
    const S = Math.min(W(), H()) * 0.2;
    const ar = el.getBoundingClientRect();
    const mouthPos = () => { const r = mouth.getBoundingClientRect(); return { x: r.left + r.width / 2 - ar.left, y: r.top + r.height / 2 - ar.top }; };
    let items = [], score = 0, wrong = 0, running = true, raf = 0, last = 0, spawnT = 1, sinceTarget = 1, time = 0, hinting = false;
    const mood = (cls, ms) => { monster.classList.add(cls); setTimeout(() => monster.classList.remove(cls), ms); };

    function spawn() {
      const isTarget = sinceTarget >= 2 || (sinceTarget >= 1 && Math.random() < 0.5);
      sinceTarget = isTarget ? 0 : sinceTarget + 1;
      const ltr = isTarget ? Case.glyph(L) : distractors(L, 1)[0];
      const node = makeFloater('snack', ltr, pick(LETTER_COLORS), S);
      const dir = Math.random() < 0.5 ? 1 : -1;
      const o = { el: node, ltr, state: 'drift', x: dir > 0 ? -S : W() + S, by: rand(S * 0.7, H() * 0.55), y: 0, vx: dir * (W() * 0.08 + rand(0, W() * 0.06)), phase: rand(0, 6.28), amp: rand(8, 22) };
      if (hinting && Case.same(ltr, L)) node.classList.add('hint');
      node.addEventListener('pointerdown', e => grab(o, e));
      el.appendChild(node); items.push(o);
    }
    function grab(o, e) {
      e.preventDefault();
      if (!running || o.state !== 'drift') return;
      const sx = e.clientX, sy = e.clientY, ox = o.x, oy = o.y;
      let moved = false;
      try { o.el.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ }
      const move = ev => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (!moved && Math.hypot(dx, dy) > 8) { moved = true; o.state = 'drag'; o.el.classList.add('dragging'); lift(o.el); }
        if (moved) { o.x = ox + dx; o.y = oy + dy; }
      };
      const up = () => {
        o.el.removeEventListener('pointermove', move); o.el.removeEventListener('pointerup', up); o.el.removeEventListener('pointercancel', up);
        o.el.classList.remove('dragging');
        if (o.state !== 'drift' && o.state !== 'drag') return;
        const m = mouthPos();
        if (!moved || Math.hypot(o.x - m.x, o.y - m.y) < S * 1.6) feed(o);
        else { o.state = 'drift'; o.by = o.y; }
      };
      o.el.addEventListener('pointermove', move); o.el.addEventListener('pointerup', up); o.el.addEventListener('pointercancel', up);
    }
    function feed(o) {
      o.state = 'fly'; o.t = 0; o.x0 = o.x; o.y0 = o.y;
      lift(o.el); Sfx.whoosh();
      monster.classList.add('open');
    }
    function arrive(o) {
      monster.classList.remove('open');
      Sfx.chomp();
      if (Case.same(o.ltr, L)) {
        o.state = 'gone'; o.el.remove();
        score++; setStars(score, GOAL);
        Sfx.correct(); Sfx.sparkle();
        const m = mouthPos(); Fx.burst(m.x + ar.left, m.y + ar.top, ch.color, 16);
        mood('happy', 700);
        Voice.say(score >= GOAL ? `${L}! Yum yum! The monster is full!` : `${L}!`, { key: score >= GOAL ? `${L}-monster-done` : `${L}-tick` });
        if (score >= GOAL) { running = false; monster.classList.add('full'); items.forEach(b => b.el.classList.add('fade')); setTimeout(finish, 1500); }
      } else {
        o.state = 'held'; o.el.classList.add('hidden');
        mood('yuck', 900);
        setTimeout(() => {
          if (o.state !== 'held') return;
          const m = mouthPos();
          o.state = 'spit'; o.s = 1; o.x = m.x; o.y = m.y; o.vx = (Math.random() < 0.5 ? -1 : 1) * rand(W() * 0.25, W() * 0.4); o.vy = -H() * 0.9;
          o.el.classList.remove('hidden'); o.el.classList.add('spun');
          Sfx.spit(); monster.classList.add('open'); setTimeout(() => monster.classList.remove('open'), 350);
          Voice.say('Yuck! Not that one!', { key: 'monster-yuck' });
          wrong++;
          if (wrong >= 2 && !hinting) { hinting = true; items.filter(b => Case.same(b.ltr, L) && b.state === 'drift').forEach(b => b.el.classList.add('hint')); }
        }, 450);
      }
    }
    function frame(t) {
      const dt = Math.min(0.05, (t - last) / 1000) || 0; last = t; time += dt;
      if (running) { spawnT += dt; if (spawnT > 1.1) { spawnT = 0; spawn(); } }
      const w = W(), h = H();
      // The mouth doesn't move within a frame, so read it once up front rather
      // than per flying snack – that read sat between transform writes and forced
      // a synchronous layout for every item in flight.
      const mouth0 = items.some(o => o.state === 'fly') ? mouthPos() : null;
      for (const o of items) {
        if (o.state === 'gone' || o.state === 'held') continue;
        if (o.state === 'drift') {
          o.x += o.vx * dt; o.y = o.by + Math.sin(time * 2 + o.phase) * o.amp;
        } else if (o.state === 'fly') {
          o.t = Math.min(1, o.t + dt / 0.4);
          const e = 1 - Math.pow(1 - o.t, 3), m = mouth0;
          o.x = o.x0 + (m.x - o.x0) * e; o.y = o.y0 + (m.y - o.y0) * e;
          o.s = 1 - 0.45 * e;
          if (o.t >= 1) { arrive(o); continue; }
        } else if (o.state === 'spit') {
          o.vy += h * 2.2 * dt; o.x += o.vx * dt; o.y += o.vy * dt;
        }
        o.el.style.transform = `translate3d(${o.x - S / 2}px,${o.y - S / 2}px,0) scale(${o.s || 1})`;
      }
      items = items.filter(o => {
        const off = (o.state === 'drift' && (o.x < -S * 1.5 || o.x > w + S * 1.5)) || (o.state === 'spit' && o.y > h + S);
        if (off || o.state === 'gone') { o.el.remove(); return false; }
        return true;
      });
      if (running || items.some(o => o.state === 'spit' || o.state === 'fly')) raf = requestAnimationFrame(frame);
    }
    function finish() { cancelAnimationFrame(raf); onDone(); }
    raf = requestAnimationFrame(frame);
    return { stop() { running = false; cancelAnimationFrame(raf); } };
  }

  const GAMES = { find: findGame, pop: popGame, magnet: magnetGame, build: buildGame, train: trainGame, ice: iceGame, paint: paintGame, monster: monsterGame };

  return {
    play(type, ch, onDone, opts) {
      this.stop();
      const handle = GAMES[type](ch, () => { if (active !== handle) return; active = null; area().innerHTML = ''; onDone(); }, opts);
      active = handle;
    },
    stop() { if (active) { active.stop(); active = null; } area().innerHTML = ''; },
  };
})();
