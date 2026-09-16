// Particle effects on a full-screen canvas: sparkle bursts and confetti.

const Fx = (() => {
  let canvas, ctx, parts = [], raf = 0;

  function init() {
    canvas = document.getElementById('fx');
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => setTimeout(resize, 300));
    if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
  }
  // Size the bitmap from the canvas's own box (innerWidth/Height lag behind on iOS rotations).
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (w === canvas.width && h === canvas.height) return;
    canvas.width = w; canvas.height = h;
  }
  function clearAll() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  function loop() {
    resize();
    clearAll();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const now = performance.now();
    parts = parts.filter(p => now < p.die);
    for (const p of parts) {
      const life = 1 - (p.die - now) / p.ttl;
      p.vy += p.g;
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.99;
      p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = p.fade ? Math.max(0, 1 - life) : (life > 0.8 ? (1 - life) * 5 : 1);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 'star') {
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? p.size * 0.45 : p.size;
          const a = (i * Math.PI) / 5;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath(); ctx.fill();
      } else if (p.shape === 'circle') {
        ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillRect(-p.size / 2, -p.size * 0.35, p.size, p.size * 0.7);
      }
      ctx.restore();
    }
    raf = parts.length ? requestAnimationFrame(loop) : 0;
  }
  function add(p) { parts.push(p); if (!raf) raf = requestAnimationFrame(loop); }

  const PALETTE = ['#ff3b3b', '#ff8a00', '#ffc400', '#3ecf3e', '#2196f3', '#8e44ff', '#ff4fa3', '#ffffff'];

  return {
    init,
    // Drop every particle and wipe the canvas (screen changes).
    clear() { parts = []; cancelAnimationFrame(raf); raf = 0; if (ctx) clearAll(); },
    // Sparkles flying out from a point (page coordinates).
    burst(x, y, color, n = 22) {
      const now = performance.now();
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 7;
        const ttl = 500 + Math.random() * 500;
        add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, g: 0.18, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
              size: 5 + Math.random() * 7, color: Math.random() < 0.6 ? (color || '#ffd700') : PALETTE[i % PALETTE.length],
              shape: Math.random() < 0.5 ? 'star' : 'circle', ttl, die: now + ttl, fade: true });
      }
    },
    // Leaves fluttering down from a tree.
    leaves(x, y, n = 14, colors = ['#7ed957', '#3fa34d', '#a3e635', '#65a30d']) {
      const now = performance.now();
      for (let i = 0; i < n; i++) {
        const ttl = 1200 + Math.random() * 900;
        add({ x: x + (Math.random() - 0.5) * 60, y: y + (Math.random() - 0.5) * 40, vx: (Math.random() - 0.5) * 2.5, vy: 0.5 + Math.random(),
              g: 0.03, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, size: 7 + Math.random() * 6,
              color: colors[i % colors.length], shape: 'rect', ttl, die: now + ttl, fade: true });
      }
    },
    // Rain falling from under a cloud (x0..x1 at height y) for `ms` milliseconds.
    rain(x0, x1, y, ms) {
      const start = performance.now();
      const drop = () => {
        const now = performance.now();
        if (now - start > ms) return;
        for (let i = 0; i < 3; i++) {
          const ttl = 900;
          add({ x: x0 + Math.random() * (x1 - x0), y: y + Math.random() * 10, vx: 0, vy: 4 + Math.random() * 3, g: 0.15,
                rot: Math.PI / 2, vr: 0, size: 12, color: '#5fb8ff', shape: 'rect', ttl, die: now + ttl, fade: true });
        }
        setTimeout(drop, 50);
      };
      drop();
    },
    // Water thrown out from the top of the geyser, falling back down for `ms` milliseconds.
    fountainDrops(x, y, ms) {
      const start = performance.now();
      const drop = () => {
        const now = performance.now();
        if (now - start > ms) return;
        for (let i = 0; i < 4; i++) {
          const ttl = 1400;
          add({ x: x + (Math.random() - 0.5) * 30, y, vx: (Math.random() - 0.5) * 9, vy: -(1 + Math.random() * 3), g: 0.22,
                rot: 0, vr: 0, size: 5 + Math.random() * 5, color: Math.random() < 0.5 ? '#bfe9ff' : '#ffffff', shape: 'circle', ttl, die: now + ttl, fade: true });
        }
        setTimeout(drop, 40);
      };
      drop();
    },
    // Confetti raining from the top of the screen.
    confetti(n = 140) {
      const now = performance.now();
      for (let i = 0; i < n; i++) {
        const ttl = 2200 + Math.random() * 1500;
        add({ x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.5, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 3,
              g: 0.05, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.25, size: 8 + Math.random() * 8,
              color: PALETTE[i % PALETTE.length], shape: Math.random() < 0.3 ? 'star' : 'rect', ttl, die: now + ttl, fade: false });
      }
    },
  };
})();
