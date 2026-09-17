// The town: unlocked characters wander, chat ("..."), play tag, laugh, and can be tapped
// (personality reaction) or dragged around. The town is three screens wide – the farm, the
// square and the park – and scrolls left/right by dragging the scenery or tapping the arrows.

const Town = (() => {
  const GROUND_TOP = 0.50, GROUND_BOT = 0.92;   // where feet may stand (fraction of stage height)

  let view, stage, layer, trainEl, townies = [], raf = 0, last = 0, running = false, convoTimer = 2, convoId = 0;
  let focusLetter = null;                       // a just-unlocked friend arrives in the square, in view
  const rand = (a, b) => a + Math.random() * (b - a);
  const $ = s => document.querySelector(s);
  const viewW = () => view.clientWidth;
  const convoDist = () => viewW() * 0.17;       // how close feet must be to strike up a chat

  // ---------- scrolling ----------
  // The stage (300% wide) slides under the view; the hills and clouds slide slower for depth.
  let scrollX = 0, panVel = 0, scrollTarget = null, dragging = null;
  const maxScroll = () => stage.clientWidth - view.clientWidth;
  function setScroll(x) {
    scrollX = Math.max(0, Math.min(maxScroll(), x));
    stage.style.transform = `translate3d(${-scrollX}px,0,0)`;
    $('#layer-mid').style.transform = `translate3d(${-scrollX * 0.5}px,0,0)`;
    $('#layer-far').style.transform = `translate3d(${-scrollX * 0.3}px,0,0)`;
    view.classList.toggle('at-start', scrollX < 2);
    view.classList.toggle('at-end', scrollX > maxScroll() - 2);
  }
  // Glide to the next screen (farm / square / park) in either direction.
  function scrollScreens(dir) {
    const w = viewW();
    scrollTarget = Math.max(0, Math.min(maxScroll(), (Math.round(scrollX / w) + dir) * w));
    panVel = 0;
  }
  const visible = () => ({ l: scrollX, r: scrollX + viewW(), mid: scrollX + viewW() / 2 });

  // Scenery taps fire on release, so a finger that starts on a house can still drag the town
  // along. Handlers are registered with on(); the innermost one under the finger wins.
  const tapFns = new Map();
  const on = (el, fn) => { if (el) tapFns.set(el, fn); };
  function fireTap(target, e) {
    for (let el = target; el && el !== view; el = el.parentElement) {
      const fn = tapFns.get(el);
      if (fn) { fn(e, el); return; }
    }
  }
  function setupPan() {
    let pan = null;
    view.addEventListener('pointerdown', e => {
      if (e.target.closest('.townie, .pan-btn')) return;
      e.preventDefault();
      scrollTarget = null; panVel = 0;
      pan = { id: e.pointerId, x0: e.clientX, y0: e.clientY, s0: scrollX, target: e.target, moved: false, lx: e.clientX, lt: performance.now(), v: 0 };
      try { view.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events have no live pointer */ }
    });
    view.addEventListener('pointermove', e => {
      if (!pan || e.pointerId !== pan.id) return;
      const dx = e.clientX - pan.x0;
      if (!pan.moved && Math.hypot(dx, e.clientY - pan.y0) > 10) pan.moved = true;
      if (!pan.moved) return;
      setScroll(pan.s0 - dx);
      const now = performance.now(), dt = (now - pan.lt) / 1000;
      if (dt > 0) pan.v = pan.v * 0.4 + (-(e.clientX - pan.lx) / dt) * 0.6;
      pan.lx = e.clientX; pan.lt = now;
    });
    const up = e => {
      if (!pan || e.pointerId !== pan.id) return;
      const p = pan; pan = null;
      if (!p.moved) fireTap(p.target, e);
      else if (performance.now() - p.lt < 80) panVel = Math.max(-3500, Math.min(3500, p.v));   // a fling keeps gliding
    };
    view.addEventListener('pointerup', up);
    view.addEventListener('pointercancel', up);
    $('#pan-left').addEventListener('click', () => { Sfx.tap(); scrollScreens(-1); });
    $('#pan-right').addEventListener('click', () => { Sfx.tap(); scrollScreens(1); });
    window.addEventListener('resize', () => { if (stage) setScroll(scrollX); });
  }

  // ---------- scenery reactions ----------
  let sceneryReady = false, night = false, yawnTimer = 3;
  function replay(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
  function centreOf(el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  // Repeating scenery effects register here so leaving the town stops them at
  // once, rather than letting them tick against a parked screen until their own
  // fallback timeout fires.
  const intervals = new Set();
  function every(fn, ms) { const id = setInterval(fn, ms); intervals.add(id); return id; }
  function stopEvery(id) { clearInterval(id); intervals.delete(id); }
  // #town-view is a static full-screen box, so measure it once per visit rather
  // than every frame of a drag. Invalidated on resize/rotate.
  let viewR = null;
  function viewRect() { return viewR || (viewR = view.getBoundingClientRect()); }
  window.addEventListener('resize', () => { viewR = null; });
  window.addEventListener('orientationchange', () => setTimeout(() => { viewR = null; }, 300));
  // An element's box in stage coordinates (what character positions use).
  function stageRect(el) {
    const r = el.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    return { x: r.left - sr.left, y: r.top - sr.top, w: r.width, h: r.height, cx: r.left - sr.left + r.width / 2, cy: r.top - sr.top + r.height / 2, bottom: r.bottom - sr.top, right: r.right - sr.left };
  }
  function everyoneLaughs(nearX, nearY, radius) {
    townies.forEach(t => { if (free(t) && Math.hypot(t.x - nearX, t.y - nearY) < radius) laugh(t); });
  }
  // Knock everyone within `reach` of a point outwards (sneezes, the geyser, the rocket).
  function blowAway(x, y, reach, strength, except) {
    const W = stage.clientWidth, H = stage.clientHeight;
    townies.filter(o => o !== except && o.state !== 'drag' && !o.ride).forEach(o => {
      const d = Math.hypot(o.x - x, o.y - y);
      if (d >= reach) return;
      const ang = Math.atan2(o.y - y, o.x - x), push = strength * (1 - d / (reach * 1.25));
      endConvo(o);
      o.img.classList.remove('tumble'); void o.img.offsetWidth; o.img.classList.add('tumble');
      showBubble(o, '!', 900);
      let nx = o.x + Math.cos(ang) * push, ny = o.y + Math.sin(ang) * push;
      nx = Math.max(40, Math.min(W - 40, nx)); ny = Math.max(H * GROUND_TOP, Math.min(H * GROUND_BOT, ny));
      tween(o, nx, ny, 0.7, { arc: 60 });
    });
  }
  // Something floats up and away from a point (cupcakes, ice creams).
  function floatOut(sx, sy, items, spread) {
    items.forEach((item, i) => setTimeout(() => {
      if (!running) return;
      const b = document.createElement('b');
      b.className = 'floaty'; b.textContent = item;
      b.style.cssText = `left:${sx + (Math.random() - 0.5) * spread}px; top:${sy}px; --dx:${((Math.random() - 0.5) * 10).toFixed(0)}vh; --r:${((Math.random() - 0.5) * 60).toFixed(0)}deg`;
      stage.appendChild(b);
      b.addEventListener('animationend', () => b.remove());
    }, i * 220));
  }
  // A bird flaps across the visible part of the sky from a point (stage coordinates).
  function sendBird(sx, sy, toRight) {
    const v = visible();
    const el = document.createElement('div');
    el.className = 'bird' + (toRight ? '' : ' left');
    el.style.cssText = `left:${sx}px; top:${sy}px; --dx:${toRight ? v.r - sx + 80 : -(sx - v.l + 80)}px`;
    el.innerHTML = '<i></i><i></i>';
    stage.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  const randomChar = () => CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
  // A letter card pops out of the scenery at a point (stage coordinates) and says its name –
  // the town's little reading moments (doorways, the cow, the post box's cousin).
  function popLetter(sx, sy, z, ch = randomChar()) {
    const card = document.createElement('div');
    card.className = 'letter-pop';
    card.style.cssText = `left:${sx}px; top:${sy}px; --c:${ch.color}; z-index:${z}`;
    card.textContent = ch.letter;
    stage.appendChild(card);
    card.addEventListener('animationend', () => card.remove());
    setTimeout(() => card.remove(), 3000);
    Voice.say(`${ch.letter}!`, { key: `${ch.letter}-tick` });
    return ch;
  }

  // Night falls: sun sets, moon and stars come out, windows glow, fireflies drift.
  function setNight(on) {
    if (night === on) return;
    night = on;
    view.classList.toggle('night', on);
    if (on) { Sfx.owl(); yawnTimer = 2; }
    else { Sfx.rooster(); townies.forEach(t => { if (t.bubble.textContent === '💤') t.bubble.classList.add('hidden'); }); }
  }
  function sprinkle(container, n, make) {
    if (container.childElementCount) return;
    for (let i = 0; i < n; i++) { const s = document.createElement('i'); make(s, i); container.appendChild(s); }
  }

  // A beanstalk that draws itself up from a flower patch, sprouts leaves, then wilts away.
  function growBeanstalk(flowerEl) {
    if (flowerEl.stalk) return;
    const fr = stageRect(flowerEl);
    const H = stage.clientHeight;
    const x = fr.cx, base = fr.y + fr.h * 0.75;
    const width = H * 0.15, height = base - H * 0.05;
    const el = document.createElement('div');
    el.className = 'beanstalk';
    el.style.cssText = `left:${x - width / 2}px; top:${base - height}px; width:${width}px; height:${height}px`;
    const vh = Math.round(height / width * 100), segs = Math.max(4, Math.round(vh / 70)), seg = vh / segs;
    let d = `M50 ${vh}`, leaves = '';
    for (let i = 1; i <= segs; i++) {
      const y = vh - i * seg, side = i % 2 ? 1 : -1;
      d += ` Q${50 + side * 32} ${y + seg / 2} 50 ${y}`;
      if (i < segs) leaves += `<g transform="translate(50 ${y})"><g class="leaf" style="transition-delay:${(i / segs * 1.7).toFixed(2)}s">`
        + `<ellipse cx="${side * 18}" cy="0" rx="18" ry="8" transform="rotate(${side * -28})"/><path d="M0 0 L${side * 31} ${-11}" /></g></g>`;
    }
    el.innerHTML = `<svg viewBox="0 0 100 ${vh}"><path class="stem" d="${d}"/>${leaves}<g transform="translate(50 6)"><g class="leaf tip" style="transition-delay:1.75s"><path d="M0 0 c-14 -8 -10 -20 2 -16 c8 3 4 14 -4 12" /></g></g></svg>`;
    stage.appendChild(el);
    flowerEl.stalk = el;
    const stem = el.querySelector('.stem'), len = stem.getTotalLength();
    stem.style.strokeDasharray = len; stem.style.strokeDashoffset = len;
    Sfx.grow();
    requestAnimationFrame(() => requestAnimationFrame(() => { stem.style.strokeDashoffset = 0; el.classList.add('grown'); }));
    setTimeout(() => { if (running) { const c = centreOf(el); Fx.burst(c.x, c.y - height / 2, '#7ed957', 24); Sfx.sparkle(); } }, 1900);
    setTimeout(() => el.classList.add('wilt'), 8000);
    setTimeout(() => { el.remove(); flowerEl.stalk = null; }, 9200);
  }

  function setupScenery() {
    if (sceneryReady) return;
    sceneryReady = true;
    setupPan();
    // Any one-shot scenery animation clears itself when done.
    view.querySelectorAll('.sun, .moon, .house, .tree, .flowers, .fountain, .pond, .patch, .scarecrow, .barn, .station, .swing, .slide, .van, .pigpen, .bench, .balloons, .sandpit').forEach(el =>
      el.addEventListener('animationend', ev => { if (ev.target === el) el.classList.remove('tapped'); }));

    // Night sky decorations, made once.
    sprinkle($('#stars'), 48, s => { s.style.cssText = `left:${Math.random() * 100}%; top:${Math.random() * 45}%; --s:${(0.5 + Math.random()).toFixed(2)}; animation-delay:${-(Math.random() * 3).toFixed(2)}s; animation-duration:${(1.5 + Math.random() * 2).toFixed(2)}s`; });
    sprinkle($('#fireflies'), 40, s => { s.style.cssText = `left:${2 + Math.random() * 96}%; top:${52 + Math.random() * 38}%; --dx:${((Math.random() - 0.5) * 12).toFixed(1)}vh; --dy:${((Math.random() - 0.5) * 8).toFixed(1)}vh; animation-duration:${(3 + Math.random() * 4).toFixed(2)}s; animation-delay:${-(Math.random() * 5).toFixed(2)}s`; });

    // Sun: flares, then sets – night falls. Moon: tap for sunrise.
    on(view.querySelector('.sun'), (e, el) => {
      replay(el, 'tapped');
      const c = centreOf(el);
      Fx.burst(c.x, c.y, '#ffd93b', 36);
      Sfx.sparkle();
      setTimeout(() => townies.forEach(t => { if (free(t) && Math.random() < 0.5) laugh(t); }), 300);
      setTimeout(() => setNight(true), 500);
    });
    on(view.querySelector('.moon'), (e, el) => {
      replay(el, 'tapped');
      const c = centreOf(el);
      Fx.burst(c.x, c.y, '#ffffff', 24);
      Sfx.sparkle();
      setTimeout(() => setNight(false), 400);
    });

    // Empty sky: a bird flies past by day, a shooting star by night.
    on(view.querySelector('.sky'), e => {
      const p = stagePoint(e), W = viewW();
      if (night) {
        const el = document.createElement('div');
        el.className = 'shooting-star';
        el.style.cssText = `left:${p.x}px; top:${p.y}px`;
        stage.appendChild(el);
        el.addEventListener('animationend', () => el.remove());
        Sfx.shoot();
        setTimeout(() => Fx.burst(e.clientX + W * 0.22, e.clientY + W * 0.11, '#ffffff', 12), 700);
      } else {
        sendBird(p.x, p.y, p.x < visible().mid);
        Sfx.chirp(); setTimeout(Sfx.chirp, 1400);
      }
    });

    // Houses: knock knock – lights come on, the door swings open and a letter pops out to say hello.
    stage.querySelectorAll('.house').forEach(h => on(h, (e, el) => {
      replay(el, 'tapped');
      el.classList.toggle('lit');
      Sfx.knock();
      if (el.classList.contains('lit')) setTimeout(Sfx.tap, 350);
      const c = centreOf(el);
      Fx.burst(c.x, c.y - 10, el.classList.contains('lit') ? '#fff176' : '#ffffff', 10);
      setTimeout(() => { if (running) { const d = stageRect(el.querySelector('.door')); popLetter(d.cx, d.y, Math.round(stageRect(el).bottom) + 1); } }, 400);
    }));

    // The tower flag: each tap flies a new colour.
    on(stage.querySelector('.flag'), (e, flag) => {
      const next = LETTER_COLORS[(LETTER_COLORS.indexOf(flag.style.getPropertyValue('--flag').trim()) + 1) % LETTER_COLORS.length];
      flag.style.setProperty('--flag', next);
      Sfx.ding();
      const c = centreOf(flag); Fx.burst(c.x, c.y - 20, next, 10);
    });

    // Trees: shake and drop leaves.
    stage.querySelectorAll('.tree').forEach(t => on(t, (e, el) => {
      replay(el, 'tapped');
      const c = centreOf(el);
      Fx.leaves(c.x, c.y - 20);
      Sfx.whoosh();
    }));

    // Flowers: dance, puff petals, and send a beanstalk up into the sky.
    stage.querySelectorAll('.flowers').forEach(f => on(f, (e, el) => {
      replay(el, 'tapped');
      const c = centreOf(el);
      Fx.burst(c.x, c.y, getComputedStyle(el).getPropertyValue('--f').trim() || '#ff6b9d', 18);
      Sfx.chime();
      growBeanstalk(el);
    }));

    // Fountain: a geyser shoots to the sky and rains back down, knocking nearby friends over.
    on($('#fountain'), (e, el) => {
      replay(el, 'tapped');
      const c = centreOf(el);
      Fx.burst(c.x, c.y - 10, '#7fd4ff', 30);
      Sfx.splash();
      if (el.classList.contains('geysering')) return;
      el.classList.add('geysering');
      Sfx.geyser();
      const r = stageRect(el), top = c.y - stage.clientHeight * 0.55;
      setTimeout(() => Fx.fountainDrops(c.x, top, 1400), 550);
      setTimeout(() => { if (running) { Sfx.splash(); blowAway(r.cx, r.cy, viewW() * 0.3, viewW() * 0.18); } }, 2100);
      el.querySelector('.geyser').addEventListener('animationend', () => el.classList.remove('geysering'), { once: true });
    });

    // Speed up every animation inside an element for a while, without any jump in position.
    const speedUp = (el, rate, ms) => {
      const anims = el.getAnimations({ subtree: true });
      anims.forEach(a => a.playbackRate = rate);
      setTimeout(() => anims.forEach(a => a.playbackRate = 1), ms);
    };

    // Windmill: sails whirl and a gust blows across the farm.
    on(stage.querySelector('.windmill'), (e, el) => {
      replay(el, 'tapped');
      speedUp(el.querySelector('.sails'), 6, 3000);
      Sfx.whoosh(); setTimeout(Sfx.whoosh, 500); setTimeout(Sfx.whoosh, 1000);
      const c = centreOf(el), r = stageRect(el);
      Fx.leaves(c.x + 20, c.y - 30, 16, ['#ffffff', '#e6f7ff', '#f3d9a4', '#dfe6ee']);
      setTimeout(() => { if (running) blowAway(r.cx, r.cy + stage.clientHeight * 0.12, viewW() * 0.28, viewW() * 0.1); }, 600);
    });

    // Ferris wheel: spins fast with flashing lights and a fairground tune.
    on(stage.querySelector('.ferris'), (e, el) => {
      if (el.classList.contains('fast')) return;
      el.classList.add('fast');
      speedUp(el, 5, 4200);
      Sfx.carnival();
      setTimeout(() => el.classList.remove('fast'), 4200);
      const c = centreOf(el.querySelector('.wheel'));
      Fx.burst(c.x, c.y, '#fff176', 24);
      setTimeout(() => townies.forEach(t => { if (free(t) && Math.random() < 0.6) laugh(t); }), 800);
    });

    // Bakery: the awning flaps, the door opens and cupcakes float out.
    on(stage.querySelector('.shop'), (e, el) => {
      replay(el, 'tapped');
      Sfx.knock(); setTimeout(Sfx.chime, 300);
      const r = stageRect(el);
      floatOut(r.cx, r.y + r.h * 0.3, ['🧁', '🍪', '🍩', '🧁'], r.w * 0.5);
      setTimeout(() => everyoneLaughs(r.cx, r.bottom, viewW() * 0.3), 700);
    });

    // Post box: a letter pops out – a random letter of the alphabet, which it reads aloud.
    on($('#postbox'), (e, el) => {
      replay(el, 'tapped');
      Sfx.pop();
      const ch = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
      const r = stageRect(el);
      const env = document.createElement('div');
      env.className = 'envelope';
      env.style.cssText = `left:${r.cx}px; top:${r.y}px; --c:${ch.color}; z-index:${Math.round(r.bottom) + 1}`;
      env.innerHTML = `<span>${ch.letter}</span>`;
      stage.appendChild(env);
      env.addEventListener('animationend', () => env.remove());
      setTimeout(() => Voice.say(`${ch.letter}!`, { key: `${ch.letter}-tick` }), 350);
    });

    // Lamp post: switches on (it lights itself at night); tap for a flicker and a few moths.
    on($('#lamp'), (e, el) => {
      replay(el, 'tapped');
      if (!night) el.classList.toggle('on');
      Sfx.click();
      const c = centreOf(el.querySelector('.light'));
      if (night || el.classList.contains('on')) Fx.burst(c.x, c.y, '#fff8c0', 8);
    });

    // Bench: the sleeping cat wakes with a stretch and a meow, leaps after a butterfly, then
    // hops back up for another nap.
    on($('#bench'), (e, el) => {
      replay(el, 'tapped');
      if (el.classList.contains('awake')) { Sfx.meow(); return; }
      el.classList.add('awake');
      const cat = el.querySelector('.cat'), r = stageRect(el);
      setTimeout(() => { if (running) Sfx.meow(); }, 150);
      setTimeout(() => { if (running) { const c = stageRect(cat); floatOut(c.cx + 20, c.y - 10, ['🦋'], 0); Sfx.chime(); } }, 1200);
      setTimeout(() => { if (running) Sfx.boing(); }, 1900);
      setTimeout(() => { if (running) Sfx.tap(); }, 2800);
      setTimeout(() => { if (running) Sfx.meow(); }, 3100);
      setTimeout(() => everyoneLaughs(r.cx, r.bottom, viewW() * 0.25), 2300);
      setTimeout(() => el.classList.remove('awake'), 4000);
    });

    // Balloon cart: one balloon slips its string and floats up into the sky carrying a letter
    // (which it says), then pops at the top. The bunch grows a new one.
    on($('#balloons'), (e, el) => {
      replay(el, 'tapped');
      const spare = [...el.querySelectorAll('.bunch b:not(.gone)')];
      Sfx.zip();
      if (!spare.length) return;
      const b = spare[Math.floor(Math.random() * spare.length)];
      const r = stageRect(b);
      b.classList.add('gone');
      setTimeout(() => b.classList.remove('gone'), 2500);
      const ch = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
      const bl = document.createElement('div');
      bl.className = 'loose-balloon';
      bl.style.cssText = `left:${r.cx}px; top:${r.cy}px; --c:${ch.color}; z-index:${Math.round(stageRect(el).bottom) + 1}`;
      bl.textContent = ch.letter;
      stage.appendChild(bl);
      setTimeout(() => Voice.say(`${ch.letter}!`, { key: `${ch.letter}-tick` }), 500);
      const er = stageRect(el);
      setTimeout(() => townies.forEach(t => { if (free(t) && Math.hypot(t.x - er.cx, t.y - er.bottom) < viewW() * 0.4) showBubble(t, '🎈', 1400); }), 700);
      bl.addEventListener('animationend', () => {
        const c = centreOf(bl); bl.remove();
        if (!running) return;
        Sfx.pop(); Fx.burst(c.x, c.y, ch.color, 18);
      });
      setTimeout(() => bl.remove(), 4000);
    });

    // Hot-air balloon: swings and drops confetti.
    on(view.querySelector('.balloon-ride'), (e, el) => {
      const ride = el.querySelector('.ride');
      replay(ride, 'tapped');
      Sfx.chime(); setTimeout(Sfx.sparkle, 200);
      const c = centreOf(ride.querySelector('.basket'));
      Fx.burst(c.x, c.y, null, 34);
      setTimeout(() => Fx.burst(c.x, c.y + 10, null, 20), 300);
    });

    // Clouds: tap to make it rain for a moment – and a rainbow follows by day.
    view.querySelectorAll('.cloud').forEach(cl => on(cl, (e, el) => {
      if (el.classList.contains('tapped')) return;
      el.classList.add('tapped');                       // clouds keep drifting, so no animation to wait for
      setTimeout(() => el.classList.remove('tapped'), 1800);
      const r = el.getBoundingClientRect();
      Fx.rain(r.left, r.right, r.bottom, 1600);
      Sfx.rain();
      setTimeout(() => {
        if (night || !running) return;
        const rb = $('#rainbow'); rb.classList.add('show'); Sfx.chime();
        setTimeout(() => rb.classList.remove('show'), 5000);
      }, 1900);
    }));

    // ----- the farm -----
    // Duck pond: the duck flaps and quacks, a frog hops across, a fish jumps.
    on($('#pond'), (e, el) => {
      replay(el, 'tapped');
      const c = centreOf(el), r = stageRect(el);
      Fx.burst(c.x, c.y, '#bfe9ff', 16);
      Sfx.quack();
      setTimeout(Sfx.ribbit, 500); setTimeout(Sfx.ribbit, 1250);
      setTimeout(() => { if (running) { Sfx.splash(); Fx.burst(c.x + r.w * 0.15, c.y - 10, '#ffffff', 12); } }, 1300);
      setTimeout(() => everyoneLaughs(r.cx, r.cy, viewW() * 0.25), 1000);
    });

    // Barn: the doors swing open and the cow comes out for a moo; the rooster vane spins.
    on($('#barn'), (e, el) => {
      replay(el, 'tapped');
      Sfx.knock();
      const c = centreOf(el);
      Fx.leaves(c.x, c.y, 10, ['#f3d9a4', '#e6c07b', '#fff3c4']);   // hay
      if (el.classList.contains('open')) return;
      el.classList.add('open');
      setTimeout(() => { if (running) Sfx.moo(); }, 500);
      setTimeout(() => { if (running) { const h = stageRect(el.querySelector('.cow .head')); popLetter(h.cx, h.y - 8, Math.round(stageRect(el).bottom) + 1); } }, 1400);
      setTimeout(() => { if (running) Sfx.moo(); }, 2600);
      setTimeout(() => el.classList.remove('open'), 4200);
      const r = stageRect(el);
      setTimeout(() => everyoneLaughs(r.cx, r.bottom, viewW() * 0.3), 900);
    });

    // Veggie patch: a rabbit pops up, hops along the row, nibbles a carrot and dives back down.
    on($('#patch'), (e, el) => {
      replay(el, 'tapped');
      Sfx.pop();
      if (el.classList.contains('busy')) return;
      el.classList.add('busy');
      [1500, 1900, 2300].forEach(ms => setTimeout(() => { if (running) Sfx.munch(); }, ms));
      setTimeout(() => { if (running) { Sfx.pop(); const c = centreOf(el); Fx.burst(c.x - 20, c.y, '#8d5a2b', 8); } }, 3200);
      setTimeout(() => el.classList.remove('busy'), 3500);
    });

    // Scarecrow: spins on its pole and startles two crows into the sky – and its sign comes
    // round showing a new letter, which it reads out.
    const sign = $('#scarecrow .sign');
    const setSign = ch => { sign.textContent = ch.letter; sign.style.setProperty('--l', ch.color); return ch; };
    setSign(randomChar());
    on($('#scarecrow'), (e, el) => {
      replay(el, 'tapped');
      Sfx.caw(); setTimeout(Sfx.whoosh, 200);
      const r = stageRect(el);
      sendBird(r.cx - 20, r.y - 10, false);
      setTimeout(() => { if (running) sendBird(r.cx + 20, r.y - 30, true); }, 250);
      const next = randomChar();
      setTimeout(() => { if (running) setSign(next); }, 450);                 // swapped while the sign is edge-on
      setTimeout(() => {
        if (!running) return;
        Voice.say(`${next.letter}!`, { key: `${next.letter}-tick` });
        const c = centreOf(sign); Fx.burst(c.x, c.y, next.color, 12); Sfx.ding();
      }, 900);
    });

    // Sheep: baas and leaps over the fence (and back again next time). At night, watching a
    // sheep jump makes the friends nearby sleepy.
    on($('#paddock'), (e, el) => {
      Sfx.baa();
      if (el.classList.contains('jumping')) return;
      el.classList.add('jumping');
      const r = stageRect(el), landX = el.classList.contains('over') ? r.x + r.w * 0.16 : r.x + r.w * 0.84;
      setTimeout(() => { if (running) Sfx.boing(); }, 250);
      setTimeout(() => {
        if (!running) return;
        Sfx.tap();
        const sr = stage.getBoundingClientRect();
        Fx.leaves(sr.left + landX, sr.top + r.bottom - 6, 8, ['#7ed957', '#3fa34d', '#a3e635']);
        if (night) townies.forEach(t => { if (free(t) && Math.hypot(t.x - r.cx, t.y - r.cy) < viewW() * 0.4) showBubble(t, '💤', 1800); });
        else everyoneLaughs(r.cx, r.bottom, viewW() * 0.25);
      }, 1250);
      setTimeout(() => { el.classList.toggle('over'); el.classList.remove('jumping'); }, 1450);
    });

    // Hen coop: the hens flap and cluck, an egg rolls out, wobbles, cracks – and a chick pops out.
    on($('#coop'), (e, el) => {
      replay(el, 'tapped');
      Sfx.cluck();
      if (el.classList.contains('laying')) return;
      el.classList.add('laying');
      const r = stageRect(el), c = centreOf(el);
      setTimeout(() => { if (running) Sfx.pop(); }, 400);
      [2000, 2400, 2800].forEach(ms => setTimeout(() => { if (running) Sfx.crack(); }, ms));
      setTimeout(() => { if (running) { Sfx.pop(); Fx.burst(c.x + r.w * 0.32, c.y, '#fff8e7', 10); } }, 3050);
      [3300, 3800, 4300].forEach(ms => setTimeout(() => { if (running) Sfx.chirp(); }, ms));
      setTimeout(() => everyoneLaughs(r.cx, r.bottom, viewW() * 0.25), 3400);
      setTimeout(() => el.classList.remove('laying'), 5100);
    });

    // Tractor: toots its horn, puffs smoke and chugs forward, then beeps as it reverses back.
    on($('#tractor'), (e, el) => {
      Sfx.honk();
      if (el.classList.contains('driving')) return;
      el.classList.add('driving');
      setTimeout(() => { if (running) Sfx.chug(); }, 300);
      const pipe = el.querySelector('.pipe');
      const puffs = every(() => { if (!running) return; const c = centreOf(pipe); Fx.burst(c.x, c.y - 14, '#cfd8dc', 4); }, 260);
      [2500, 2900, 3300].forEach(ms => setTimeout(() => { if (running) Sfx.beep(); }, ms));
      const r = stageRect(el);
      setTimeout(() => everyoneLaughs(r.cx, r.bottom, viewW() * 0.3), 900);
      const done = () => { el.classList.remove('driving'); stopEvery(puffs); };
      el.addEventListener('animationend', ev => { if (ev.target === el) done(); }, { once: true });
      setTimeout(done, 4600);
    });

    // Pig pen: the pig oinks and bounces in the mud – getting muddy, then shaking it off next time.
    on($('#pigpen'), (e, el) => {
      replay(el, 'tapped');
      Sfx.oink();
      const mud = el.querySelector('.mud'), c = centreOf(mud), r = stageRect(el);
      setTimeout(() => { if (running) Sfx.oink(); }, 500);
      [520, 940].forEach(ms => setTimeout(() => {
        if (!running) return;
        Sfx.splash();
        Fx.burst(c.x, c.y - 6, '#8d5a2b', 12);
        if (ms === 520) el.classList.toggle('muddy');
      }, ms));
      setTimeout(() => everyoneLaughs(r.cx, r.bottom, viewW() * 0.25), 900);
    });

    // ----- the park -----
    // Station: ring the bell and the train comes through, chugging right across the whole town.
    const train = $('#train');
    on($('#station'), (e, el) => {
      replay(el, 'tapped');
      Sfx.bell();
      if (train.classList.contains('running')) return;
      setTimeout(() => { if (running) startTrain(); }, 600);
    });
    function startTrain() {
      train.classList.add('running');
      townies.forEach(t => t.waved = false);
      Sfx.whistle();
      // The carriages spell a three-letter word this trip: each letter is read out as it comes
      // into view, then the whole word – which the station board shows too.
      const word = TRAIN_WORDS[Math.floor(Math.random() * TRAIN_WORDS.length)];
      const picks = [...word.toUpperCase()].map(L => CHARACTERS.find(c => c.letter === L));
      train.querySelectorAll('.carriage span').forEach((sp, i) => { sp.textContent = picks[i].letter; sp.style.setProperty('--l', picks[i].color); });
      const board = $('#station .board');
      board.textContent = `🚂 ${word.toUpperCase()}`;
      const onTrip = () => running && train.classList.contains('running');
      picks.forEach((ch, i) => setTimeout(() => { if (onTrip()) Voice.say(`${ch.letter}!`, { key: `${ch.letter}-tick` }); }, 1000 + i * 700));
      setTimeout(() => {
        if (!onTrip()) return;
        Voice.say(`${word}!`, { key: `word-${word}` });
        replay(board, 'pop');
        const r = stageRect(train);
        townies.forEach(t => { if (free(t) && Math.abs(t.x - r.cx) < viewW() * 0.6) showBubble(t, word + '!', 1600); });
      }, 1000 + 3 * 700 + 200);
      const chimney = train.querySelector('.chimney');
      const puffs = every(() => {
        if (!running) return;
        const r = stageRect(chimney);
        const p = document.createElement('div');
        p.className = 'train-smoke';
        p.style.cssText = `left:${r.cx}px; top:${r.y}px`;
        stage.appendChild(p);
        p.addEventListener('animationend', () => p.remove());
        setTimeout(() => p.remove(), 2500);
        Sfx.puff();
      }, 380);
      [7000, 14000].forEach(ms => setTimeout(() => { if (running) Sfx.whistle(); }, ms));
      const done = () => { train.classList.remove('running'); clearInterval(puffs); board.textContent = '🚂 ABC'; };
      train.addEventListener('animationend', done, { once: true });
      setTimeout(done, 24000);   // in case the animation never finishes (backgrounded tab)
    }

    // Swing: swings up high (the teddy hangs on).
    on($('#swing'), (e, el) => {
      replay(el, 'tapped');
      Sfx.whee(); setTimeout(() => { if (running) Sfx.whee(); }, 1300);
      const c = centreOf(el.querySelector('.rider'));
      setTimeout(() => Fx.burst(c.x, c.y - 30, '#ffd93b', 10), 400);
    });

    // Slide: the nearest friend runs over, climbs the ladder and whooshes down.
    on($('#slide'), (e, el) => {
      replay(el, 'tapped');
      Sfx.tap();
      if (el.rider) return;
      const r = stageRect(el);
      const near = townies.filter(free).sort((p, q) => Math.hypot(p.x - r.cx, p.y - r.bottom) - Math.hypot(q.x - r.cx, q.y - r.bottom))[0];
      if (!near) return;
      const t = near;
      el.rider = t; t.ride = el;
      endConvo(t); t.state = 'idle'; t.busy = 0;
      t.zBoost = Number(el.style.zIndex) + 1; t.scaleY = r.bottom;
      const foot = { x: r.x + r.w * 0.12, y: r.bottom + 2 }, top = { x: r.x + r.w * 0.16, y: r.y + r.h * 0.03 }, end = { x: r.right + 14, y: r.bottom + 2 };
      const finish = () => { t.ride = null; el.rider = null; t.zBoost = 0; t.scaleY = 0; t.timer = rand(1, 3); };
      setWalking(t, true); face(t, foot.x);
      const dist = Math.hypot(foot.x - t.x, foot.y - t.y);
      tween(t, foot.x, foot.y, Math.min(2.2, 0.3 + dist / 260), { linear: true, done: () => {
        setWalking(t, false); t.dir = 1; Sfx.boing(); showBubble(t, '⬆', 900);
        tween(t, top.x, top.y, 1.0, { linear: true, done: () => {
          Sfx.whee(); showBubble(t, 'wheee!', 1200);
          t.img.classList.remove('lean'); void t.img.offsetWidth; t.img.classList.add('lean');
          tween(t, end.x, end.y, 0.75, { easeIn: true, done: () => {
            t.img.classList.remove('land'); void t.img.offsetWidth; t.img.classList.add('land');
            laugh(t); Sfx.giggle();
            const c = centreOf(t.el); Fx.burst(c.x, c.y, '#ffd93b', 12);
            finish();
          } });
        } });
      } });
    });

    // Ice-cream van: the jingle plays, the hatch opens and ice creams float out.
    on($('#van'), (e, el) => {
      replay(el, 'tapped');
      Sfx.jingle();
      el.classList.add('serving');
      setTimeout(() => el.classList.remove('serving'), 2600);
      const r = stageRect(el);
      setTimeout(() => floatOut(r.x + r.w * 0.28, r.y + r.h * 0.25, ['🍦', '🍧', '🍨', '🍦'], r.w * 0.2), 400);
      setTimeout(() => everyoneLaughs(r.cx, r.bottom, viewW() * 0.3), 900);
    });

    // Rocket: 3… 2… 1… blast off! It roars into the sky, then floats back down under a parachute.
    on($('#rocket'), (e, el) => {
      Sfx.tap();
      if (el.classList.contains('busy')) return;
      el.classList.add('busy');
      const rocket = el.querySelector('.rocket');
      replay(rocket, 'wobble');
      ['3', '2', '1'].forEach((n, i) => setTimeout(() => {
        if (!running) return;
        Sfx.beep();
        const r = stageRect(rocket);
        const d = document.createElement('div');
        d.className = 'count'; d.textContent = n;
        d.style.cssText = `left:${r.cx}px; top:${r.y - 20}px`;
        stage.appendChild(d);
        d.addEventListener('animationend', () => d.remove());
        setTimeout(() => d.remove(), 1500);
      }, 300 + i * 750));
      const liftoff = 300 + 3 * 750;
      setTimeout(() => {
        rocket.classList.remove('wobble');
        el.classList.add('launch');
        if (!running) return;
        Sfx.blast();
        const c = centreOf(rocket), r = stageRect(el);
        let n = 0;
        const smoke = every(() => { Fx.burst(c.x + (Math.random() - 0.5) * 30, c.y + 30, n % 2 ? '#e0e0e0' : '#ffffff', 6); if (++n > 12) stopEvery(smoke); }, 90);
        setTimeout(() => { if (running) blowAway(r.cx, r.bottom, viewW() * 0.22, viewW() * 0.14); }, 500);
        setTimeout(() => townies.forEach(t => { if (free(t) && Math.hypot(t.x - r.cx, t.y - r.bottom) < viewW() * 0.5) { showBubble(t, '🚀', 1500); } }), 900);
      }, liftoff);
      setTimeout(() => { el.classList.remove('launch'); el.classList.add('return'); if (running) Sfx.whoosh(); }, liftoff + 4200);
      setTimeout(() => {
        el.classList.remove('return', 'busy'); replay(el, 'landed');
        setTimeout(() => el.classList.remove('landed'), 800);
        if (!running) return;
        Sfx.boing(); setTimeout(Sfx.chime, 200);
        const c = centreOf(rocket); Fx.burst(c.x, c.y + 40, '#e0e0e0', 14);
        const r = stageRect(el);
        everyoneLaughs(r.cx, r.bottom, viewW() * 0.4);
      }, liftoff + 4200 + 5500);
    });

    // Sandpit: a sandcastle builds itself tier by tier with a flag on top; tap again and it crumbles.
    on($('#sandpit'), (e, el) => {
      replay(el, 'tapped');
      const castle = el.querySelector('.castle'), r = stageRect(el);
      if (el.classList.toggle('built')) {
        [0, 350, 700].forEach(ms => setTimeout(() => { if (running) Sfx.pop(); }, ms));
        setTimeout(() => { if (running) { Sfx.chime(); const c = centreOf(castle); Fx.burst(c.x, c.y - 30, '#ffd93b', 14); } }, 1100);
        setTimeout(() => everyoneLaughs(r.cx, r.bottom, viewW() * 0.25), 1300);
      } else {
        Sfx.whoosh();
        const c = centreOf(castle);
        Fx.burst(c.x, c.y + 10, '#e6c27a', 20);
        setTimeout(() => townies.forEach(t => { if (free(t) && Math.hypot(t.x - r.cx, t.y - r.bottom) < viewW() * 0.25) showBubble(t, '!', 900); }), 200);
      }
    });

    // See-saw: the plank flips and launches the teddy high into the air; it lands with a bounce.
    on($('#seesaw'), (e, el) => {
      Sfx.boing();
      if (el.classList.contains('fly')) return;
      el.classList.add('fly', 'tilt');
      const rider = el.querySelector('.rider'), r = stageRect(el);
      setTimeout(() => { if (running) Sfx.whee(); }, 200);
      setTimeout(() => {
        el.classList.remove('tilt');
        if (!running) return;
        Sfx.boing();
        const c = centreOf(rider); Fx.burst(c.x, c.y, '#ffd93b', 10);
        everyoneLaughs(r.cx, r.bottom, viewW() * 0.3);
      }, 1750);
      setTimeout(() => el.classList.remove('fly'), 2300);
    });

    // Everything standing on the ground is sorted by its base, like the characters.
    stage.querySelectorAll('.grounded').forEach(el => { el.style.zIndex = Math.round(stageRect(el).bottom); });
  }

  function enter(opts = {}) {
    view = $('#town-view'); stage = $('#town-stage'); layer = $('#townies'); trainEl = $('#train');
    clearTimeout(parkTimer); view.classList.remove('parked');
    focusLetter = opts.focus || null;
    setupScenery();
    layer.innerHTML = ''; townies = []; dragging = null;
    stage.querySelectorAll('.slide').forEach(s => { s.rider = null; });
    const list = CHARACTERS.filter(c => App.isUnlocked(c.letter));
    $('#town-empty').classList.toggle('hidden', list.length > 0);
    // Spread the friends across the whole town: everyone gets their own slot, shuffled.
    const slots = list.map((_, i) => i).sort(() => Math.random() - 0.5);
    list.forEach((c, i) => setTimeout(() => running && add(c, slots[i] / list.length, 1 / list.length), i * 120));
    running = true; last = performance.now(); convoTimer = 2;
    setScroll(viewW());   // open on the square
    scrollTarget = null; panVel = 0;
    cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
  }
  // Leaving: stop the simulation, and once the screen has faded out take the town out of the
  // page entirely (display: none) – otherwise its animations keep the whole app busy.
  let parkTimer = 0;
  function leave() {
    running = false; cancelAnimationFrame(raf); convoId++;
    intervals.forEach(clearInterval); intervals.clear();
    viewR = null;
    if (!view) return;
    clearTimeout(parkTimer);
    parkTimer = setTimeout(() => { if (!running) { layer.innerHTML = ''; townies = []; view.classList.add('parked'); } }, 450);
  }

  // Characters are inlined as SVG (not <img>) so their parts – arms, eyes, rays, toast – can
  // be animated individually by css when they react.
  const spriteCache = {};
  function sprite(c) {
    return spriteCache[c.file] || (spriteCache[c.file] = fetch(c.img).then(r => r.text()));
  }

  function add(c, slot, slotW) {
    sprite(c).then(svg => { if (running) place(c, svg, slot, slotW); });
  }

  function place(c, svg, slot = Math.random(), slotW = 0) {
    const el = document.createElement('div');
    el.className = 'townie arrive';
    el.innerHTML = `<div class="townie-body"><div class="flip">${svg}</div>`
      + `<div class="letter-badge" style="--c:${c.color}">${c.letter}</div><div class="bubble hidden"></div></div>`;
    const img = el.querySelector('svg');
    img.setAttribute('class', 'char');
    img.setAttribute('aria-label', c.name);
    const W = stage.clientWidth, H = stage.clientHeight;
    let x = Math.max(80, Math.min(W - 80, W * (slot + slotW * rand(0.15, 0.85))));
    if (c.letter === focusLetter) x = W / 2 + rand(-viewW() * 0.3, viewW() * 0.3);   // the new friend arrives in view
    const t = {
      c, el, flip: el.querySelector('.flip'), img, bubble: el.querySelector('.bubble'),
      x, y: rand(H * GROUND_TOP, H * GROUND_BOT), tx: 0, ty: 0,
      state: 'idle', timer: rand(0.5, 2.5), dir: Math.random() < 0.5 ? 1 : -1, speed: rand(45, 75),
      busy: 0, tween: null, partner: null, chase: null, zBoost: 0, scaleY: 0, ride: null,
    };
    el.addEventListener('pointerdown', e => startDrag(t, e));
    // One-shot body animations come off when they finish so walking/idle can resume. Part
    // animations inside the svg bubble up too, so only listen to the svg's own.
    img.addEventListener('animationend', ev => {
      if (ev.target !== img) return;
      const keep = ['char', 'walking', 'act'].filter(k => img.classList.contains(k));
      img.setAttribute('class', keep.join(' '));
    });
    layer.appendChild(el); townies.push(t); render(t);
    // The letter badge hugs the top of the drawing: find where the art starts in the 240-unit
    // viewBox (ignoring the hidden effects layer and the ground shadow) and tell the css.
    const top = Math.min(240, artTop(img));
    el.querySelector('.townie-body').style.setProperty('--cap', `${(Math.max(0, top) / 240 * 19).toFixed(2)}vh`);
    setTimeout(() => el.classList.remove('arrive'), 700);
  }

  // Topmost y (viewBox units) of a character's visible art: skips hidden effect layers, wherever they nest.
  function artTop(node) {
    let top = Infinity;
    for (const n of node.children) {
      if (n.tagName === 'defs' || n.tagName === 'clipPath' || n.classList.contains('fx') || n.classList.contains('shadow')) continue;
      if (n.tagName === 'g') { top = Math.min(top, artTop(n)); continue; }
      try { const b = n.getBBox(); if (b.height) top = Math.min(top, b.y); } catch (err) { /* not a graphics element */ }
    }
    return top;
  }
  function scaleFor(y) {
    const H = stage.clientHeight;
    const p = (y - H * GROUND_TOP) / (H * (GROUND_BOT - GROUND_TOP));
    return 0.72 + 0.45 * Math.max(0, Math.min(1, p));
  }
  // Skip writes that wouldn't change anything. zIndex and the flip only move when
  // a character crosses a pixel row or turns around, so at 26 characters this cuts
  // roughly 78 style writes a frame down to the handful that actually moved.
  function render(t) {
    const tr = `translate3d(${t.x}px,${t.y}px,0) scale(${scaleFor(t.scaleY || t.y)})`;
    if (tr !== t._tr) { t.el.style.transform = tr; t._tr = tr; }
    const z = t.state === 'drag' ? 1000 : (t.zBoost || Math.round(t.y));
    if (z !== t._z) { t.el.style.zIndex = z; t._z = z; }
    if (t.dir !== t._dir) { t.flip.style.transform = `scaleX(${t.dir})`; t._dir = t.dir; }
  }
  function face(t, x) { if (Math.abs(x - t.x) > 4) t.dir = x > t.x ? 1 : -1; }
  function setWalking(t, on) { t.img.classList.toggle('walking', on); }

  // Somewhere to wander to: within about half a screen, so friends stay around their part of town.
  function roamTarget(t) {
    const W = stage.clientWidth, H = stage.clientHeight, span = viewW() * 0.55;
    t.tx = Math.max(60, Math.min(W - 60, t.x + rand(-span, span)));
    t.ty = rand(H * GROUND_TOP, H * GROUND_BOT);
  }
  function pickTarget(t) {
    roamTarget(t);
    t.state = 'walk'; face(t, t.tx); setWalking(t, true);
  }
  function stepToward(t, tx, ty, speed, dt) {
    const dx = tx - t.x, dy = ty - t.y, d = Math.hypot(dx, dy);
    if (d < 4) return true;
    const s = Math.min(d, speed * dt);
    t.x += dx / d * s; t.y += dy / d * s;
    face(t, tx);
    return d - s < 4;
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    // Every layout READ happens here, before anything writes a style this frame.
    // Interleaved reads and writes force a synchronous layout of the whole town –
    // ~1500 SVG nodes – and there were two of them per frame.
    const trainR = trainEl.classList.contains('running') ? stageRect(trainEl) : null;
    // Scrolling: a fling glides to a stop; the arrows glide to the next screen.
    if (panVel) {
      setScroll(scrollX + panVel * dt);
      panVel *= Math.pow(0.04, dt);
      if (Math.abs(panVel) < 30 || scrollX <= 0 || scrollX >= maxScroll()) panVel = 0;
    }
    if (scrollTarget !== null) {
      const d = scrollTarget - scrollX;
      if (Math.abs(d) < 1) { setScroll(scrollTarget); scrollTarget = null; }
      else setScroll(scrollX + d * Math.min(1, dt * 6));
    }
    // Carrying a friend to the edge of the screen scrolls the town along with them.
    if (dragging && dragging.last) {
      const vr = viewRect(), px = dragging.last.clientX - vr.left, edge = vr.width * 0.09;
      let push = 0;
      if (px < edge) push = -(1 - px / edge); else if (px > vr.width - edge) push = 1 - (vr.width - px) / edge;
      if (push) {
        setScroll(scrollX + push * 900 * dt);
        const p = stagePoint(dragging.last), t = dragging.t;
        t.x = p.x + dragging.dx; t.y = p.y + dragging.dy; render(t);
      }
    }
    for (const t of townies) update(t, dt);
    convoTimer -= dt;
    if (convoTimer <= 0) { convoTimer = rand(2.5, 5); tryConvo(); }
    // At night, someone gets sleepy every few seconds.
    if (night) {
      yawnTimer -= dt;
      if (yawnTimer <= 0) {
        yawnTimer = rand(2, 4);
        const cands = townies.filter(free);
        if (cands.length) { const t = cands[Math.floor(Math.random() * cands.length)]; setWalking(t, false); t.state = 'idle'; t.timer = rand(2, 4); t.busy = 2.2; showBubble(t, '💤', 2000); replay(t.img, 'sleep'); Sfx.snore(); }
      }
    }
    // Friends wave as the train passes.
    if (trainR) {
      townies.forEach(t => { if (!t.waved && free(t) && t.x > trainR.x - 30 && t.x < trainR.right + 30) { t.waved = true; showBubble(t, '🚂', 1300); if (Math.random() < 0.5) laugh(t); } });
    }
    raf = requestAnimationFrame(frame);
  }

  function update(t, dt) {
    if (t.state === 'drag') return;
    if (t.tween) { runTween(t, dt); render(t); return; }
    if (t.busy > 0) { t.busy -= dt; render(t); return; }
    switch (t.state) {
      case 'idle':
        t.timer -= dt;
        if (t.timer <= 0) pickTarget(t);
        break;
      case 'walk':
        if (stepToward(t, t.tx, t.ty, t.speed, dt)) { t.state = 'idle'; t.timer = rand(1, 4); setWalking(t, false); }
        break;
      case 'talk':
        // Timer is a safety net: the chat's own schedule normally ends it.
        t.timer -= dt;
        if (t.timer <= 0) endConvo(t);
        break;
      case 'chase': {
        // Chaser follows its partner; the partner flees to fresh spots.
        const p = t.partner;
        if (p) stepToward(t, p.x, p.y, t.speed * 1.6, dt);
        t.timer -= dt;
        if (t.timer <= 0) endConvo(t);
        break;
      }
      case 'flee':
        if (stepToward(t, t.tx, t.ty, t.speed * 1.7, dt)) roamTarget(t);
        t.timer -= dt;
        if (t.timer <= 0) endConvo(t);
        break;
    }
    render(t);
  }

  // Tweens move a character along a path over time (dash away and back, fall, get pushed).
  function runTween(t, dt) {
    const w = t.tween; w.e += dt;
    const p = Math.min(1, w.e / w.dur);
    const k = w.back ? Math.sin(p * Math.PI) : w.linear ? p : w.easeIn ? p * p : (1 - Math.pow(1 - p, 2));
    t.x = w.x0 + (w.x1 - w.x0) * k;
    t.y = w.y0 + (w.y1 - w.y0) * k;
    if (w.arc) t.y -= Math.sin(p * Math.PI) * w.arc;
    if (p >= 1) { t.x = w.back ? w.x0 : w.x1; t.y = w.back ? w.y0 : w.y1; t.tween = null; if (w.done) w.done(); }
  }
  function tween(t, x1, y1, dur, opts = {}) {
    t.tween = { x0: t.x, y0: t.y, x1, y1, dur, e: 0, ...opts };
  }

  // ---------- chatting and playing ----------
  function free(t) { return (t.state === 'idle' || t.state === 'walk') && !t.busy && !t.tween && !t.ride; }
  function tryConvo() {
    const cands = townies.filter(free);
    for (let i = 0; i < cands.length; i++) for (let j = i + 1; j < cands.length; j++) {
      const a = cands[i], b = cands[j];
      if (Math.hypot(a.x - b.x, a.y - b.y) < convoDist() && Math.random() < 0.7) {
        if (Math.random() < 0.3) playTag(a, b); else chat(a, b);
        return;
      }
    }
    // Nobody close? Nudge one character toward a neighbour so meetings happen.
    if (cands.length >= 2 && Math.random() < 0.6) {
      const a = cands[Math.floor(Math.random() * cands.length)];
      const near = cands.filter(o => o !== a && Math.abs(o.x - a.x) < viewW() * 0.8);
      if (!near.length) return;
      const b = near[Math.floor(Math.random() * near.length)];
      a.tx = b.x + (a.x < b.x ? -convoDist() * 0.6 : convoDist() * 0.6); a.ty = b.y;
      a.state = 'walk'; face(a, a.tx); setWalking(a, true);
    }
  }
  function showBubble(t, text, ms) {
    t.bubble.textContent = text; t.bubble.classList.remove('hidden');
    t.bubble.classList.remove('pop-in'); void t.bubble.offsetWidth; t.bubble.classList.add('pop-in');
    if (ms) setTimeout(() => { if (t.bubble.textContent === text) t.bubble.classList.add('hidden'); }, ms);
  }
  function laugh(t) {
    t.img.classList.remove('laugh'); void t.img.offsetWidth; t.img.classList.add('laugh');
    showBubble(t, 'ha ha!', 1400);
  }
  function chat(a, b) {
    const id = ++convoId;
    [a, b].forEach(t => { t.state = 'talk'; t.timer = 6; setWalking(t, false); t.partner = a === t ? b : a; });
    face(a, b.x); face(b, a.x);
    const alive = () => running && id === convoId && a.state === 'talk' && b.state === 'talk';
    const steps = [
      [0, () => showBubble(a, '...', 1300)],
      [1500, () => showBubble(b, '...', 1300)],
      [3000, () => showBubble(a, '...', 1100)],
      [4300, () => { laugh(a); laugh(b); Sfx.giggle(); }],
      [5800, () => endConvo(a, b)],
    ];
    steps.forEach(([ms, fn]) => setTimeout(() => { if (alive()) fn(); }, ms));
  }
  function playTag(a, b) {
    const id = ++convoId;
    a.state = 'chase'; a.partner = b; a.timer = 6; setWalking(a, true);
    b.state = 'flee'; roamTarget(b); b.timer = 6; setWalking(b, true);
    showBubble(a, '!', 900);
    Sfx.whoosh();
    setTimeout(() => {
      if (!running || id !== convoId) return;
      if (a.state === 'chase' && b.state === 'flee') { laugh(a); laugh(b); Sfx.giggle(); setTimeout(() => { if (running && id === convoId) endConvo(a, b); }, 1400); }
    }, 4000);
  }
  function endConvo(...ts) {
    ts.forEach(t => {
      if (t.state === 'talk' || t.state === 'chase' || t.state === 'flee') { t.state = 'idle'; t.timer = rand(0.5, 2); }
      t.partner = null; setWalking(t, false); t.bubble.classList.add('hidden');
    });
  }

  // ---------- tap reactions ----------
  // How long each character's own part animation (css: .char[data-char=…].act) runs.
  const ACT_SECS = { banana: 2.0, sun: 2.2, moon: 2.4, potato: 2.4, umbrella: 2.4, volcano: 2.2, drum: 1.8, xylophone: 2.0, octopus: 2.0, robot: 1.8 };
  function react(t) {
    const kind = t.c.react;
    endConvo(t);
    t.state = 'idle'; t.timer = rand(1, 3);
    showBubble(t, t.c.tag, 1300);
    // Say the character's letter, then its own sound effect plays over the animation.
    Voice.say(`${t.c.letter}!`, { key: `${t.c.letter}-tick` });
    const anim = (name, secs) => { t.busy = Math.max(t.busy, secs); t.img.classList.remove(name); void t.img.offsetWidth; t.img.classList.add(name); };
    // Personality animation on the character's own parts (drumsticks, rays, toast…).
    const actSecs = ACT_SECS[t.c.file] || 1.6;
    t.busy = actSecs;
    t.img.classList.remove('act'); void t.img.offsetWidth; t.img.classList.add('act');
    clearTimeout(t.actTimer);
    t.actTimer = setTimeout(() => t.img.classList.remove('act'), actSecs * 1000);
    switch (kind) {
      case 'none':      break;
      case 'rain':      Sfx.rain(); break;
      case 'snore':     Sfx.snore(); break;
      case 'music':     Sfx.chime(); setTimeout(Sfx.chime, 350); setTimeout(Sfx.correct, 800); break;
      case 'rumble':    anim('shake', 0.8); Sfx.drum(); setTimeout(Sfx.whoosh, 500); break;
      case 'jump':      anim('jump', 0.9); Sfx.boing(); break;
      case 'spin':      anim('spin', 1.0); Sfx.sparkle(); break;
      case 'cartwheel': anim('cartwheel', 1.1); Sfx.whoosh(); setTimeout(Sfx.boing, 900); break;
      case 'grumble':   anim('shake', 0.8); Sfx.wrong(); break;
      case 'look':      anim('look', 1.6); Sfx.tap(); setTimeout(Sfx.tap, 500); setTimeout(Sfx.tap, 1000); break;
      case 'shiver':    anim('shiver', 1.2); Sfx.giggle(); break;
      case 'slip':      anim('slip', 2.0); Sfx.zip(); setTimeout(Sfx.boing, 500); setTimeout(Sfx.giggle, 1500); break;
      case 'sprinkle':  anim('wiggle', 1.2); Sfx.sparkle(); setTimeout(Sfx.chime, 300); setTimeout(Sfx.giggle, 900); break;
      case 'nod':       anim('nod', 1.2); Sfx.tap(); break;
      case 'dance':     anim('dance', 1.8); Sfx.correct(); setTimeout(Sfx.correct, 700); break;
      case 'sleep':     anim('sleep', 2.2); Sfx.snore(); break;
      case 'wiggle':    anim('wiggle', 1.2); Sfx.giggle(); break;
      case 'robot':     anim('robot', 1.4); Sfx.robot(); break;
      case 'glow':      anim('glow', 1.6); Sfx.sparkle(); setTimeout(Sfx.sparkle, 400); break;
      case 'flash':     anim('flash', 1.2); Sfx.sparkle(); break;
      case 'drum':      anim('drumroll', 1.0); Sfx.drum(); break;
      case 'hug': {
        // Waddle over to the nearest friend for a squeeze.
        const near = townies.filter(o => o !== t && !o.ride).sort((p, q) => Math.hypot(p.x - t.x, p.y - t.y) - Math.hypot(q.x - t.x, q.y - t.y))[0];
        anim('jump', 0.9); Sfx.giggle();
        if (near) { face(t, near.x); tween(t, near.x + (t.x < near.x ? -50 : 50), near.y, 0.8, { done: () => { showBubble(near, '💕', 1200); laugh(near); laugh(t); Sfx.giggle(); } }); }
        break;
      }
      // These three stay put: a happy hop for Cookie, a yo-yo-like swing for Yo-yo and a quick
      // wriggle for Zipper. (They used to zoom across the screen, which read as erratic.)
      case 'hop':       anim('laugh', 1.2); Sfx.giggle(); break;
      case 'sway':      anim('sway', 1.4); Sfx.zip(); setTimeout(Sfx.zip, 700); break;
      case 'zip':       anim('wiggle', 1.2); Sfx.zip(); break;
      case 'sneeze': {
        anim('sneeze', 1.4); Sfx.sneeze();
        setTimeout(() => { if (running) blowAway(t.x, t.y, viewW() * 0.32, viewW() * 0.22, t); }, 600);
        break;
      }
      default: anim('jump', 0.9); Sfx.boing();
    }
  }

  // ---------- drag / tap ----------
  function stagePoint(e) { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function startDrag(t, e) {
    e.preventDefault();
    if (t.tween) return;
    const start = stagePoint(e);
    const grab = { dx: t.x - start.x, dy: t.y - start.y };
    let moved = false;
    endConvo(t);
    t.state = 'drag'; t.busy = 0; setWalking(t, false);
    t.el.classList.add('dragging'); render(t);
    try { t.el.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events have no live pointer */ }
    const onMove = ev => {
      const p = stagePoint(ev);
      if (!moved && Math.hypot(p.x - start.x, p.y - start.y) > 8) { moved = true; Sfx.tap(); dragging = { t, dx: grab.dx, dy: grab.dy, last: null }; }
      if (!moved) return;
      dragging.last = ev;
      t.x = p.x + grab.dx; t.y = p.y + grab.dy; render(t);
    };
    const onUp = () => {
      t.el.removeEventListener('pointermove', onMove);
      t.el.removeEventListener('pointerup', onUp);
      t.el.removeEventListener('pointercancel', onUp);
      t.el.classList.remove('dragging');
      if (dragging && dragging.t === t) dragging = null;
      t.state = 'idle'; t.timer = rand(1, 3);
      if (!moved) { react(t); return; }
      const H = stage.clientHeight, W = stage.clientWidth;
      const gx = Math.max(40, Math.min(W - 40, t.x));
      const gy = Math.max(H * GROUND_TOP, Math.min(H * GROUND_BOT, t.y));
      if (Math.abs(gx - t.x) > 1 || Math.abs(gy - t.y) > 1) {
        // Dropped in the sky (or off the edge) – fall to the ground with a bounce.
        const fallTime = 0.25 + Math.abs(gy - t.y) / H * 0.6;
        tween(t, gx, gy, fallTime, { done: () => { t.img.classList.remove('land'); void t.img.offsetWidth; t.img.classList.add('land'); Sfx.boing(); } });
      } else {
        t.img.classList.remove('land'); void t.img.offsetWidth; t.img.classList.add('land'); Sfx.tap();
      }
      render(t);
    };
    t.el.addEventListener('pointermove', onMove);
    t.el.addEventListener('pointerup', onUp);
    t.el.addEventListener('pointercancel', onUp);
  }

  // Jump straight to a screen: 0 farm, 1 square, 2 park.
  function goTo(i) { scrollTarget = null; panVel = 0; setScroll(i * viewW()); }

  return { enter, leave, goTo };
})();
